"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type RecipientMode = "individual" | "manual" | "group";

type Guest = {
  id: number;
  name: string | null;
  phone: string | null;
  tag: string | null;
  vip_level: string | null;
};

type SmsLog = {
  id: number;
  guest_id: number | null;
  campaign_id: number | null;
  guest_name: string | null;
  campaign: string | null;
  audience: string | null;
  phone: string | null;
  message: string | null;
  status: string | null;
  error_message: string | null;
  created_at: string;
};

type SmsTemplate = {
  id: number;
  template_key: string | null;
  campaign: string | null;
  audience: string | null;
  message: string;
  is_active: boolean | null;
};

function personalizeMessage(
  template: string,
  fullName: string | null
) {
  const firstName =
    fullName?.trim().split(/\s+/)[0] || "Guest";

  return template.replaceAll(
    "{{name}}",
    firstName
  );
}

export default function SMSPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [recipientMode, setRecipientMode] =
    useState<RecipientMode>("individual");

  const [selectedGuestId, setSelectedGuestId] =
    useState("");

  const [selectedGroup, setSelectedGroup] =
    useState("");

  const [manualName, setManualName] =
    useState("");

  const [manualPhone, setManualPhone] =
    useState("");

  const [guests, setGuests] = useState<Guest[]>([]);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingGuests, setLoadingGuests] =
    useState(true);

  async function loadGuests() {
    setLoadingGuests(true);

    const { data, error } = await supabase
      .from("guests")
      .select("id,name,phone,tag,vip_level")
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error("Guest loading error:", error);

      setStatus(
        `Guests could not be loaded: ${error.message}`
      );

      setLoadingGuests(false);
      return;
    }

    setGuests((data as Guest[]) ?? []);
    setLoadingGuests(false);
  }

  async function loadTemplates() {
    const { data, error } = await supabase
      .from("sms_templates")
      .select(
        "id,template_key,campaign,audience,message,is_active"
      )
      .order("campaign", {
        ascending: true,
      });

    if (error) {
      console.error(
        "SMS template loading error:",
        error
      );

      setStatus(
        `SMS templates could not be loaded: ${error.message}`
      );

      return;
    }

    setTemplates(
      ((data as SmsTemplate[]) ?? []).filter(
        (template) =>
          template.is_active !== false
      )
    );
  }

  async function loadLogs() {
    const { data, error } = await supabase
      .from("sms_logs")
      .select(
        "id,guest_id,campaign_id,guest_name,campaign,audience,phone,message,status,error_message,created_at"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

    if (error) {
      console.error(
        "SMS log loading error:",
        error
      );

      setStatus(
        `SMS history could not be loaded: ${error.message}`
      );

      return;
    }

    setLogs((data as SmsLog[]) ?? []);
  }

  useEffect(() => {
    void loadGuests();
    void loadLogs();
    void loadTemplates();
  }, []);

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw new Error(
        `Unable to verify your login session: ${error.message}`
      );
    }

    const accessToken = data.session?.access_token;

    if (!accessToken) {
      throw new Error(
        "You must be logged in before sending SMS."
      );
    }

    return accessToken;
  }

  function applyTemplate(
    templateId: string
  ) {
    setSelectedTemplateId(
      templateId
    );

    const template =
      templates.find(
        (item) =>
          String(item.id) ===
          templateId
      );

    if (!template) {
      return;
    }

    setMessage(
      template.message || ""
    );

    if (
      !title.trim() &&
      template.campaign
    ) {
      setTitle(
        template.campaign
      );
    }
  }

  const groupOptions = useMemo(() => {
    const tags = guests
      .map((guest) => guest.tag?.trim())
      .filter((tag): tag is string => Boolean(tag));

    const vipLevels = guests
      .map((guest) => guest.vip_level?.trim())
      .filter((level): level is string => Boolean(level));

    return [
      "All Guests",
      ...Array.from(new Set([...vipLevels, ...tags])).sort((a, b) =>
        a.localeCompare(b)
      ),
    ];
  }, [guests]);

  const selectedGuest =
    useMemo(() => {
      return guests.find(
        (guest) =>
          String(guest.id) ===
          selectedGuestId
      );
    }, [
      guests,
      selectedGuestId,
    ]);

  const groupGuests =
    useMemo(() => {
      if (!selectedGroup) {
        return [];
      }

      return guests.filter(
        (guest) => {
          if (
            !guest.phone?.trim()
          ) {
            return false;
          }

          if (
            selectedGroup ===
            "All Guests"
          ) {
            return true;
          }

          if (
            selectedGroup ===
            "VIP" ||
            selectedGroup ===
            "BLACK"
          ) {
            return (
              guest.vip_level ===
              selectedGroup
            );
          }

          return (
            guest.tag ===
            selectedGroup
          );
        }
      );
    }, [
      guests,
      selectedGroup,
    ]);

  const recipients =
    useMemo(() => {
      if (
        recipientMode ===
        "individual"
      ) {
        if (
          !selectedGuest?.phone?.trim()
        ) {
          return [];
        }

        return [
          selectedGuest,
        ];
      }

      if (
        recipientMode ===
        "manual"
      ) {
        if (
          !manualPhone.trim()
        ) {
          return [];
        }

        return [
          {
            id: null,
            name:
              manualName.trim() ||
              "Manual Guest",
            phone:
              manualPhone.trim(),
            tag: null,
            vip_level: null,
          },
        ];
      }

      return groupGuests;
    }, [
      recipientMode,
      selectedGuest,
      manualName,
      manualPhone,
      groupGuests,
    ]);

  const previewName =
    recipients[0]?.name ||
    "Guest";

  const messagePreview =
    useMemo(() => {
      return personalizeMessage(
        message,
        previewName
      );
    }, [
      message,
      previewName,
    ]);

  async function sendSMS() {
    if (!title.trim()) {
      setStatus(
        "Please enter a campaign name."
      );

      return;
    }

    if (!message.trim()) {
      setStatus(
        "Please write your SMS message."
      );

      return;
    }

    if (
      recipientMode ===
      "individual" &&
      !selectedGuest
    ) {
      setStatus(
        "Please select one guest."
      );

      return;
    }

    if (
      recipientMode ===
      "individual" &&
      !selectedGuest?.phone?.trim()
    ) {
      setStatus(
        "This guest does not have a phone number."
      );

      return;
    }

    if (
      recipientMode ===
      "group" &&
      !selectedGroup
    ) {
      setStatus(
        "Please select a guest group."
      );

      return;
    }

    if (
      recipientMode ===
      "manual"
    ) {
      const normalizedPhone =
        manualPhone.replace(
          /[\s()-]/g,
          ""
        );

      if (
        !manualPhone.trim()
      ) {
        setStatus(
          "Please enter a phone number."
        );

        return;
      }

      const validPhone =
        /^(?:\+?1)?\d{10}$|^\+[1-9]\d{7,14}$/.test(
          normalizedPhone
        );

      if (!validPhone) {
        setStatus(
          "Enter a valid phone number, such as 4385551234 or +15145551234."
        );

        return;
      }
    }

    if (
      recipients.length === 0
    ) {
      setStatus(
        "No guests with phone numbers were found."
      );

      return;
    }

    setSending(true);

    setStatus(
      recipients.length === 1
        ? "Sending SMS..."
        : `Sending to ${recipients.length} guests...`
    );

    let sentCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;

    const sendErrors:
      string[] = [];

    try {
      const accessToken = await getAccessToken();

      const audience =
        recipientMode ===
          "individual"
          ? "Single Guest"
          : recipientMode ===
            "manual"
            ? "Manual Number"
            : selectedGroup;

      const duplicateRecipients: string[] = [];

      for (const recipient of recipients) {
        const personalizedMessage = personalizeMessage(
          message.trim(),
          recipient.name
        );

        const checkResponse = await fetch(
          "/api/send-sms",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              guestId: recipient.id,
              campaign: title.trim(),
              audience,
              phone: recipient.phone?.replace(/[\s()-]/g, ""),
              name: recipient.name,
              message: personalizedMessage,
              messageTemplate: message.trim(),
              checkOnly: true,
            }),
          }
        );

        const checkData = await checkResponse.json();

        if (!checkResponse.ok || !checkData.success) {
          throw new Error(
            checkData.error ||
            "Duplicate verification failed."
          );
        }

        if (checkData.duplicate) {
          duplicateRecipients.push(
            recipient.name ||
            recipient.phone ||
            "Unknown recipient"
          );
        }
      }

      let allowDuplicate = false;

      if (duplicateRecipients.length > 0) {
        const duplicatePreview = duplicateRecipients
          .slice(0, 10)
          .map((name) => `• ${name}`)
          .join("\n");

        const remainingCount =
          duplicateRecipients.length - 10;

        const warning = [
          `${duplicateRecipients.length} recipient${duplicateRecipients.length === 1 ? " has" : "s have"
          } already received this campaign:`,
          "",
          duplicatePreview,
          remainingCount > 0
            ? `• and ${remainingCount} more`
            : "",
          "",
          "Press OK to send again, or Cancel to stop.",
        ]
          .filter(Boolean)
          .join("\n");

        allowDuplicate = window.confirm(warning);

        if (!allowDuplicate) {
          setStatus(
            "Campaign cancelled. No duplicate SMS messages were sent."
          );
          setSending(false);
          return;
        }
      }

      const {
        data: campaignRow,
        error: campaignError,
      } = await supabase
        .from("sms_campaigns")
        .insert({
          campaign_name:
            title.trim(),

          audience,

          message_template:
            message.trim(),

          recipient_mode:
            recipientMode,

          selected_group:
            recipientMode ===
              "group"
              ? selectedGroup
              : null,

          total_recipients:
            recipients.length,

          sent_count: 0,

          failed_count: 0,

          status: "sending",
        })
        .select("id")
        .single();

      if (
        campaignError ||
        !campaignRow
      ) {
        throw new Error(
          `Campaign could not be created: ${campaignError?.message ||
          "Unknown database error"
          }`
        );
      }

      const campaignId =
        Number(
          campaignRow.id
        );

      for (
        const recipient
        of recipients
      ) {
        try {
          const personalizedMessage =
            personalizeMessage(
              message.trim(),
              recipient.name
            );

          const response =
            await fetch(
              "/api/send-sms",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },

                body:
                  JSON.stringify({
                    guestId:
                      recipient.id,

                    campaignId,

                    campaign:
                      title.trim(),

                    audience,

                    phone:
                      recipient.phone?.replace(
                        /[\s()-]/g,
                        ""
                      ),

                    name:
                      recipient.name,

                    message:
                      personalizedMessage,

                    messageTemplate:
                      message.trim(),

                    allowDuplicate,
                  }),
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            if (
              response.status ===
              409 ||
              data.duplicate
            ) {
              duplicateCount++;

              sendErrors.push(
                `${recipient.name ||
                recipient.phone
                }: already received this campaign`
              );

              continue;
            }

            throw new Error(
              data.error ||
              "SMS failed"
            );
          }

          sentCount++;
        } catch (error) {
          failedCount++;

          const errorMessage =
            error instanceof Error
              ? error.message
              : "SMS failed";

          sendErrors.push(
            `${recipient.name ||
            recipient.phone
            }: ${errorMessage}`
          );

          console.error(
            `SMS failed for ${recipient.name}:`,
            error
          );
        }
      }

      const {
        error:
        campaignUpdateError,
      } = await supabase
        .from("sms_campaigns")
        .update({
          sent_count:
            sentCount,

          failed_count:
            failedCount,

          status:
            failedCount === 0 &&
              duplicateCount === 0
              ? "completed"
              : sentCount > 0
                ? "partial"
                : duplicateCount >
                  0 &&
                  failedCount ===
                  0
                  ? "duplicate"
                  : "failed",

          completed_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          campaignId
        );

      if (
        campaignUpdateError
      ) {
        console.error(
          "Campaign summary update failed:",
          campaignUpdateError
        );
      }

      if (
        failedCount === 0 &&
        duplicateCount === 0
      ) {
        setStatus(
          `${sentCount} SMS ${sentCount === 1
            ? "message"
            : "messages"
          } sent successfully ✅`
        );

        setMessage("");
      } else {
        const summary = [
          `${sentCount} sent`,

          duplicateCount > 0
            ? `${duplicateCount} duplicate${duplicateCount ===
              1
              ? ""
              : "s"
            } blocked`
            : null,

          failedCount > 0
            ? `${failedCount} failed`
            : null,
        ]
          .filter(Boolean)
          .join(", ");

        setStatus(
          sendErrors.length > 0
            ? `${summary}. ${sendErrors
              .slice(0, 3)
              .join(" | ")}`
            : `${summary}.`
        );
      }

      await loadLogs();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `SMS failed: ${error.message}`
          : "SMS failed."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10">
        <h1 className="text-4xl font-bold">
          SMS Campaigns
        </h1>

        <p className="mt-2 text-zinc-400">
          Send a message to one saved guest, one manual number,
          or an entire guest group.
        </p>

        <div className="mt-10 grid gap-8 xl:grid-cols-2">
          <section className="space-y-6 rounded-xl bg-zinc-900 p-6">
            <div>
              <label
                htmlFor="campaign-name"
                className="mb-2 block text-sm text-zinc-400"
              >
                Campaign name
              </label>

              <input
                id="campaign-name"
                placeholder="Example: Friday VIP Reminder"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                className="w-full rounded bg-zinc-800 p-4 outline-none ring-blue-600 focus:ring-2"
              />
            </div>

            <div>
              <h2 className="text-lg font-bold">
                Who do you want to message?
              </h2>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    setRecipientMode(
                      "individual"
                    );

                    setSelectedGroup(
                      ""
                    );

                    setStatus("");
                  }}
                  className={`rounded-lg border p-4 text-left transition ${recipientMode ===
                    "individual"
                    ? "border-blue-500 bg-blue-950/40"
                    : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                    }`}
                >
                  <p className="font-semibold">
                    One Guest
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    Select one person and view their phone number.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecipientMode(
                      "manual"
                    );

                    setSelectedGuestId(
                      ""
                    );

                    setSelectedGroup(
                      ""
                    );

                    setStatus("");
                  }}
                  className={`rounded-lg border p-4 text-left transition ${recipientMode ===
                    "manual"
                    ? "border-blue-500 bg-blue-950/40"
                    : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                    }`}
                >
                  <p className="font-semibold">
                    Manual Number
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    Enter one guest and phone number manually.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecipientMode(
                      "group"
                    );

                    setSelectedGuestId(
                      ""
                    );

                    setStatus("");
                  }}
                  className={`rounded-lg border p-4 text-left transition ${recipientMode ===
                    "group"
                    ? "border-blue-500 bg-blue-950/40"
                    : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                    }`}
                >
                  <p className="font-semibold">
                    Guest Group
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    Send to guests sharing a tag or VIP level.
                  </p>
                </button>
              </div>
            </div>

            {recipientMode ===
              "individual" && (
                <div>
                  <label
                    htmlFor="guest"
                    className="mb-2 block text-sm text-zinc-400"
                  >
                    Select guest
                  </label>

                  <select
                    id="guest"
                    value={
                      selectedGuestId
                    }
                    onChange={(
                      event
                    ) => {
                      setSelectedGuestId(
                        event.target
                          .value
                      );

                      setStatus("");
                    }}
                    disabled={
                      loadingGuests
                    }
                    className="w-full rounded bg-zinc-800 p-4 outline-none ring-blue-600 focus:ring-2 disabled:opacity-50"
                  >
                    <option value="">
                      {loadingGuests
                        ? "Loading guests..."
                        : "Choose a guest"}
                    </option>

                    {guests.map(
                      (guest) => (
                        <option
                          key={
                            guest.id
                          }
                          value={
                            guest.id
                          }
                        >
                          {guest.name ||
                            "Unnamed guest"}{" "}
                          —{" "}
                          {guest.phone ||
                            "No phone number"}
                        </option>
                      )
                    )}
                  </select>

                  {selectedGuest && (
                    <div className="mt-4 rounded-lg border border-zinc-700 bg-black p-4">
                      <p className="text-sm text-zinc-400">
                        Selected recipient
                      </p>

                      <p className="mt-1 text-lg font-semibold">
                        {selectedGuest.name ||
                          "Unnamed guest"}
                      </p>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase text-zinc-500">
                            Phone
                          </p>

                          <p className="mt-1 text-zinc-200">
                            {selectedGuest.phone ||
                              "No phone number"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs uppercase text-zinc-500">
                            Group
                          </p>

                          <p className="mt-1 text-zinc-200">
                            {selectedGuest.tag ||
                              selectedGuest.vip_level ||
                              "No group"}
                          </p>
                        </div>
                      </div>

                      {!selectedGuest.phone && (
                        <p className="mt-4 rounded bg-red-950/40 p-3 text-sm text-red-300">
                          Add a phone number to this guest before sending an SMS.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

            {recipientMode ===
              "manual" && (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="manual-name"
                      className="mb-2 block text-sm text-zinc-400"
                    >
                      Guest name
                    </label>

                    <input
                      id="manual-name"
                      type="text"
                      value={manualName}
                      onChange={(
                        event
                      ) => {
                        setManualName(
                          event.target
                            .value
                        );

                        setStatus("");
                      }}
                      placeholder="Example: John Doe"
                      className="w-full rounded bg-zinc-800 p-4 outline-none ring-blue-600 focus:ring-2"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="manual-phone"
                      className="mb-2 block text-sm text-zinc-400"
                    >
                      Phone number
                    </label>

                    <input
                      id="manual-phone"
                      type="tel"
                      value={
                        manualPhone
                      }
                      onChange={(
                        event
                      ) => {
                        setManualPhone(
                          event.target
                            .value
                        );

                        setStatus("");
                      }}
                      placeholder="+1 514 555 1234"
                      className="w-full rounded bg-zinc-800 p-4 outline-none ring-blue-600 focus:ring-2"
                    />

                    <p className="mt-2 text-xs text-zinc-500">
                      Canadian numbers can be entered with or without +1.
                    </p>
                  </div>

                  {manualPhone.trim() && (
                    <div className="rounded-lg border border-zinc-700 bg-black p-4">
                      <p className="text-sm text-zinc-400">
                        Manual recipient
                      </p>

                      <p className="mt-1 text-lg font-semibold">
                        {manualName.trim() ||
                          "Unnamed guest"}
                      </p>

                      <p className="mt-2 text-zinc-300">
                        {manualPhone}
                      </p>

                      <p className="mt-3 text-xs text-amber-300">
                        This sends one SMS without adding the person to your guest database.
                      </p>
                    </div>
                  )}
                </div>
              )}

            {recipientMode ===
              "group" && (
                <div>
                  <label
                    htmlFor="guest-group"
                    className="mb-2 block text-sm text-zinc-400"
                  >
                    Select guest group
                  </label>

                  <select
                    id="guest-group"
                    value={
                      selectedGroup
                    }
                    onChange={(
                      event
                    ) => {
                      setSelectedGroup(
                        event.target
                          .value
                      );

                      setStatus("");
                    }}
                    disabled={
                      loadingGuests
                    }
                    className="w-full rounded bg-zinc-800 p-4 outline-none ring-blue-600 focus:ring-2 disabled:opacity-50"
                  >
                    <option value="">
                      Choose a group
                    </option>

                    {groupOptions.map(
                      (group) => (
                        <option
                          key={group}
                          value={group}
                        >
                          {group}
                        </option>
                      )
                    )}
                  </select>

                  {selectedGroup && (
                    <div className="mt-4 rounded-lg border border-zinc-700 bg-black p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-zinc-400">
                            Selected group
                          </p>

                          <p className="mt-1 text-lg font-semibold">
                            {selectedGroup}
                          </p>
                        </div>

                        <span className="rounded-full bg-blue-950 px-3 py-1 text-sm text-blue-300">
                          {groupGuests.length} recipients
                        </span>
                      </div>

                      {groupGuests.length >
                        0 ? (
                        <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
                          {groupGuests.map(
                            (guest) => (
                              <div
                                key={
                                  guest.id
                                }
                                className="flex flex-col justify-between gap-1 rounded bg-zinc-900 px-3 py-3 sm:flex-row sm:items-center"
                              >
                                <span className="font-medium">
                                  {guest.name ||
                                    "Unnamed guest"}
                                </span>

                                <span className="text-sm text-zinc-400">
                                  {guest.phone}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-amber-300">
                          No guests in this group have phone numbers.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

            <div>
              <label
                htmlFor="sms-template"
                className="mb-2 block text-sm text-zinc-400"
              >
                SMS template
              </label>

              <select
                id="sms-template"
                value={
                  selectedTemplateId
                }
                onChange={(event) =>
                  applyTemplate(
                    event.target
                      .value
                  )
                }
                className="mb-5 w-full rounded bg-zinc-800 p-3 outline-none ring-blue-600 focus:ring-2"
              >
                <option value="">
                  Select a saved template
                </option>

                {templates.map(
                  (template) => (
                    <option
                      key={
                        template.id
                      }
                      value={String(
                        template.id
                      )}
                    >
                      {template.campaign ||
                        template.template_key ||
                        `Template ${template.id}`}
                    </option>
                  )
                )}
              </select>

              {templates.length ===
                0 && (
                  <p className="mb-5 text-sm text-amber-300">
                    No active SMS templates were loaded. Check the sms_templates table and its Supabase read policy.
                  </p>
                )}

              <label
                htmlFor="message"
                className="mb-2 block text-sm text-zinc-400"
              >
                SMS message
              </label>

              <textarea
                id="message"
                placeholder="Hi {{name}}, Ora Nights is back this Friday..."
                value={message}
                onChange={(event) =>
                  setMessage(
                    event.target
                      .value
                  )
                }
                maxLength={320}
                className="h-40 w-full rounded bg-zinc-800 p-4 outline-none ring-blue-600 focus:ring-2"
              />

              <div className="mt-2 flex flex-col gap-2 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Use {"{{name}}"} to insert each guest&apos;s first name automatically.
                </p>

                <p>
                  {message.length}/320
                </p>
              </div>

              {message.trim() && (
                <div className="mt-4 rounded-lg border border-zinc-700 bg-black p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Personalized preview
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">
                    {messagePreview}
                  </p>

                  {recipients.length >
                    1 && (
                      <p className="mt-3 text-xs text-blue-300">
                        Each guest will receive this message with their own first name.
                      </p>
                    )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={sendSMS}
              disabled={
                sending ||
                recipients.length ===
                0
              }
              className="rounded bg-white px-6 py-3 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending
                ? "Sending..."
                : recipients.length >
                  1
                  ? `Send to ${recipients.length} Guests`
                  : "Send SMS"}
            </button>

            {status && (
              <p className="rounded-lg bg-zinc-800 p-3 text-sm text-zinc-300">
                {status}
              </p>
            )}
          </section>

          <section className="rounded-xl bg-zinc-900 p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">
                Recent SMS History
              </h2>

              <button
                type="button"
                onClick={() =>
                  void loadLogs()
                }
                className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                Refresh
              </button>
            </div>

            <div className="max-h-[750px] space-y-4 overflow-y-auto">
              {logs.map((log) => {
                const currentStatus =
                  log.status?.toLowerCase() ||
                  "unknown";

                const statusClass =
                  currentStatus ===
                    "sent" ||
                    currentStatus ===
                    "delivered"
                    ? "text-green-400"
                    : currentStatus ===
                      "failed" ||
                      currentStatus ===
                      "undelivered"
                      ? "text-red-400"
                      : "text-amber-300";

                return (
                  <article
                    key={log.id}
                    className="border-b border-zinc-700 pb-4"
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <strong>
                          {log.guest_name ||
                            "Unknown guest"}
                        </strong>

                        <p className="mt-1 text-sm text-zinc-400">
                          {log.phone ||
                            "No phone"}
                        </p>
                      </div>

                      <span
                        className={`capitalize ${statusClass}`}
                      >
                        {currentStatus}
                      </span>
                    </div>

                    <p className="mt-3 font-medium">
                      {log.campaign_id ? (
                        <Link
                          href={`/sms/campaigns/${log.campaign_id}`}
                          className="text-blue-300 hover:text-blue-200 hover:underline"
                        >
                          {log.campaign || "Untitled campaign"}
                        </Link>
                      ) : (
                        log.campaign || "Untitled campaign"
                      )}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {log.audience ||
                        "Single Guest"}
                    </p>

                    <p className="mt-3 whitespace-pre-wrap">
                      {log.message}
                    </p>

                    {log.error_message && (
                      <p className="mt-3 rounded bg-red-950/40 p-3 text-sm text-red-300">
                        {log.error_message}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-zinc-500">
                      {new Date(
                        log.created_at
                      ).toLocaleString()}
                    </p>
                  </article>
                );
              })}

              {logs.length === 0 && (
                <p className="text-zinc-500">
                  No SMS history found.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}