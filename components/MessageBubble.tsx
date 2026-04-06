"use client";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageData?: string;
  imageType?: string;
}

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
        style={
          isUser
            ? { background: "#BAA649", color: "#113D79" }
            : { background: "#113D79", color: "white" }
        }
      >
        {isUser ? "You" : "AI"}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] rounded-2xl text-sm leading-relaxed overflow-hidden ${
          isUser ? "rounded-tr-sm" : "rounded-tl-sm"
        }`}
        style={
          isUser
            ? { background: "#113D79", color: "white" }
            : { background: "#EEF4FF", color: "#1a1a2e" }
        }
      >
        {message.imageData && (
          <img
            src={`data:${message.imageType};base64,${message.imageData}`}
            alt="attached"
            className="w-full max-h-48 object-cover block"
          />
        )}
        <div className="px-4 py-3">{message.content}</div>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-2.5 flex-row">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: "#113D79", color: "white" }}
      >
        AI
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1"
        style={{ background: "#EEF4FF" }}
      >
        <span className="typing-dot w-2 h-2 rounded-full inline-block" style={{ background: "#113D79" }} />
        <span className="typing-dot w-2 h-2 rounded-full inline-block" style={{ background: "#113D79" }} />
        <span className="typing-dot w-2 h-2 rounded-full inline-block" style={{ background: "#113D79" }} />
      </div>
    </div>
  );
}
