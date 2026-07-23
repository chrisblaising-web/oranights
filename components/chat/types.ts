export type SmsDirection = "inbound" | "outbound";

export type SmsMessage = {
    id: number;
    guest_id: number | null;
    guest_name: string | null;
    phone: string;
    direction: SmsDirection;
    message: string;
    status: string | null;
    twilio_sid: string | null;
    twilio_error_code: string | null;
    error_message: string | null;
    is_read: boolean;
    created_at: string;
    updated_at: string;
    delivered_at: string | null;
};

export type Conversation = {
    phone: string;
    guestId: number | null;
    guestName: string | null;
    lastMessage: string;
    lastMessageDate: string;
    lastDirection: SmsDirection;
    unreadCount: number;
    messages: SmsMessage[];
};

export type QuickReply = {
    id: string;
    title: string;
    message: string;
};