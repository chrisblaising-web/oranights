"use client";

import { FormEvent } from "react";
import { QuickReply } from "./types";

type Props = {
    value: string;
    sending: boolean;
    onChange: (value: string) => void;
    onSend: () => void;
};

const QUICK_REPLIES: QuickReply[] = [
    {
        id: "confirm",
        title: "Reservation Confirmed",
        message:
            "Your reservation has been confirmed. We look forward to seeing you at Ora Nights!"
    },
    {
        id: "seeyou",
        title: "See You Friday",
        message:
            "Perfect! We'll see you Friday. Safe travels!"
    },
    {
        id: "vip",
        title: "VIP Available",
        message:
            "VIP tables are still available. Let us know how many guests will be joining you."
    },
    {
        id: "thanks",
        title: "Thank You",
        message:
            "Thank you! If you have any questions before the event, just reply here."
    }
];

export default function ReplyComposer({
    value,
    sending,
    onChange,
    onSend
}: Props) {

    function submit(e: FormEvent) {
        e.preventDefault();

        if (!value.trim()) {
            return;
        }

        onSend();
    }

    return (

        <form
            onSubmit={submit}
            className="
            border-t
            border-zinc-800
            bg-zinc-950
            p-5
            "
        >

            <div className="mb-3 flex flex-wrap gap-2">

                {QUICK_REPLIES.map(reply => (

                    <button
                        key={reply.id}
                        type="button"
                        onClick={() =>
                            onChange(reply.message)
                        }
                        className="
                        rounded-full
                        bg-zinc-800
                        hover:bg-zinc-700
                        px-3
                        py-2
                        text-xs
                        transition
                        "
                    >

                        {reply.title}

                    </button>

                ))}

            </div>

            <textarea
                value={value}
                onChange={(e) =>
                    onChange(e.target.value)
                }
                placeholder="Type your message..."
                rows={3}
                maxLength={1600}
                onKeyDown={(e) => {

                    if (
                        e.key === "Enter" &&
                        !e.shiftKey
                    ) {

                        e.preventDefault();

                        if (!sending && value.trim()) {
                            onSend();
                        }

                    }

                }}
                className="
                w-full
                rounded-xl
                border
                border-zinc-700
                bg-black
                p-4
                text-white
                outline-none
                resize-none
                focus:border-white
                "
            />

            <div className="flex justify-between items-center mt-3">

                <div className="text-xs text-zinc-500">

                    {value.length}/1600

                </div>

                <div className="flex gap-2">

                    <button
                        type="button"
                        className="
                        bg-zinc-800
                        hover:bg-zinc-700
                        rounded-lg
                        px-4
                        py-2
                        "
                        title="Attachments (coming soon)"
                    >

                        📎

                    </button>

                    <button
                        type="button"
                        className="
                        bg-zinc-800
                        hover:bg-zinc-700
                        rounded-lg
                        px-4
                        py-2
                        "
                        title="Emoji (coming soon)"
                    >

                        😊

                    </button>

                    <button
                        disabled={
                            sending ||
                            !value.trim()
                        }
                        className="
                        bg-white
                        text-black
                        font-semibold
                        rounded-lg
                        px-6
                        py-2
                        disabled:opacity-40
                        disabled:cursor-not-allowed
                        hover:bg-zinc-200
                        transition
                        "
                    >

                        {sending
                            ? "Sending..."
                            : "Send"}

                    </button>

                </div>

            </div>

        </form>

    );

}