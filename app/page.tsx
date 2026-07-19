import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">

      <div className="text-center">

        <h1 className="text-6xl font-bold">
          ORA CRM
        </h1>


        <p className="mt-4 text-xl text-gray-300">
          Luxury Hospitality Platform
        </p>


        <Link
          href="/dashboard"
          className="inline-block mt-10 rounded-lg bg-white px-6 py-3 text-black font-semibold hover:bg-gray-200"
        >
          Enter Dashboard
        </Link>


      </div>

    </main>
  );
}