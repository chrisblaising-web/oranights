"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { parsePhoneNumberFromString } from "libphonenumber-js";

type GuestPurpose =
    | "crm_contact"
    | "new_client"
    | "event_guest";

type GuestForm = {
    name: string;
    phone: string;
    email: string;
    instagram: string;
    gender: string;
    vip_level: string;
    tag: string;
    notes: string;
    guest_purpose: GuestPurpose;
    automatic_sms_enabled: boolean;
};

type SmsTemplate = {
    template_key: string;
    campaign: string;
    audience: string;
    message: string;
    is_active: boolean;
};

type SmsApiResponse = {
    success?: boolean;
    error?: string;
};

const initialForm: GuestForm = {
    name: "",
    phone: "",
    email: "",
    instagram: "",
    gender: "",
    vip_level: "Regular",
    tag: "Regular",
    notes: "",
    guest_purpose: "crm_contact",
    automatic_sms_enabled: false,
};

export default function AddGuestPage() {
    const router = useRouter();

    const [form, setForm] =
        useState<GuestForm>(initialForm);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState("");
    const [statusType, setStatusType] = useState<
        "success" | "warning" | "error" | ""
    >("");

    function updateField<K extends keyof GuestForm>(
        field: K,
        value: GuestForm[K]
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    }

    function updateGuestPurpose(value: GuestPurpose) {
        setForm((previous) => ({
            ...previous,
            guest_purpose: value,
            automatic_sms_enabled:
                value === "crm_contact"
                    ? false
                    : true,
        }));
    }

    function getFirstName(fullName: string) {
        return fullName.trim().split(/\s+/)[0] || "Guest";
    }

    function normalizePhone(phone: string) {
        const rawPhone = phone.trim();

        if (!rawPhone) {
            return null;
        }

        const digitsOnly = rawPhone.replace(/\D/g, "");

        // Canada and United States: automatically add +1
        // when the user enters a standard 10-digit number.
        const candidate =
            rawPhone.startsWith("+")
                ? rawPhone
                : digitsOnly.length === 10
                    ? `+1${digitsOnly}`
                    : digitsOnly.length === 11 &&
                        digitsOnly.startsWith("1")
                        ? `+${digitsOnly}`
                        : rawPhone;

        const parsedPhone =
            parsePhoneNumberFromString(candidate);

        if (!parsedPhone?.isValid()) {
            return null;
        }

        return parsedPhone.number;
    }

    async function getAccessToken() {
        const { data, error } =
            await supabase.auth.getSession();

        if (error) {
            throw new Error(
                `Unable to verify your login session: ${error.message}`
            );
        }

        const accessToken =
            data.session?.access_token;

        if (!accessToken) {
            throw new Error(
                "You must be logged in before sending the automatic SMS."
            );
        }

        return accessToken;
    }

    async function notifyAdminOfNewClient(
        guestName: string,
        phone: string | null,
        instagram: string | null,
        vipLevel: string
    ) {
        const accessToken =
            await getAccessToken();

        const response = await fetch(
            "/api/admin/new-client-notification",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    name: guestName,
                    phone: phone || "Not provided",
                    instagram:
                        instagram || "Not provided",
                    vipLevel:
                        vipLevel || "Regular",
                }),
            }
        );

        const result =
            (await response.json()) as SmsApiResponse;

        if (!response.ok || !result.success) {
            throw new Error(
                result.error ||
                "The admin notification could not be sent."
            );
        }
    }

    async function sendAutomaticMessage(
        guestId: number,
        guestName: string,
        phone: string,
        purpose: GuestPurpose
    ) {
        if (purpose === "crm_contact") {
            return {
                sent: false,
                reason: "Guest saved as a CRM contact only.",
            };
        }

        const automationKey =
            purpose === "new_client"
                ? "new_client_welcome"
                : "event_guest_invitation";

        const { data: automation, error: automationError } =
            await supabase
                .from("automation_settings")
                .select("is_active")
                .eq("automation_key", automationKey)
                .maybeSingle();

        if (automationError) {
            throw new Error(
                `Could not read automation setting: ${automationError.message}`
            );
        }

        if (!automation) {
            throw new Error(
                `Automation "${automationKey}" was not found or is blocked by database permissions.`
            );
        }

        if (!automation.is_active) {
            return {
                sent: false,
                reason: "This automation is turned off.",
            };
        }

        const { data: template, error: templateError } =
            await supabase
                .from("sms_templates")
                .select(
                    "template_key, campaign, audience, message, is_active"
                )
                .eq("template_key", automationKey)
                .maybeSingle();

        if (templateError) {
            throw new Error(
                `Could not load SMS template: ${templateError.message}`
            );
        }

        if (!template) {
            throw new Error(
                `SMS template "${automationKey}" was not found or is blocked by database permissions.`
            );
        }

        const smsTemplate = template as SmsTemplate;

        if (!smsTemplate?.is_active) {
            return {
                sent: false,
                reason: "The SMS template is turned off.",
            };
        }

        const personalizedMessage = smsTemplate.message.replace(
            /{{\s*name\s*}}/gi,
            getFirstName(guestName)
        );

        const accessToken =
            await getAccessToken();

        const response = await fetch("/api/send-sms", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                guestId,
                campaign: smsTemplate.campaign,
                audience: smsTemplate.audience,
                phone,
                name: guestName,
                message: personalizedMessage,
                messageTemplate: smsTemplate.template_key,
            }),
        });

        const result =
            (await response.json()) as SmsApiResponse;

        if (!response.ok || !result.success) {
            throw new Error(
                result.error ||
                "The guest was saved, but the SMS could not be sent."
            );
        }

        const trackingUpdate =
            purpose === "new_client"
                ? {
                    welcome_sms_sent: true,
                    welcome_sms_sent_at:
                        new Date().toISOString(),
                }
                : {
                    invitation_sms_sent: true,
                    invitation_sms_sent_at:
                        new Date().toISOString(),
                };

        const { error: trackingError } = await supabase
            .from("guests")
            .update(trackingUpdate)
            .eq("id", guestId);

        if (trackingError) {
            console.error(
                "SMS sent but guest tracking failed:",
                trackingError
            );

            return {
                sent: true,
                trackingFailed: true,
                reason:
                    "SMS sent, but the guest tracking fields were not updated.",
            };
        }

        return {
            sent: true,
            trackingFailed: false,
            reason: "SMS sent automatically.",
        };
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (saving) return;

        setStatus("");
        setStatusType("");

        if (!form.name.trim()) {
            setStatus("Guest name is required.");
            setStatusType("error");
            return;
        }

        if (
            form.gender !== "Male" &&
            form.gender !== "Female"
        ) {
            setStatus("Please select Male or Female.");
            setStatusType("error");
            return;
        }

        const normalizedPhone =
            normalizePhone(form.phone);

        if (
            form.automatic_sms_enabled &&
            !form.phone.trim()
        ) {
            setStatus(
                "A phone number is required when automatic SMS is turned on."
            );
            setStatusType("error");
            return;
        }

        if (
            form.phone.trim() &&
            !normalizedPhone
        ) {
            setStatus(
                "Enter a valid phone number. Canadian and U.S. 10-digit numbers automatically receive +1. Other countries must include their country code."
            );
            setStatusType("error");
            return;
        }

        setSaving(true);
        setStatus("Saving guest...");
        setStatusType("");

        const cleanedInstagram = form.instagram
            .trim()
            .replace(/^@/, "");

        const guestData = {
            name: form.name.trim(),
            phone: normalizedPhone,
            email: form.email.trim() || null,
            instagram: cleanedInstagram || null,
            gender: form.gender,
            vip_level: form.vip_level,
            tag: form.tag,
            notes: form.notes.trim() || null,
            guest_purpose: form.guest_purpose,
            automatic_sms_enabled:
                form.automatic_sms_enabled,
            welcome_sms_sent: false,
            invitation_sms_sent: false,
        };

        /*
         * Prevent duplicate CRM contacts before inserting.
         * Phone is checked first, then email, then Instagram.
         */
        try {
            if (normalizedPhone) {
                const {
                    data: existingByPhone,
                    error: phoneCheckError,
                } = await supabase
                    .from("guests")
                    .select("id, name")
                    .eq("phone", normalizedPhone)
                    .limit(1)
                    .maybeSingle();

                if (phoneCheckError) {
                    throw phoneCheckError;
                }

                if (existingByPhone) {
                    setStatus(
                        `Duplicate blocked: ${existingByPhone.name || "This guest"} already uses this phone number.`
                    );
                    setStatusType("warning");
                    setSaving(false);
                    return;
                }
            }

            if (guestData.email) {
                const {
                    data: existingByEmail,
                    error: emailCheckError,
                } = await supabase
                    .from("guests")
                    .select("id, name")
                    .ilike("email", guestData.email)
                    .limit(1)
                    .maybeSingle();

                if (emailCheckError) {
                    throw emailCheckError;
                }

                if (existingByEmail) {
                    setStatus(
                        `Duplicate blocked: ${existingByEmail.name || "This guest"} already uses this email address.`
                    );
                    setStatusType("warning");
                    setSaving(false);
                    return;
                }
            }

            if (guestData.instagram) {
                const {
                    data: existingByInstagram,
                    error: instagramCheckError,
                } = await supabase
                    .from("guests")
                    .select("id, name")
                    .ilike(
                        "instagram",
                        guestData.instagram
                    )
                    .limit(1)
                    .maybeSingle();

                if (instagramCheckError) {
                    throw instagramCheckError;
                }

                if (existingByInstagram) {
                    setStatus(
                        `Duplicate blocked: ${existingByInstagram.name || "This guest"} already uses this Instagram account.`
                    );
                    setStatusType("warning");
                    setSaving(false);
                    return;
                }
            }
        } catch (duplicateCheckError) {
            const duplicateMessage =
                duplicateCheckError instanceof Error
                    ? duplicateCheckError.message
                    : "Unknown duplicate-check error";

            console.error(
                "Duplicate guest check failed:",
                duplicateCheckError
            );

            setStatus(
                `Could not verify duplicates: ${duplicateMessage}`
            );
            setStatusType("error");
            setSaving(false);
            return;
        }

        const { data, error } = await supabase
            .from("guests")
            .insert([guestData])
            .select()
            .single();

        if (error) {
            console.error("Add guest error:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
            });

            setStatus(
                `Could not add guest: ${error.message}`
            );
            setStatusType("error");
            setSaving(false);
            return;
        }

        console.log("Guest added:", data);

        if (form.guest_purpose === "new_client") {
            try {
                await notifyAdminOfNewClient(
                    data.name,
                    data.phone,
                    data.instagram,
                    data.vip_level
                );
            } catch (notificationError) {
                console.error(
                    "Admin new-client notification failed:",
                    notificationError
                );
            }
        }

        if (
            form.automatic_sms_enabled &&
            data.phone
        ) {
            setStatus(
                "Guest saved. Sending automatic SMS..."
            );

            try {
                const smsResult =
                    await sendAutomaticMessage(
                        data.id,
                        data.name,
                        data.phone,
                        form.guest_purpose
                    );

                if (smsResult.sent) {
                    setStatus(
                        smsResult.trackingFailed
                            ? `Guest added. ${smsResult.reason}`
                            : "Guest added and SMS sent automatically."
                    );
                    setStatusType(
                        smsResult.trackingFailed
                            ? "warning"
                            : "success"
                    );
                } else {
                    setStatus(
                        `Guest added. No SMS was sent: ${smsResult.reason}`
                    );
                    setStatusType("warning");
                }
            } catch (smsError) {
                const message =
                    smsError instanceof Error
                        ? smsError.message
                        : "Unknown SMS error";

                console.error(
                    "Automatic SMS error:",
                    smsError
                );

                setStatus(
                    `Guest added, but automatic SMS failed: ${message}`
                );
                setStatusType("warning");
            }
        } else {
            setStatus(
                "Guest added successfully. No automatic SMS was sent."
            );
            setStatusType("success");
        }

        setForm(initialForm);
        setSaving(false);

        window.setTimeout(() => {
            router.push("/guests");
            router.refresh();
        }, 1400);
    }

    const statusClasses =
        statusType === "success"
            ? "border-green-800 bg-green-950 text-green-300"
            : statusType === "warning"
                ? "border-amber-800 bg-amber-950 text-amber-300"
                : statusType === "error"
                    ? "border-red-800 bg-red-950 text-red-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300";

    return (
        <main className="min-h-screen bg-black p-6 text-white sm:p-10">
            <div className="mx-auto max-w-xl">
                <h1 className="text-4xl font-bold">
                    Add Guest
                </h1>

                <p className="mt-2 text-sm text-zinc-400">
                    Save a CRM contact, welcome a new client,
                    or add an event guest.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="mt-10 space-y-5"
                >
                    <div>
                        <label
                            htmlFor="name"
                            className="mb-2 block text-sm font-medium"
                        >
                            Name *
                        </label>

                        <input
                            id="name"
                            type="text"
                            value={form.name}
                            placeholder="Guest name"
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-4 outline-none focus:border-white"
                            onChange={(event) =>
                                updateField(
                                    "name",
                                    event.target.value
                                )
                            }
                            required
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="phone"
                            className="mb-2 block text-sm font-medium"
                        >
                            Phone
                        </label>

                        <input
                            id="phone"
                            type="tel"
                            value={form.phone}
                            placeholder="+1 514 555 1234"
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-4 outline-none focus:border-white"
                            onChange={(event) =>
                                updateField(
                                    "phone",
                                    event.target.value
                                )
                            }
                        />

                        <p className="mt-2 text-xs text-zinc-500">
                            Automatic SMS requires international
                            format, for example +15145551234.
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium"
                        >
                            Email
                        </label>

                        <input
                            id="email"
                            type="email"
                            value={form.email}
                            placeholder="guest@email.com"
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-4 outline-none focus:border-white"
                            onChange={(event) =>
                                updateField(
                                    "email",
                                    event.target.value
                                )
                            }
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="instagram"
                            className="mb-2 block text-sm font-medium"
                        >
                            Instagram
                        </label>

                        <input
                            id="instagram"
                            type="text"
                            value={form.instagram}
                            placeholder="@username"
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-4 outline-none focus:border-white"
                            onChange={(event) =>
                                updateField(
                                    "instagram",
                                    event.target.value
                                )
                            }
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="gender"
                            className="mb-2 block text-sm font-medium"
                        >
                            Gender *
                        </label>

                        <select
                            id="gender"
                            value={form.gender}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-4 outline-none focus:border-white"
                            onChange={(event) =>
                                updateField(
                                    "gender",
                                    event.target.value
                                )
                            }
                            required
                        >
                            <option value="">
                                Select Gender
                            </option>
                            <option value="Male">
                                Male
                            </option>
                            <option value="Female">
                                Female
                            </option>
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="vip_level"
                            className="mb-2 block text-sm font-medium"
                        >
                            VIP Level
                        </label>

                        <select
                            id="vip_level"
                            value={form.vip_level}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-4 outline-none focus:border-white"
                            onChange={(event) =>
                                updateField(
                                    "vip_level",
                                    event.target.value
                                )
                            }
                        >
                            <option value="Regular">
                                Regular
                            </option>
                            <option value="VIP">
                                VIP
                            </option>
                            <option value="BLACK">
                                BLACK
                            </option>
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="tag"
                            className="mb-2 block text-sm font-medium"
                        >
                            Tag
                        </label>

                        <select
                            id="tag"
                            value={form.tag}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-4 outline-none focus:border-white"
                            onChange={(event) =>
                                updateField(
                                    "tag",
                                    event.target.value
                                )
                            }
                        >
                            <option value="Regular">
                                Regular
                            </option>
                            <option value="VIP">
                                VIP
                            </option>
                            <option value="BLACK">
                                BLACK
                            </option>
                            <option value="Influencer">
                                Influencer
                            </option>
                            <option value="Birthday">
                                Birthday
                            </option>
                            <option value="Artist">
                                Artist
                            </option>
                            <option value="Promoter">
                                Promoter
                            </option>
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="guest_purpose"
                            className="mb-2 block text-sm font-medium"
                        >
                            Guest Purpose *
                        </label>

                        <select
                            id="guest_purpose"
                            value={form.guest_purpose}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-4 outline-none focus:border-white"
                            onChange={(event) =>
                                updateGuestPurpose(
                                    event.target
                                        .value as GuestPurpose
                                )
                            }
                        >
                            <option value="crm_contact">
                                CRM Contact Only — Save without SMS
                            </option>
                            <option value="new_client">
                                New Client — Welcome SMS
                            </option>
                            <option value="event_guest">
                                Event Guest — Invitation SMS
                            </option>
                        </select>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="font-medium">
                                    Send Automatic SMS
                                </p>
                                <p className="mt-1 text-xs text-zinc-400">
                                    The selected automation and
                                    template must also be active.
                                </p>
                            </div>

                            <button
                                type="button"
                                role="switch"
                                aria-checked={
                                    form.automatic_sms_enabled
                                }
                                disabled={
                                    form.guest_purpose ===
                                    "crm_contact"
                                }
                                onClick={() =>
                                    updateField(
                                        "automatic_sms_enabled",
                                        !form.automatic_sms_enabled
                                    )
                                }
                                className={`relative h-7 w-12 rounded-full transition ${form.automatic_sms_enabled
                                    ? "bg-green-500"
                                    : "bg-zinc-700"
                                    } disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                                <span
                                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${form.automatic_sms_enabled
                                        ? "left-6"
                                        : "left-1"
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="notes"
                            className="mb-2 block text-sm font-medium"
                        >
                            Notes
                        </label>

                        <textarea
                            id="notes"
                            value={form.notes}
                            placeholder="Notes about this guest"
                            rows={4}
                            className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 p-4 outline-none focus:border-white"
                            onChange={(event) =>
                                updateField(
                                    "notes",
                                    event.target.value
                                )
                            }
                        />
                    </div>

                    {status && (
                        <div
                            className={`rounded-lg border p-4 text-sm ${statusClasses}`}
                        >
                            {status}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded-lg bg-white px-6 py-3 font-bold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving
                            ? "Saving Guest..."
                            : "Save Guest"}
                    </button>
                </form>
            </div>
        </main>
    );
}
