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
}

export const useGeminiLive = (
  config: GeminiLiveConfig,
): UseGeminiLiveReturn => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const configRef = useRef(config);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntentionalDisconnect = useRef(false);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const connectRef = useRef<() => void>(() => {});

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    isIntentionalDisconnect.current = true;
    reconnectAttempts.current = 0;
    clearReconnectTimeout();
    if (
      ws.current?.readyState === WebSocket.OPEN ||
      ws.current?.readyState === WebSocket.CONNECTING
    ) {
      ws.current.close();
    }
    ws.current = null;
  }, [clearReconnectTimeout]);

  const connect = useCallback(() => {
    if (
      ws.current?.readyState === WebSocket.CONNECTING ||
      ws.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    isIntentionalDisconnect.current = false;
    clearReconnectTimeout();

    if (ws.current) {
      ws.current.onopen =
        ws.current.onclose =
        ws.current.onerror =
        ws.current.onmessage =
          null;
      ws.current.close();
      ws.current = null;
    }

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
          return;
        }
      };

      ws.current.onerror = () => {
        configRef.current.onError("Connection error");
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        setIsAnalyzing(false);
        configRef.current.onDisconnect();

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

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const sendFrame = useCallback((base64Image: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({ type: "frame", data: base64Image }));
      } catch (e) {
        configRef.current.onError(
          `Could not send frame: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
  }, []);

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
  };
};

export default useGeminiLive;
