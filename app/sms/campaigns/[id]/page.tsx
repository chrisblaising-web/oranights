"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type Campaign = {
  id: number;
  campaign_name: string | null;
  audience: string | null;
  message_template: string | null;
  total_recipients: number | null;
  sent_count: number | null;
  failed_count: number | null;
  status: string | null;
  created_at: string;
  completed_at: string | null;
};

type SmsLog = {
  id: number;
  guest_name: string | null;
  phone: string | null;
  message: string | null;
  status: string | null;
  error_message: string | null;
  created_at: string;
};

export default function SmsCampaignDetailsPage() {
  const params = useParams<{ id: string }>();

  const campaignId = useMemo(() => {
    return Number(params?.id);
  }, [params?.id]);

  const [campaign, setCampaign] =
    useState<Campaign | null>(null);

  const [logs, setLogs] =
    useState<SmsLog[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 10000);

    async function loadCampaign() {
      setLoading(true);
      setError("");

      try {
        if (
          !Number.isFinite(campaignId) ||
          campaignId <= 0
        ) {
          throw new Error(
            "Invalid campaign ID."
          );
        }

        const {
          data: campaignData,
          error: campaignError,
        } = await supabase
          .from("sms_campaigns")
          .select(
            "id,campaign_name,audience,message_template,total_recipients,sent_count,failed_count,status,created_at,completed_at"
          )
          .eq("id", campaignId)
          .abortSignal(controller.signal)
          .single();

        if (campaignError) {
          throw campaignError;
        }

        const {
          data: logData,
          error: logError,
        } = await supabase
          .from("sms_logs")
          .select(
            "id,guest_name,phone,message,status,error_message,created_at"
          )
          .eq("campaign_id", campaignId)
          .order("created_at", {
            ascending: false,
          })
          .abortSignal(controller.signal);

        if (logError) {
          throw logError;
        }

        if (cancelled) {
          return;
        }

        setCampaign(
          campaignData as Campaign
        );

        setLogs(
          (logData as SmsLog[]) ?? []
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Campaign loading error:",
          error
        );

        const message =
          error instanceof Error
            ? error.name === "AbortError"
              ? "Supabase did not respond within 10 seconds. Check your connection and Supabase settings."
              : error.message
            : "Unable to load this campaign.";

        setError(message);
        setCampaign(null);
        setLogs([]);
      } finally {
        window.clearTimeout(timeoutId);

        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCampaign();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [campaignId]);

  const deliveredCount = logs.filter(
    (log) =>
      log.status?.toLowerCase() ===
      "delivered"
  ).length;

  const queuedCount = logs.filter(
    (log) =>
      [
        "accepted",
        "queued",
        "sending",
        "sent",
      ].includes(
        log.status?.toLowerCase() || ""
      )
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-black text-white">
        <Sidebar />

        <main className="flex-1 p-6 md:p-10">
          <div className="h-10 w-72 animate-pulse rounded bg-zinc-900" />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-2xl bg-zinc-900"
                />
              )
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />

      <main className="min-w-0 flex-1 p-6 md:p-10">
        <Link
          href="/sms"
          className="text-sm text-zinc-400 transition hover:text-white"
        >
          ← SMS Campaigns
        </Link>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <h1 className="text-2xl font-bold">
              Campaign unavailable
            </h1>

            <p className="mt-3 text-red-200">
              {error}
            </p>
          </div>
        ) : campaign ? (
          <>
            <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div>
                <h1 className="text-4xl font-bold">
                  {campaign.campaign_name ||
                    "Untitled Campaign"}
                </h1>

                <p className="mt-2 text-zinc-400">
                  {campaign.audience ||
                    "Unknown audience"}
                </p>
              </div>

              <span className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold capitalize text-zinc-300">
                {campaign.status ||
                  "unknown"}
              </span>
            </div>

            <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-500">
                  Total recipients
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {campaign.total_recipients ||
                    0}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-500">
                  Sent
                </p>

                <p className="mt-2 text-3xl font-bold text-green-400">
                  {campaign.sent_count || 0}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-500">
                  Delivered
                </p>

                <p className="mt-2 text-3xl font-bold text-blue-400">
                  {deliveredCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
                <p className="text-sm text-zinc-500">
                  Failed
                </p>

                <p className="mt-2 text-3xl font-bold text-red-400">
                  {campaign.failed_count || 0}
                </p>
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-950 p-6">
              <h2 className="text-xl font-bold">
                Message
              </h2>

              <p className="mt-4 whitespace-pre-wrap text-zinc-300">
                {campaign.message_template ||
                  "No message template saved."}
              </p>

              <div className="mt-6 grid gap-4 text-sm text-zinc-500 md:grid-cols-2">
                <p>
                  Created:{" "}
                  {new Date(
                    campaign.created_at
                  ).toLocaleString()}
                </p>

                <p>
                  Completed:{" "}
                  {campaign.completed_at
                    ? new Date(
                      campaign.completed_at
                    ).toLocaleString()
                    : "Not completed"}
                </p>
              </div>
            </section>

            <section className="mt-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    Recipients
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    {logs.length} message records,{" "}
                    {queuedCount} still processing.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {logs.map((log) => {
                  const currentStatus =
                    log.status?.toLowerCase() ||
                    "unknown";

                  const statusClass =
                    currentStatus ===
                      "delivered" ||
                      currentStatus === "sent"
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
                      className="rounded-2xl border border-white/10 bg-zinc-950 p-6"
                    >
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div>
                          <p className="font-semibold">
                            {log.guest_name ||
                              "Unknown guest"}
                          </p>

                          <p className="mt-1 text-sm text-zinc-500">
                            {log.phone ||
                              "No phone number"}
                          </p>
                        </div>

                        <span
                          className={`text-sm font-semibold capitalize ${statusClass}`}
                        >
                          {currentStatus}
                        </span>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-300">
                        {log.message}
                      </p>

                      {log.error_message && (
                        <p className="mt-4 rounded-lg bg-red-950/40 p-3 text-sm text-red-300">
                          {log.error_message}
                        </p>
                      )}

                      <p className="mt-4 text-xs text-zinc-600">
                        {new Date(
                          log.created_at
                        ).toLocaleString()}
                      </p>
                    </article>
                  );
                })}

                {logs.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-950 p-10 text-center text-zinc-500">
                    No SMS logs were found for this campaign.
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}