"use client";

import { useEffect, useRef } from "react";
import { Conversation } from "./types";
import MessageBubble from "./MessageBubble";
import { formatPhone } from "./chatUtils";

type Props = {
    conversation: Conversation | null;
};

export default function ChatWindow({
    conversation
}: Props) {

    const bottomRef =
        useRef<HTMLDivElement>(null);

    useEffect(() => {

        bottomRef.current?.scrollIntoView({
            behavior: "smooth"
        });

    }, [conversation]);

    if (!conversation) {

        return (

            <div
                className="
                flex
                flex-1
                items-center
                justify-center
                bg-zinc-950
                "
            >

                <div className="text-center">

                    <div className="text-6xl">

                        💬

                    </div>

                    <h2
                        className="
                        text-2xl
                        font-bold
                        mt-6
                        text-white
                        "
                    >

                        Select a conversation

                    </h2>

                    <p
                        className="
                        mt-3
                        text-zinc-500
                        "
                    >

                        Choose a guest to begin chatting.

                    </p>

                </div>

            </div>

        );

    }

    return (

        <div
            className="
            flex
            flex-col
            flex-1
            bg-black
            "
        >

            <div
                className="
                border-b
                border-zinc-800
                px-6
                py-5
                flex
                justify-between
                items-center
                "
            >

                <div>

                    <h2
                        className="
                        text-xl
                        font-bold
                        text-white
                        "
                    >

                        {conversation.guestName ||
                            "Unknown Guest"}

                    </h2>

                    <div
                        className="
                        text-sm
                        text-zinc-500
                        mt-1
                        "
                    >

                        {formatPhone(
                            conversation.phone
                        )}

                    </div>

                </div>

                <div
                    className="
                    flex
                    gap-2
                    "
                >

                    <button
                        className="
                        bg-zinc-800
                        hover:bg-zinc-700
                        px-4
                        py-2
                        rounded-lg
                        text-sm
                        "
                    >

                        Guest

                    </button>

                    <button
                        className="
                        bg-zinc-800
                        hover:bg-zinc-700
                        px-4
                        py-2
                        rounded-lg
                        text-sm
                        "
                    >

                        Notes

                    </button>

                </div>

            </div>

            <div
                className="
                flex-1
                overflow-y-auto
                px-6
                py-6
                "
            >

                {conversation.messages.map(message => (

                    <MessageBubble
                        key={message.id}
                        message={message}
                    />

                ))}

                <div ref={bottomRef} />

            </div>

        </div>

    );

}