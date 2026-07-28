import Link from "next/link";

export const metadata = {
    title: "Privacy Policy",
    description:
        "Privacy information for WKND Presents event registrations.",
};

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-black px-5 py-12 text-white">
            <article className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-zinc-950 p-7 md:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    WKND Presents
                </p>

                <h1 className="mt-3 text-4xl font-bold">
                    Privacy Policy
                </h1>

                <p className="mt-3 text-sm text-zinc-500">
                    Last updated: July 27, 2026
                </p>

                <div className="mt-8 space-y-6 text-sm leading-7 text-zinc-300">
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Information we collect
                        </h2>

                        <p className="mt-2">
                            WKND Presents may collect information you voluntarily
                            submit through a guest-list or event registration form,
                            including your name, phone number, email address,
                            Instagram username, birthday, and event preferences.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            How we use your information
                        </h2>

                        <p className="mt-2">
                            We use submitted information to manage event registration,
                            maintain guest lists, verify event access, send event
                            confirmations or reminders, respond to support requests,
                            and improve event operations.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Text messages
                        </h2>

                        <p className="mt-2">
                            Event-related text messages may be sent when you provide a
                            phone number and consent. Message and data rates may apply.
                            Reply STOP to unsubscribe from future text messages.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Information we do not request
                        </h2>

                        <p className="mt-2">
                            WKND Presents does not request passwords, banking
                            information, credit-card details, or government
                            identification through its guest-list forms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Service providers
                        </h2>

                        <p className="mt-2">
                            Information may be processed by service providers used to
                            operate the registration system, including hosting,
                            database, analytics, and messaging providers. We do not
                            sell guest-list information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Data retention
                        </h2>

                        <p className="mt-2">
                            We retain information for as long as reasonably necessary
                            to operate our events, maintain attendance records, comply
                            with legal obligations, and support future event
                            communication where permitted.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Your choices
                        </h2>

                        <p className="mt-2">
                            You may request access, correction, or deletion of your
                            information. You may also withdraw consent to text
                            messages at any time by replying STOP.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Contact
                        </h2>

                        <p className="mt-2">
                            For privacy questions or requests, contact WKND Presents
                            through the official Instagram account.
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
                        href="/contact"
                        className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200"
                    >
                        Contact WKND Presents
                    </Link>
                </div>
            </article>
        </main>
    );
}
