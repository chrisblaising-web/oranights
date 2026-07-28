import Link from "next/link";

export const metadata = {
    title: "Terms of Use",
    description:
        "Terms for WKND Presents guest-list registrations.",
};

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-black px-5 py-12 text-white">
            <article className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-zinc-950 p-7 md:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    WKND Presents
                </p>

                <h1 className="mt-3 text-4xl font-bold">
                    Terms of Use
                </h1>

                <p className="mt-3 text-sm text-zinc-500">
                    Last updated: July 27, 2026
                </p>

                <div className="mt-8 space-y-6 text-sm leading-7 text-zinc-300">
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Guest-list registration
                        </h2>

                        <p className="mt-2">
                            Submitting a guest-list form records your interest in
                            attending an event. Registration does not guarantee
                            admission.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Entry conditions
                        </h2>

                        <p className="mt-2">
                            Admission may remain subject to venue capacity, age
                            requirements, dress code, arrival time, identification,
                            ticket or table requirements, and approval by venue or
                            event staff.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Accurate information
                        </h2>

                        <p className="mt-2">
                            You agree to provide accurate information and not submit
                            another person’s name, phone number, email address, or
                            social account without permission.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Event changes
                        </h2>

                        <p className="mt-2">
                            Event dates, schedules, performers, venues, hosts, and
                            access conditions may change. WKND Presents may contact
                            registered guests when important event details are
                            updated.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Text messages
                        </h2>

                        <p className="mt-2">
                            When you provide consent, WKND Presents may send
                            event-related confirmations and reminders. Message and
                            data rates may apply. Reply STOP to unsubscribe.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Prohibited use
                        </h2>

                        <p className="mt-2">
                            You may not use the website for fraudulent, abusive,
                            automated, misleading, unlawful, or disruptive
                            submissions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            No payment collection
                        </h2>

                        <p className="mt-2">
                            Unless a separate secure checkout page is clearly
                            identified, WKND Presents guest-list forms do not request
                            credit-card information, banking details, passwords, or
                            government identification.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Limitation
                        </h2>

                        <p className="mt-2">
                            WKND Presents is not responsible for admission decisions
                            made by a venue, changes caused by third parties, or
                            interruptions outside its reasonable control.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Contact
                        </h2>

                        <p className="mt-2">
                            Questions about these terms may be sent through the
                            official WKND Presents Instagram account.
                        </p>

                        <a
                            href="https://www.instagram.com/wknd.presents"
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex text-white underline underline-offset-4"
                        >
                            @wknd.presents
                        </a>
                    </section>
                </div>

                <div className="mt-10 flex flex-wrap gap-3">
                    <Link
                        href="/"
                        className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/5"
                    >
                        Return to site
                    </Link>

                    <Link
                        href="/privacy"
                        className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/5"
                    >
                        Privacy Policy
                    </Link>
                </div>
            </article>
        </main>
    );
}
