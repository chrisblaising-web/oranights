"use client";

import { SmsMessage } from "./types";
import {
    formatMessageTime,
    getStatusLabel
} from "./chatUtils";

type Props = {
    message: SmsMessage;
};

export default function MessageBubble({
    message
}: Props) {

    const outgoing =
        message.direction === "outbound";

    const failed =
        message.status === "failed" ||
        message.status === "undelivered";

    return (

        <div
            className={`flex mb-4 ${
                outgoing
                    ? "justify-end"
                    : "justify-start"
            }`}
        >

            <div
                className={`
                max-w-[75%]
                flex
                flex-col

                ${
                    outgoing
                        ? "items-end"
                        : "items-start"
                }
                `}
            >

                <div
                    className={`
                    px-4
                    py-3
                    rounded-2xl
                    whitespace-pre-wrap
                    break-words
                    shadow

                    ${
                        outgoing
                            ? `
                                bg-white
                                text-black
                                rounded-br-md
                              `
                            : `
                                bg-zinc-800
                                text-white
                                rounded-bl-md
                              `
                    }
                    `}
                >

                    {message.message}

                </div>

                <div
                    className="
                    mt-1
                    flex
                    gap-2
                    text-[11px]
                    text-zinc-500
                    px-1
                    "
                >

                    <span>

                        {formatMessageTime(
                            message.created_at
                        )}

                    </span>

                    <span>

                        •

                    </span>

                    <span
                        className={
                            failed
                                ? "text-red-500"
                                : ""
                        }
                    >

                        {getStatusLabel(message)}

                    </span>

                </div>

                {message.error_message && (

                    <div
                        className="
                        mt-2
                        bg-red-950
                        border
                        border-red-700
                        rounded-lg
                        px-3
                        py-2
                        text-xs
                        text-red-300
                        "
                    >

                        {message.error_message}

                    </div>

                )}

            </div>

        </div>

    );

}