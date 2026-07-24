"use client";

import { FormEvent } from "react";
import { QuickReply } from "./types";

const QUICK_REPLIES: QuickReply[] = [
  {
    id: "confirmed",
    title: "Confirmed",
    message:
      "Your reservation is confirmed. We look forward to seeing you at Ora Nights!",
  },
  {
    id: "friday",
    title: "See you Friday",
    message:
      "Perfect! We’ll see you Friday. Safe travels!",
  },
  {
    id: "vip",
    title: "VIP available",
    message:
      "VIP tables are still available. How many guests will be joining you?",
  },
  {
    id: "thanks",
    title: "Thank you",
    message:
      "Thank you! Reply here if you have any questions before the event.",
  },
];

type Props = {
  value: string;
  sending: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
};

export default function ReplyComposer({
  value,
  sending,
  disabled,
  onChange,
  onSend,
}: Props) {
  function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !disabled &&
      !sending &&
      value.trim()
    ) {
      onSend();
    }
  }

  return (
    <form
      onSubmit={submit}
      className="z-30 shrink-0 border-t border-white/10 bg-black/95 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-4"
    >
      <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {QUICK_REPLIES.map((reply) => (
          <button
            key={reply.id}
            type="button"
            disabled={disabled || sending}
            onClick={() =>
              onChange(reply.message)
            }
            className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium transition active:scale-[0.98] active:bg-white/10 disabled:opacity-40"
          >
            {reply.title}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <textarea
            value={value}
            disabled={disabled || sending}
            onChange={(event) =>
              onChange(event.target.value)
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();

                if (
                  !disabled &&
                  !sending &&
                  value.trim()
                ) {
                  onSend();
                }
              }
            }}
            placeholder="Write a reply..."
            rows={1}
            maxLength={1600}
            className="max-h-32 min-h-[48px] w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-white/30 disabled:opacity-50"
          />

          <div className="mt-1 px-1 text-right text-[10px] text-white/25">
            {value.length}/1600
          </div>
        </div>

        <button
          type="submit"
          disabled={
            disabled ||
            sending ||
            !value.trim()
          }
          className="mb-[18px] flex h-12 shrink-0 items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-black transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 sm:px-5"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}
