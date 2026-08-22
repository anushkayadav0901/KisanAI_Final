import { useEffect, useRef, useState, useCallback } from "react";

interface GeminiLiveConfig {
  onAnalysis: (data: unknown) => void;
  onError: (error: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

interface UseGeminiLiveReturn {
  isConnected: boolean;
  isAnalyzing: boolean;
  connect: () => void;
  disconnect: () => void;
  sendFrame: (base64Image: string) => void;
  startStreaming: (videoElement: HTMLVideoElement, fps?: number) => void;
  stopStreaming: () => void;
}

export const useGeminiLive = (
  config: GeminiLiveConfig,
): UseGeminiLiveReturn => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const streamingInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const configRef = useRef(config);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntentionalDisconnect = useRef(false);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  // Ref to hold the latest connect function — avoids circular dependency
  // in onclose handler (connect is declared after the ref is used)
  const connectRef = useRef<() => void>(() => {});

  // Keep config ref in sync without triggering re-renders
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (streamingInterval.current) {
      clearInterval(streamingInterval.current);
      streamingInterval.current = null;
    }
    videoRef.current = null;
  }, []);

  // Cleanup reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  }, []);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    isIntentionalDisconnect.current = true;
    reconnectAttempts.current = 0;
    clearReconnectTimeout();
    stopStreaming();
    if (
      ws.current?.readyState === WebSocket.OPEN ||
      ws.current?.readyState === WebSocket.CONNECTING
    ) {
      ws.current.close();
    }
    ws.current = null;
  }, [stopStreaming, clearReconnectTimeout]);

  // Connect WebSocket with auto-reconnect
  const connect = useCallback(() => {
    // Don't connect if already connecting or connected
    if (
      ws.current?.readyState === WebSocket.CONNECTING ||
      ws.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    isIntentionalDisconnect.current = false;
    clearReconnectTimeout();

    // Tear down any previous socket that may still be in CLOSING state
    if (ws.current) {
      try {
        ws.current.onopen =
          ws.current.onclose =
          ws.current.onerror =
          ws.current.onmessage =
            null;
        ws.current.close();
      } catch {
        /* ignore */
      }
      ws.current = null;
    }

    // Use relative WebSocket URL so nginx can proxy /gemini-live → backend:3000
    // This works in both Docker (nginx proxy) and local dev (ws://localhost:5173/gemini-live → Vite proxy)
    // VITE_GEMINI_WS_URL override is still respected if explicitly set
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl =
      import.meta.env.VITE_GEMINI_WS_URL ||
      `${protocol}//${window.location.host}/gemini-live`;

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        reconnectAttempts.current = 0;
        setIsConnected(true);
        configRef.current.onConnect();
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "ready") {
            setIsAnalyzing(true);
          } else if (message.type === "analysis") {
            configRef.current.onAnalysis(message.data);
          } else if (message.type === "error") {
            configRef.current.onError(message.message);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.current.onerror = () => {
        configRef.current.onError("Connection error");
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        setIsAnalyzing(false);
        configRef.current.onDisconnect();

        // Auto-reconnect with exponential backoff (max MAX_RECONNECT_ATTEMPTS)
        if (
          !isIntentionalDisconnect.current &&
          event.code !== 1000 &&
          event.code !== 1001
        ) {
          if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(
              3000 * Math.pow(1.5, reconnectAttempts.current),
              15000,
            );
            reconnectAttempts.current++;
            reconnectTimeout.current = setTimeout(() => {
              if (!isIntentionalDisconnect.current) {
                connectRef.current();
              }
            }, delay);
          } else {
            configRef.current.onError(
              "Connection lost. Please restart monitoring.",
            );
          }
        }
      };
    } catch {
      configRef.current.onError("Failed to create connection");
    }
  }, [clearReconnectTimeout]);

  // Keep connectRef in sync so onclose can call connect without circular dep
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Send frame to Gemini
  const sendFrame = useCallback((base64Image: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(
          JSON.stringify({
            type: "frame",
            data: base64Image,
          }),
        );
      } catch {
        // send failed silently
      }
    }
  }, []);

  // Capture frame from video
  const captureFrame = useCallback(
    (video: HTMLVideoElement, quality: number = 0.7): string | null => {
      // Ensure video is ready
      if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
        return null;
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL("image/jpeg", quality).split(",")[1];
    },
    [],
  );

  // Start streaming frames to Gemini
  const startStreaming = useCallback(
    (videoElement: HTMLVideoElement, fps: number = 1) => {
      // Stop any existing streaming
      stopStreaming();

      videoRef.current = videoElement;
      const interval = 1000 / fps;

      streamingInterval.current = setInterval(() => {
        if (videoRef.current && isConnected) {
          const frame = captureFrame(videoRef.current);
          if (frame) {
            sendFrame(frame);
          }
        }
      }, interval);
    },
    [isConnected, captureFrame, sendFrame, stopStreaming],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isAnalyzing,
    connect,
    disconnect,
    sendFrame,
    startStreaming,
    stopStreaming,
  };
};

export default useGeminiLive;
