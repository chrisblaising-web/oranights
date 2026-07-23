import { Conversation, SmsMessage } from "./types";

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

export function formatConversationTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatMessageTime(dateString: string) {
  return new Date(dateString).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getStatusLabel(message: SmsMessage) {
  if (message.direction === "inbound") return "Received";

  switch (message.status?.toLowerCase()) {
    case "delivered": return "Delivered";
    case "sent": return "Sent";
    case "queued": return "Queued";
    case "sending": return "Sending";
    case "failed": return "Failed";
    case "undelivered": return "Undelivered";
    default: return message.status || "Sent";
  }
}

export function buildConversations(messages: SmsMessage[]): Conversation[] {
  const grouped = new Map<string, SmsMessage[]>();

  for (const message of messages) {
    const phoneMessages = grouped.get(message.phone) || [];
    phoneMessages.push(message);
    grouped.set(message.phone, phoneMessages);
  }

  return Array.from(grouped.entries())
    .map(([phone, phoneMessages]) => {
      const sorted = [...phoneMessages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const latest = sorted[sorted.length - 1];
      const identity = [...sorted].reverse();

      return {
        phone,
        guestId: identity.find((message) => message.guest_id)?.guest_id || null,
        guestName: identity.find((message) => message.guest_name)?.guest_name || null,
        lastMessage: latest.message,
        lastMessageDate: latest.created_at,
        lastDirection: latest.direction,
        unreadCount: sorted.filter(
          (message) => message.direction === "inbound" && !message.is_read
        ).length,
        messages: sorted,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime()
    );
}
