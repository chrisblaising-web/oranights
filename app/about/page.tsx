import Link from "next/link";

export const metadata = {
    title: "About WKND Presents",
    description:
        "Learn about WKND Presents and the official Ora Nights guest-list experience.",
};

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-black px-5 py-12 text-white">
            <article className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-zinc-950 p-7 md:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    WKND Presents
                </p>

                <h1 className="mt-3 text-4xl font-bold">
                    About Us
                </h1>

                <div className="mt-8 space-y-6 text-sm leading-7 text-zinc-300">
                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Who we are
                        </h2>

                        <p className="mt-2">
                            WKND Presents is an event brand focused on curated
                            nightlife, dinner experiences, guest-list events, and
                            special activations in Montréal.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Ora Nights
                        </h2>

                        <p className="mt-2">
                            Ora Nights is a WKND Presents event experience combining
                            dinner, music, nightlife, and guest-list access in one
                            organized event format.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Official registration
                        </h2>

                        <p className="mt-2">
                            This website is used to manage official event
                            registrations, guest lists, confirmations, reminders, and
                            event-entry information for WKND Presents events.
                        </p>
                    </section>

                    <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
                        <h2 className="text-lg font-semibold text-blue-200">
                            How to verify us
                        </h2>

                        <p className="mt-2">
                            Guests can verify WKND Presents through the official
                            Instagram account linked below.
                        </p>

                        <a
                            href="https://www.instagram.com/wknd.presents"
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
                        >
                            Visit @wknd.presents
                        </a>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white">
                            Safety and privacy
                        </h2>

                        <p className="mt-2">
                            WKND Presents guest-list forms do not request passwords,
                            banking details, credit-card information, or government
                            identification. Registration information is used only for
                            event operations and related communication.
                        </p>
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

                    <Link
                        href="/contact"
                        className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/5"
                    >
                        Contact
                    </Link>
                </div>
            </article>
        </main>
    );
}
