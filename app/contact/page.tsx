import Link from "next/link";

export const metadata = {
  title: "Contact",
  description:
    "Contact WKND Presents about Ora Nights guest-list registration.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black px-5 py-12 text-white">
      <article className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-zinc-950 p-7 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
          WKND Presents
        </p>

        <h1 className="mt-3 text-4xl font-bold">
          Contact
        </h1>

        <p className="mt-3 text-sm text-zinc-500">
          Guest-list and event support
        </p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-zinc-300">
          <section>
            <h2 className="text-lg font-semibold text-white">
              Ora Nights registration support
            </h2>

            <p className="mt-2">
              Contact WKND Presents if you have questions about your
              guest-list registration, confirmation message, event
              details, or entry information.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black p-5">
            <h2 className="text-lg font-semibold text-white">
              Official Instagram
            </h2>

            <p className="mt-2 text-zinc-400">
              The official WKND Presents account is the primary contact
              for guest-list support.
            </p>

            <a
              href="https://www.instagram.com/wknd.presents"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
            >
              Contact @wknd.presents
            </a>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              Information to include
            </h2>

            <p className="mt-2">
              To help us locate your registration, include the event
              name, your full name, and the phone number or Instagram
              username used on the form.
            </p>
          </section>

          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h2 className="text-lg font-semibold text-emerald-200">
              Safety notice
            </h2>

            <p className="mt-2 text-zinc-300">
              WKND Presents will never ask for your password, banking
              details, credit-card information, or government
              identification through a guest-list form.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">
              Text-message opt-out
            </h2>

            <p className="mt-2">
              Reply STOP to any event-related text message to
              unsubscribe from future messages.
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
            href="/terms"
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/5"
          >
            Terms of Use
          </Link>
        </div>
      </article>
    </main>
  );
}
