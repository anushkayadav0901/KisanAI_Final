import getAIPrompt, { KisanAIContext } from "./aiPrompt";

// Backend API URL - NO VITE_ PREFIX!
const API_BASE_URL = import.meta.env.PROD
  ? '/api'  // Production: use relative path (nginx proxy)
  : 'http://localhost:3000/api';  // Development: direct to backend

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface StreamingResponse {
  text: string;
  thinking?: string;
  done: boolean;
}

let activeCancelled = false;

export function cancelActiveRequest() {
  activeCancelled = true;
}

export const getAIResponse = async (
  userInput: string,
  context: Partial<KisanAIContext> = {},
  onStream?: (response: StreamingResponse) => void
): Promise<string> => {
  const fullContext: KisanAIContext = {
    userInput,
    userLanguage: context.userLanguage || "en",
    userLocation: context.userLocation,
    previousMessages: context.previousMessages || []
  };

  const fullPrompt = getAIPrompt(fullContext);
  const [systemPrompt, userMessage] = fullPrompt.split('USER QUERY:');

  const messages: GroqMessage[] = [
    {
      role: "system",
      content: systemPrompt.trim()
    },
    {
      role: "user",
      content: userMessage.trim()
    }
  ];

  try {
    if (onStream) {
      activeCancelled = false;

      // Streaming via backend proxy
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: "moonshotai/kimi-k2-instruct-0905",
          temperature: 0.7,
          max_tokens: 4096,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      let accumulatedResponse = "";
      let inThinkBlock = false;

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();

      while (true) {
        if (activeCancelled) break;

        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";

              // Process thinking blocks
              let visible = "";
              let thinking = "";
              let remaining = content;

              while (remaining.length > 0) {
                if (inThinkBlock) {
                  const endIdx = remaining.indexOf("</think>");
                  if (endIdx === -1) {
                    thinking += remaining;
                    remaining = "";
                    break;
                  } else {
                    thinking += remaining.slice(0, endIdx);
                    remaining = remaining.slice(endIdx + "</think>".length);
                    inThinkBlock = false;
                  }
                } else {
                  const startIdx = remaining.indexOf("<think>");
                  if (startIdx === -1) {
                    visible += remaining;
                    remaining = "";
                    break;
                  } else {
                    visible += remaining.slice(0, startIdx);
                    remaining = remaining.slice(startIdx + "<think>".length);
                    inThinkBlock = true;
                  }
                }
              }

              if (visible) accumulatedResponse += visible;
              if (visible || thinking) {
                onStream({ text: visible, thinking, done: false });
              }
            } catch {
              // Ignore parse errors in SSE chunks
            }
          }
        }
      }

      onStream({ text: "", thinking: "", done: true });
      activeCancelled = false;

      const finalText = postProcessResponse(accumulatedResponse);
      if (!finalText || finalText.trim().length === 0) {
        return "I've processed your request and provided my reasoning above. Please let me know if you need any clarification or have additional questions.";
      }
      return finalText;
    } else {
      // Non-streaming mode via backend proxy
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: "openai/gpt-oss-20b",
          temperature: 0.7,
          max_tokens: 4096
        })
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Empty response from AI");
      }

      return postProcessResponse(content);
    }
  } catch (error) {
    console.error("AI API Error:", error);
    throw new Error(`AI API Error: ${(error as Error).message}`);
  }
};

function postProcessResponse(response: string): string {
  return response
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/\$(\d+)/g, '₹$1')
    .replace(/\b(\d+)\s*(?:acres?|hectares?)\b/gi, (_match, num) => {
      const acres = parseFloat(num);
      const hectares = acres * 0.404686;
      return `${num} acres (${hectares.toFixed(2)} hectares)`;
    })
    .replace(/\b(\d+)\s*(?:kg|kilograms?)\b/gi, (_match, num) => {
      const kg = parseFloat(num);
      const quintals = kg / 100;
      return `${num} kg (${quintals.toFixed(2)} quintals)`;
    })
    .trim();
}

export default { getAIResponse };
