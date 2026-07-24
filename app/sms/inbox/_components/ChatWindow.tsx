"use client";

import { useEffect, useRef } from "react";
import { Conversation } from "./types";
import { formatPhone } from "./chatUtils";
import MessageBubble from "./MessageBubble";

type Props = {
  conversation: Conversation | null;
  onBack: () => void;
};

export default function ChatWindow({
  conversation,
  onBack,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "auto",
        block: "end",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    conversation?.phone,
    conversation?.messages.length,
  ]);

  if (!conversation) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-6 py-10 text-center">
        <div className="max-w-xs">
          <div className="text-5xl">💬</div>
          <h2 className="mt-4 text-xl font-bold">
            Select a conversation
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Choose a guest from the inbox to view the conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-black">
      <header className="z-20 flex shrink-0 items-center gap-3 border-b border-white/10 bg-black/95 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur md:px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="flex h-11 shrink-0 items-center justify-center rounded-xl border border-white/10 px-3 text-sm font-semibold transition active:scale-[0.98] active:bg-white/10 lg:hidden"
        >
          Back
        </button>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 font-bold">
          {conversation.guestName
            ?.charAt(0)
            .toUpperCase() || "#"}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold sm:text-lg">
            {conversation.guestName || "Unknown Guest"}
          </h2>
          <p className="truncate text-xs text-white/45 sm:text-sm">
            {formatPhone(conversation.phone)}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-black/30 px-3 py-4 sm:px-4 md:space-y-4 md:px-6">
        {conversation.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
          />
        ))}

        <div ref={bottomRef} className="h-px" />
      </div>
    </section>
  );
}
