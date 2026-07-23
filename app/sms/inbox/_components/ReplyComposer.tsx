"use client";

import { FormEvent } from "react";
import { QuickReply } from "./types";

const QUICK_REPLIES: QuickReply[] = [
  { id: "confirmed", title: "Confirmed", message: "Your reservation is confirmed. We look forward to seeing you at Ora Nights!" },
  { id: "friday", title: "See you Friday", message: "Perfect! We’ll see you Friday. Safe travels!" },
  { id: "vip", title: "VIP available", message: "VIP tables are still available. How many guests will be joining you?" },
  { id: "thanks", title: "Thank you", message: "Thank you! Reply here if you have any questions before the event." },
];

type Props = {
  value: string;
  sending: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
};

export default function ReplyComposer({ value, sending, disabled, onChange, onSend }: Props) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disabled && !sending && value.trim()) onSend();
  }

  return (
    <form onSubmit={submit} className="border-t border-white/10 bg-black p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {QUICK_REPLIES.map((reply) => (
          <button
            key={reply.id}
            type="button"
            disabled={disabled || sending}
            onClick={() => onChange(reply.message)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs transition hover:bg-white/10 disabled:opacity-40"
          >
            {reply.title}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <textarea
            value={value}
            disabled={disabled || sending}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!disabled && !sending && value.trim()) onSend();
              }
            }}
            placeholder="Write a reply..."
            rows={2}
            maxLength={1600}
            className="max-h-40 min-h-[52px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30 disabled:opacity-50"
          />
          <div className="mt-1 text-right text-xs text-white/30">{value.length}/1600</div>
        </div>

        <button
          type="submit"
          disabled={disabled || sending || !value.trim()}
          className="mb-5 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
