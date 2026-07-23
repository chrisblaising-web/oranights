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

export function formatConversationTime(date: string) {
    const d = new Date(date);
    const now = new Date();

    const sameDay =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

    if (sameDay) {
        return d.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
        });
    }

    return d.toLocaleDateString([], {
        month: "short",
        day: "numeric"
    });
}

export function formatMessageTime(date: string) {
    return new Date(date).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

export function getStatusLabel(message: SmsMessage) {
    if (message.direction === "inbound") {
        return "Received";
    }

    switch ((message.status || "").toLowerCase()) {
        case "queued":
            return "Queued";

        case "sending":
            return "Sending";

        case "sent":
            return "Sent";

        case "delivered":
            return "Delivered";

        case "failed":
            return "Failed";

        case "undelivered":
            return "Undelivered";

        default:
            return message.status || "Sent";
    }
}

export function buildConversations(
    messages: SmsMessage[]
): Conversation[] {

    const grouped = new Map<string, SmsMessage[]>();

    for (const message of messages) {

        if (!grouped.has(message.phone)) {
            grouped.set(message.phone, []);
        }

        grouped.get(message.phone)!.push(message);
    }

    const conversations: Conversation[] = [];

    for (const [phone, phoneMessages] of grouped.entries()) {

        phoneMessages.sort((a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()
        );

        const last = phoneMessages[phoneMessages.length - 1];

        const guest =
            [...phoneMessages]
                .reverse()
                .find(m => m.guest_name);

        conversations.push({

            phone,

            guestId: guest?.guest_id || null,

            guestName: guest?.guest_name || null,

            lastMessage: last.message,

            lastMessageDate: last.created_at,

            lastDirection: last.direction,

            unreadCount: phoneMessages.filter(
                m =>
                    m.direction === "inbound" &&
                    !m.is_read
            ).length,

            messages: phoneMessages
        });
    }

    return conversations.sort(
        (a, b) =>
            new Date(b.lastMessageDate).getTime() -
            new Date(a.lastMessageDate).getTime()
    );
}