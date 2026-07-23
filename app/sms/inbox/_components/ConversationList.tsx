"use client";

import { Conversation } from "./types";
import {
  formatConversationTime,
  formatPhone,
} from "./chatUtils";

type Props = {
  conversations: Conversation[];
  selectedPhone: string | null;
  search: string;
  loading: boolean;
  onSearch: (value: string) => void;
  onSelect: (phone: string) => void;
};

export default function ConversationList({
  conversations,
  selectedPhone,
  search,
  loading,
  onSearch,
  onSelect,
}: Props) {
  const term = search.trim().toLowerCase();

  const filtered = term
    ? conversations.filter((conversation) =>
      [
        conversation.guestName || "",
        conversation.phone,
        conversation.lastMessage,
      ].some((value) =>
        value.toLowerCase().includes(term)
      )
    )
    : conversations;

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#111111] lg:border-r lg:border-white/10">
      <header className="border-b border-white/10 px-4 pb-4 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              Messages
            </h2>

            <p className="mt-1 text-xs text-white/40">
              {conversations.length} conversation
              {conversations.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg">
            💬
          </div>
        </div>

        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              onSearch(event.target.value)
            }
            placeholder="Search conversations"
            className="w-full rounded-full border border-white/10 bg-white/[0.06] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-blue-500/60 focus:bg-white/[0.08]"
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex animate-pulse gap-3 rounded-2xl p-3"
              >
                <div className="h-14 w-14 shrink-0 rounded-full bg-white/10" />

                <div className="min-w-0 flex-1 space-y-3 py-1">
                  <div className="h-3 w-2/3 rounded bg-white/10" />
                  <div className="h-3 w-full rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.06] text-2xl">
              💬
            </div>

            <p className="mt-4 font-semibold text-white">
              No conversations found
            </p>

            <p className="mt-2 max-w-xs text-sm leading-6 text-white/40">
              Sent messages and guest replies will appear here.
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filtered.map((conversation) => {
              const selected =
                conversation.phone === selectedPhone;

              const initial =
                conversation.guestName
                  ?.trim()
                  .charAt(0)
                  .toUpperCase() || "#";

              const hasUnread =
                conversation.unreadCount > 0;

              return (
                <button
                  key={conversation.phone}
                  type="button"
                  onClick={() =>
                    onSelect(conversation.phone)
                  }
                  className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${selected
                      ? "bg-blue-600/20"
                      : "hover:bg-white/[0.06]"
                    }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${selected
                          ? "bg-blue-600 text-white"
                          : "bg-gradient-to-br from-zinc-700 to-zinc-900 text-white"
                        }`}
                    >
                      {initial}
                    </div>

                    {hasUnread && (
                      <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#111111] bg-blue-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className={`truncate text-sm ${hasUnread
                            ? "font-bold text-white"
                            : "font-semibold text-white/90"
                          }`}
                      >
                        {conversation.guestName ||
                          "Unknown Guest"}
                      </p>

                      <span
                        className={`shrink-0 text-[11px] ${hasUnread
                            ? "font-semibold text-blue-400"
                            : "text-white/35"
                          }`}
                      >
                        {formatConversationTime(
                          conversation.lastMessageDate
                        )}
                      </span>
                    </div>

                    <p className="mt-0.5 truncate text-[11px] text-white/35">
                      {formatPhone(conversation.phone)}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-sm ${hasUnread
                            ? "font-semibold text-white"
                            : "text-white/45"
                          }`}
                      >
                        {conversation.lastDirection ===
                          "outbound"
                          ? "You: "
                          : ""}
                        {conversation.lastMessage}
                      </p>

                      {hasUnread && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">
                          {conversation.unreadCount > 99
                            ? "99+"
                            : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}