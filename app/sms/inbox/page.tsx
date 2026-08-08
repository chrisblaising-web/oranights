"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";
import ChatWindow from "./_components/ChatWindow";
import ConversationList from "./_components/ConversationList";
import ReplyComposer from "./_components/ReplyComposer";
import { buildConversations } from "./_components/chatUtils";
import { SmsMessage } from "./_components/types";

const MESSAGE_FIELDS = `
  id,
  guest_id,
  guest_name,
  phone,
  direction,
  message,
  status,
  twilio_sid,
  twilio_error_code,
  error_message,
  is_read,
  created_at,
  updated_at,
  delivered_at
`;

type Notice = {
  tone: "success" | "warning" | "error";
  message: string;
} | null;

function sortMessages(messages: SmsMessage[]) {
  return [...messages].sort(
    (first, second) =>
      new Date(first.created_at).getTime() -
      new Date(second.created_at).getTime()
  );
}

function upsertMessage(
  currentMessages: SmsMessage[],
  incomingMessage: SmsMessage
) {
  const existingIndex = currentMessages.findIndex(
    (message) => message.id === incomingMessage.id
  );

  if (existingIndex === -1) {
    return sortMessages([...currentMessages, incomingMessage]);
  }

  const nextMessages = [...currentMessages];
  nextMessages[existingIndex] = {
    ...nextMessages[existingIndex],
    ...incomingMessage,
  };

  return sortMessages(nextMessages);
}

export default function SmsInboxPage() {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);

  const conversations = useMemo(
    () => buildConversations(messages),
    [messages]
  );

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.phone === selectedPhone
      ) || null,
    [conversations, selectedPhone]
  );

  const totalUnread = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0
      ),
    [conversations]
  );

  const loadMessages = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    const { data, error } = await supabase
      .from("sms_messages")
      .select(MESSAGE_FIELDS)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Unable to load SMS inbox:", error);
      setNotice({
        tone: "error",
        message: `Unable to load inbox: ${error.message}`,
      });
      setLoading(false);
      return;
    }

    const loadedMessages = sortMessages((data || []) as SmsMessage[]);

    setMessages(loadedMessages);
    setLoading(false);
    setSelectedPhone(
      (currentPhone) =>
        currentPhone || loadedMessages.at(-1)?.phone || null
    );
  }, []);

  useEffect(() => {
    let active = true;

    void loadMessages(true);

    const channelName =
      `sms-inbox-realtime-${crypto.randomUUID()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sms_messages",
        },
        (payload) => {
          if (!active) {
            return;
          }

          const insertedMessage =
            payload.new as SmsMessage;

          setMessages((currentMessages) =>
            upsertMessage(
              currentMessages,
              insertedMessage
            )
          );

          setSelectedPhone(
            (currentPhone) =>
              currentPhone ||
              insertedMessage.phone
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sms_messages",
        },
        (payload) => {
          if (!active) {
            return;
          }

          setMessages((currentMessages) =>
            upsertMessage(
              currentMessages,
              payload.new as SmsMessage
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "sms_messages",
        },
        (payload) => {
          if (!active) {
            return;
          }

          const deletedMessage =
            payload.old as Partial<SmsMessage>;

          if (
            typeof deletedMessage.id !==
            "number"
          ) {
            return;
          }

          setMessages((currentMessages) =>
            currentMessages.filter(
              (message) =>
                message.id !==
                deletedMessage.id
            )
          );
        }
      )
      .subscribe((status, error) => {
        if (!active) {
          return;
        }

        if (status === "CHANNEL_ERROR") {
          console.warn(
            "SMS inbox realtime unavailable; polling remains active.",
            error
          );
        }

        if (status === "TIMED_OUT") {
          console.warn(
            "SMS inbox realtime timed out; polling remains active."
          );
        }
      });

    const backupRefresh =
      window.setInterval(() => {
        if (active) {
          void loadMessages(false);
        }
      }, 30000);

    return () => {
      active = false;
      window.clearInterval(
        backupRefresh
      );

      void channel.unsubscribe().finally(
        () => {
          void supabase.removeChannel(
            channel
          );
        }
      );
    };
  }, [loadMessages]);

  useEffect(() => {
    if (
      selectedPhone &&
      !conversations.some(
        (conversation) => conversation.phone === selectedPhone
      )
    ) {
      setSelectedPhone(conversations[0]?.phone || null);
      setMobileConversationOpen(false);
    }
  }, [conversations, selectedPhone]);

  async function selectConversation(phone: string) {
    setSelectedPhone(phone);
    setMobileConversationOpen(true);
    setNotice(null);

    const conversation = conversations.find(
      (item) => item.phone === phone
    );

    if (!conversation?.unreadCount) {
      return;
    }

    const unreadIds = conversation.messages
      .filter(
        (message) =>
          message.direction === "inbound" && !message.is_read
      )
      .map((message) => message.id);

    if (!unreadIds.length) {
      return;
    }

    const unreadIdSet = new Set(unreadIds);

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        unreadIdSet.has(message.id)
          ? {
            ...message,
            is_read: true,
            updated_at: new Date().toISOString(),
          }
          : message
      )
    );

    const { error } = await supabase
      .from("sms_messages")
      .update({
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .in("id", unreadIds);

    if (error) {
      console.error("Unable to mark messages as read:", error);
      setNotice({
        tone: "warning",
        message:
          "The conversation opened, but its read status could not be saved.",
      });
      await loadMessages(false);
    }
  }

  async function sendReply() {
    if (!selectedConversation) {
      setNotice({
        tone: "warning",
        message: "Select a conversation first.",
      });
      return;
    }

    const cleanedMessage = replyMessage.trim();

    if (!cleanedMessage) {
      return;
    }

    if (cleanedMessage.length > 1600) {
      setNotice({
        tone: "warning",
        message: "Keep your message under 1,600 characters.",
      });
      return;
    }

    setSending(true);
    setNotice(null);

    try {
      const response = await fetch("/api/sms/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: selectedConversation.phone,
          guestId: selectedConversation.guestId,
          guestName: selectedConversation.guestName,
          message: cleanedMessage,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error ||
          result?.message ||
          "Unable to send your reply."
        );
      }

      setReplyMessage("");
      setNotice({
        tone: result.warning ? "warning" : "success",
        message: result.warning || "Reply sent successfully.",
      });

      if (result.sms) {
        setMessages((currentMessages) =>
          upsertMessage(currentMessages, result.sms as SmsMessage)
        );
      } else {
        await loadMessages(false);
      }
    } catch (error) {
      setNotice({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to send your reply.",
      });
    } finally {
      setSending(false);
    }
  }

  const noticeClasses = {
    success: "border-green-500/30 bg-green-500/10 text-green-300",
    warning:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-200",
    error: "border-red-500/30 bg-red-500/10 text-red-300",
  };

  return (
    <AdminGuard>
      <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-black text-white">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className={`shrink-0 border-b border-white/10 bg-black/95 px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur md:px-8 md:py-5 ${mobileConversationOpen ? "hidden lg:block" : "block"
              }`}
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <h1 className="truncate text-2xl font-bold md:text-3xl">
                    Conversations
                  </h1>

                  {totalUnread > 0 && (
                    <span className="shrink-0 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white sm:px-3 sm:text-xs">
                      {totalUnread} unread
                    </span>
                  )}
                </div>

                <p className="mt-1 hidden text-sm text-white/50 sm:block">
                  Manage one-to-one guest conversations from your CRM.
                </p>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => void loadMessages(true)}
                className="h-11 shrink-0 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium transition active:scale-[0.98] active:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 lg:hover:bg-white/10"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div
            className={`min-h-0 flex-1 ${mobileConversationOpen
              ? "p-0"
              : "p-0 lg:p-6"
              }`}
          >
            {notice && (
              <div
                className={`mx-3 mt-3 rounded-xl border px-4 py-3 text-sm lg:mx-0 lg:mb-4 lg:mt-0 ${noticeClasses[notice.tone]
                  }`}
              >
                {notice.message}
              </div>
            )}

            <div
              className={`min-h-0 overflow-hidden bg-white/[0.03] ${notice
                ? "h-[calc(100%-76px)] lg:h-[calc(100%-68px)]"
                : "h-full"
                } lg:rounded-2xl lg:border lg:border-white/10 lg:shadow-2xl`}
            >
              <div className="grid h-full min-h-0 lg:grid-cols-[360px_minmax(0,1fr)]">
                <div
                  className={`min-h-0 ${mobileConversationOpen
                    ? "hidden lg:block"
                    : "block"
                    }`}
                >
                  <ConversationList
                    conversations={conversations}
                    selectedPhone={selectedPhone}
                    search={search}
                    loading={loading}
                    onSearch={setSearch}
                    onSelect={(phone) =>
                      void selectConversation(phone)
                    }
                  />
                </div>

                <section
                  className={`${mobileConversationOpen
                    ? "flex"
                    : "hidden lg:flex"
                    } min-h-0 min-w-0 flex-col overflow-hidden`}
                >
                  <ChatWindow
                    conversation={selectedConversation}
                    onBack={() =>
                      setMobileConversationOpen(false)
                    }
                  />

                  {selectedConversation && (
                    <ReplyComposer
                      value={replyMessage}
                      sending={sending}
                      onChange={setReplyMessage}
                      onSend={() =>
                        void sendReply()
                      }
                    />
                  )}
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}