"use client";

import { SmsMessage } from "./types";
import { formatMessageTime, getStatusLabel } from "./chatUtils";

export default function MessageBubble({ message }: { message: SmsMessage }) {
  const outbound = message.direction === "outbound";
  const failed = ["failed", "undelivered"].includes(message.status?.toLowerCase() || "");

  return (
    <div className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[85%] flex-col md:max-w-[70%] ${outbound ? "items-end" : "items-start"}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          outbound
            ? "rounded-br-md bg-white text-black"
            : "rounded-bl-md border border-white/5 bg-white/10 text-white"
        }`}>
          <p className="whitespace-pre-wrap break-words">{message.message}</p>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 px-1 text-[11px] text-white/35">
          <span>{formatMessageTime(message.created_at)}</span>
          <span>•</span>
          <span className={failed ? "text-red-400" : ""}>{getStatusLabel(message)}</span>
        </div>

        {message.error_message && (
          <div className="mt-1 max-w-full rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {message.error_message}
          </div>
        )}
      </div>
    </div>
  );
}
