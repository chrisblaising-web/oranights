"use client";

import { Conversation } from "./types";
import {
    formatConversationTime,
    formatPhone
} from "./chatUtils";

type Props = {
    conversations: Conversation[];
    selectedPhone: string | null;
    search: string;
    onSearch: (value: string) => void;
    onSelect: (phone: string) => void;
};

export default function ConversationList({
    conversations,
    selectedPhone,
    search,
    onSearch,
    onSelect
}: Props) {

    const filtered = conversations.filter(conversation => {

        const guest =
            (conversation.guestName || "")
                .toLowerCase();

        const phone =
            conversation.phone.toLowerCase();

        const last =
            conversation.lastMessage.toLowerCase();

        const term =
            search.toLowerCase();

        return (
            guest.includes(term) ||
            phone.includes(term) ||
            last.includes(term)
        );
    });

    return (

        <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">

            <div className="p-4 border-b border-zinc-800">

                <h2 className="text-xl font-bold text-white">
                    Conversations
                </h2>

                <input
                    value={search}
                    onChange={(e) =>
                        onSearch(e.target.value)
                    }
                    placeholder="Search guest..."
                    className="
                    mt-4
                    w-full
                    rounded-lg
                    bg-zinc-900
                    border
                    border-zinc-700
                    px-4
                    py-3
                    text-white
                    outline-none
                    focus:border-white
                    "
                />

            </div>

            <div className="overflow-y-auto flex-1">

                {filtered.length === 0 && (

                    <div className="p-8 text-center text-zinc-400">

                        No conversations yet.

                    </div>

                )}

                {filtered.map(conversation => {

                    const active =
                        conversation.phone === selectedPhone;

                    return (

                        <button
                            key={conversation.phone}
                            onClick={() =>
                                onSelect(conversation.phone)
                            }
                            className={`
                            w-full
                            text-left
                            px-4
                            py-4
                            border-b
                            border-zinc-800
                            transition

                            ${
                                active
                                    ? "bg-zinc-800"
                                    : "hover:bg-zinc-900"
                            }
                            `}
                        >

                            <div className="flex justify-between">

                                <div>

                                    <div className="font-semibold text-white">

                                        {conversation.guestName ||
                                            "Unknown Guest"}

                                    </div>

                                    <div className="text-xs text-zinc-500">

                                        {formatPhone(
                                            conversation.phone
                                        )}

                                    </div>

                                </div>

                                <div className="text-xs text-zinc-500">

                                    {formatConversationTime(
                                        conversation.lastMessageDate
                                    )}

                                </div>

                            </div>

                            <div className="mt-3 flex justify-between items-center">

                                <div className="truncate text-sm text-zinc-400 max-w-[220px]">

                                    {conversation.lastDirection ===
                                        "outbound"
                                        ? "You: "
                                        : ""}

                                    {conversation.lastMessage}

                                </div>

                                {conversation.unreadCount > 0 && (

                                    <div
                                        className="
                                        min-w-6
                                        h-6
                                        rounded-full
                                        bg-red-500
                                        text-white
                                        text-xs
                                        font-bold
                                        flex
                                        items-center
                                        justify-center
                                        px-2
                                        "
                                    >

                                        {conversation.unreadCount}

                                    </div>

                                )}

                            </div>

                        </button>

                    );

                })}

            </div>

        </div>

    );

}