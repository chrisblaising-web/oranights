"use client";

import { useEffect, useRef } from "react";
import { Conversation } from "./types";
import { formatPhone } from "./chatUtils";
import MessageBubble from "./MessageBubble";

type Props = {
  conversation: Conversation | null;
  onBack: () => void;
};

export default function ChatWindow({ conversation, onBack }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.phone, conversation?.messages.length]);

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <div className="text-5xl">💬</div>
          <h2 className="mt-4 text-xl font-bold">Select a conversation</h2>
          <p className="mt-2 text-sm text-white/45">
            Choose a guest from the inbox to view the conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b border-white/10 bg-black/70 p-4 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm transition hover:bg-white/10 lg:hidden"
        >
          Back
        </button>

        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 font-bold">
          {conversation.guestName?.charAt(0).toUpperCase() || "#"}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold">{conversation.guestName || "Unknown Guest"}</h2>
          <p className="text-sm text-white/45">{formatPhone(conversation.phone)}</p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-black/30 p-4 md:p-6">
        {conversation.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </>
  );
}
