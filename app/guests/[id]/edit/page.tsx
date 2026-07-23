"use client";

<<<<<<< HEAD
import {
    use,
    useEffect,
    useState,
    type FormEvent,
} from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type EditGuestProps = {
    params: Promise<{
        id: string;
    }>;
};

type GuestForm = {
    id: number;
    name: string;
    phone: string;
    email: string;
    instagram: string;
    birthday: string;
    gender: string;
    vip_level: string;
    tag: string;
    notes: string;
};

const emptyGuest: GuestForm = {
    id: 0,
    name: "",
    phone: "",
    email: "",
    instagram: "",
    birthday: "",
    gender: "",
    vip_level: "Regular",
    tag: "New Guest",
    notes: "",
};

export default function EditGuest({
    params,
}: EditGuestProps) {
    const router = useRouter();

    const { id } = use(params);
    const guestId = Number(id);

    const [guest, setGuest] =
        useState<GuestForm>(emptyGuest);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] =
        useState("");

    useEffect(() => {
        async function loadGuest() {
            setLoading(true);
            setErrorMessage("");

            if (
                !Number.isInteger(guestId) ||
                guestId <= 0
            ) {
                setErrorMessage("Invalid guest ID.");
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("guests")
                .select(`
          id,
          name,
          phone,
          email,
          instagram,
          birthday,
          gender,
          vip_level,
          tag,
          notes
        `)
                .eq("id", guestId)
                .single();

            if (error || !data) {
                console.error(
                    "Error loading guest:",
                    error
                );

                setErrorMessage(
                    error?.message ??
                    "Guest could not be found."
                );

                setLoading(false);
                return;
            }

            setGuest({
                id: data.id,
                name: data.name ?? "",
                phone: data.phone ?? "",
                email: data.email ?? "",
                instagram: data.instagram ?? "",
                birthday: data.birthday ?? "",
                gender: data.gender ?? "",
                vip_level:
                    data.vip_level ?? "Regular",
                tag: data.tag ?? "New Guest",
                notes: data.notes ?? "",
            });

            setLoading(false);
        }

        loadGuest();
    }, [guestId]);

    function updateField(
        field: keyof GuestForm,
        value: string
    ) {
        setGuest((currentGuest) => ({
            ...currentGuest,
            [field]: value,
        }));
    }

    async function updateGuest(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (!guest.name.trim()) {
            setErrorMessage(
                "Please enter the guest's name."
            );
            return;
        }

        if (
            guest.gender &&
            guest.gender !== "Male" &&
            guest.gender !== "Female"
        ) {
            setErrorMessage(
                "Gender must be Male or Female."
            );
            return;
        }

        setSaving(true);
        setErrorMessage("");

        const cleanedInstagram =
            guest.instagram
                .trim()
                .replace(/^@/, "");

        const { data, error } = await supabase
            .from("guests")
            .update({
                name: guest.name.trim(),
                phone: guest.phone.trim() || null,
                email: guest.email.trim() || null,
                instagram:
                    cleanedInstagram || null,
                birthday:
                    guest.birthday || null,
                gender:
                    guest.gender || null,
                vip_level:
                    guest.vip_level,
                tag: guest.tag,
                notes:
                    guest.notes.trim() || null,
            })
            .eq("id", guestId)
            .select("id")
            .single();

        if (error) {
            console.error(
                "Error updating guest:",
                error
            );

            setErrorMessage(error.message);
            setSaving(false);
            return;
        }

        if (!data) {
            setErrorMessage(
                "The guest was not updated. Check your Supabase update policy."
            );
            setSaving(false);
            return;
        }

        router.push(`/guests/${guestId}`);
        router.refresh();
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-black p-10 text-white">
                <p className="text-zinc-400">
                    Loading guest...
                </p>
            </main>
        );
    }

    if (
        errorMessage &&
        guest.id === 0
    ) {
        return (
            <main className="min-h-screen bg-black p-10 text-white">
                <h1 className="text-4xl font-bold">
                    Guest Not Found
                </h1>

                <p className="mt-4 text-red-400">
                    {errorMessage}
                </p>

                <Link
                    href="/guests"
                    className="mt-6 inline-block rounded-lg bg-white px-5 py-3 text-black"
                >
                    ← Back to Guests
                </Link>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black p-6 text-white md:p-10">
            <div className="mb-10 flex max-w-xl items-center justify-between">
                <h1 className="text-4xl font-bold">
                    Edit Guest
                </h1>

                <Link
                    href={`/guests/${guestId}`}
                    className="rounded-lg bg-zinc-800 px-5 py-3 transition hover:bg-zinc-700"
                >
                    Cancel
                </Link>
            </div>
=======
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function EditGuest({
    params,
}: {
    params: Promise<{ id: string }>
}) {

    const router = useRouter();

    const [guest, setGuest] = useState<any>(null);
    const [id, setId] = useState<string>("");


    useEffect(() => {

        async function loadGuest() {

            const { id } = await params;

            setId(id);


            const { data, error } = await supabase
                .from("guests")
                .select("*")
                .eq("id", Number(id))
                .single();


            if (error) {
                console.log(error);
                return;
            }


            setGuest(data);

        }


        loadGuest();

    }, [params]);



    async function updateGuest(e: React.FormEvent) {

        e.preventDefault();


        const { error } = await supabase
            .from("guests")
            .update({

                name: guest.name,
                phone: guest.phone,
                email: guest.email,
                instagram: guest.instagram,
                birthday: guest.birthday,
                vip_level: guest.vip_level,
                tag: guest.tag,
                notes: guest.notes

            })
            .eq("id", Number(id));



        if (error) {

            alert(error.message);
            console.log(error);

            return;
        }


        router.push(`/guests/${id}`);

    }



    if (!guest) {

        return (
            <main className="bg-black text-white min-h-screen p-10">
                Loading...
            </main>
        );

    }



    return (

        <main className="bg-black min-h-screen text-white p-10">


            <h1 className="text-4xl font-bold mb-10">
                Edit Guest
            </h1>


>>>>>>> e54d35691c981e006a0e0472c3b7e0afe90ab152

            <form
                onSubmit={updateGuest}
                className="max-w-xl space-y-5"
            >
<<<<<<< HEAD
                {errorMessage && (
                    <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-red-300">
                        {errorMessage}
                    </div>
                )}

                <div>
                    <label
                        htmlFor="name"
                        className="mb-2 block text-sm text-zinc-400"
                    >
                        Name
                    </label>

                    <input
                        id="name"
                        type="text"
                        value={guest.name}
                        onChange={(event) =>
                            updateField(
                                "name",
                                event.target.value
                            )
                        }
                        className="w-full rounded bg-zinc-900 p-4 outline-none ring-blue-600 focus:ring-2"
                        placeholder="Guest name"
                        required
                    />
                </div>

                <div>
                    <label
                        htmlFor="phone"
                        className="mb-2 block text-sm text-zinc-400"
                    >
                        Phone
                    </label>

                    <input
                        id="phone"
                        type="tel"
                        value={guest.phone}
                        onChange={(event) =>
                            updateField(
                                "phone",
                                event.target.value
                            )
                        }
                        className="w-full rounded bg-zinc-900 p-4 outline-none ring-blue-600 focus:ring-2"
                        placeholder="+1 514 000 0000"
                    />
                </div>

                <div>
                    <label
                        htmlFor="email"
                        className="mb-2 block text-sm text-zinc-400"
                    >
                        Email
                    </label>

                    <input
                        id="email"
                        type="email"
                        value={guest.email}
                        onChange={(event) =>
                            updateField(
                                "email",
                                event.target.value
                            )
                        }
                        className="w-full rounded bg-zinc-900 p-4 outline-none ring-blue-600 focus:ring-2"
                        placeholder="guest@email.com"
                    />
                </div>

                <div>
                    <label
                        htmlFor="instagram"
                        className="mb-2 block text-sm text-zinc-400"
                    >
                        Instagram
                    </label>

                    <input
                        id="instagram"
                        type="text"
                        value={guest.instagram}
                        onChange={(event) =>
                            updateField(
                                "instagram",
                                event.target.value
                            )
                        }
                        className="w-full rounded bg-zinc-900 p-4 outline-none ring-blue-600 focus:ring-2"
                        placeholder="Instagram username"
                    />
                </div>

                <div>
                    <label
                        htmlFor="gender"
                        className="mb-2 block text-sm text-zinc-400"
                    >
                        Gender
                    </label>

                    <select
                        id="gender"
                        value={guest.gender}
                        onChange={(event) =>
                            updateField(
                                "gender",
                                event.target.value
                            )
                        }
                        className="w-full rounded bg-zinc-900 p-4 outline-none ring-blue-600 focus:ring-2"
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
                        htmlFor="vip-level"
                        className="mb-2 block text-sm text-zinc-400"
                    >
                        Membership Level
                    </label>

                    <select
                        id="vip-level"
                        value={guest.vip_level}
                        onChange={(event) =>
                            updateField(
                                "vip_level",
                                event.target.value
                            )
                        }
                        className="w-full rounded bg-zinc-900 p-4 outline-none ring-blue-600 focus:ring-2"
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

                    <p className="mt-2 text-xs text-zinc-500">
                        This controls the guest&apos;s
                        membership or access level.
                    </p>
                </div>

                <div>
                    <label
                        htmlFor="guest-tag"
                        className="mb-2 block text-sm text-zinc-400"
                    >
                        Guest Tag
                    </label>

                    <select
                        id="guest-tag"
                        value={guest.tag}
                        onChange={(event) =>
                            updateField(
                                "tag",
                                event.target.value
                            )
                        }
                        className="w-full rounded bg-zinc-900 p-4 outline-none ring-blue-600 focus:ring-2"
                    >
                        <option value="New Guest">
                            New Guest
                        </option>

                        <option value="Regular Client">
                            Regular Client
                        </option>

                        <option value="High Spender">
                            High Spender
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

                    <p className="mt-2 text-xs text-zinc-500">
                        This describes the guest&apos;s
                        category, not their VIP level.
                    </p>
                </div>

                <div>
                    <label
                        htmlFor="birthday"
                        className="mb-2 block text-sm text-zinc-400"
                    >
                        Birthday
                    </label>

                    <input
                        id="birthday"
                        type="date"
                        value={guest.birthday}
                        onChange={(event) =>
                            updateField(
                                "birthday",
                                event.target.value
                            )
                        }
                        className="w-full rounded bg-zinc-900 p-4 outline-none ring-blue-600 focus:ring-2"
                    />
                </div>

                <div>
                    <label
                        htmlFor="notes"
                        className="mb-2 block text-sm text-zinc-400"
                    >
                        Notes
                    </label>

                    <textarea
                        id="notes"
                        value={guest.notes}
                        onChange={(event) =>
                            updateField(
                                "notes",
                                event.target.value
                            )
                        }
                        className="min-h-32 w-full rounded bg-zinc-900 p-4 outline-none ring-blue-600 focus:ring-2"
                        placeholder="Add notes about this guest..."
                    />
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-6 py-3 font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving
                        ? "Saving..."
                        : "Save Changes"}
                </button>
            </form>
        </main>
    );
=======


                <input
                    value={guest.name || ""}
                    onChange={(e) => setGuest({
                        ...guest,
                        name: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                    placeholder="Name"
                />



                <input
                    value={guest.phone || ""}
                    onChange={(e) => setGuest({
                        ...guest,
                        phone: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                    placeholder="Phone"
                />



                <input
                    value={guest.email || ""}
                    onChange={(e) => setGuest({
                        ...guest,
                        email: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                    placeholder="Email"
                />



                <input
                    value={guest.instagram || ""}
                    onChange={(e) => setGuest({
                        ...guest,
                        instagram: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                    placeholder="Instagram"
                />



                <select
                    value={guest.vip_level || "Regular"}
                    onChange={(e) => setGuest({
                        ...guest,
                        vip_level: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                >

                    <option>Regular</option>
                    <option>VIP</option>
                    <option>BLACK</option>

                </select>



                <select
                    value={guest.tag || "Regular"}
                    onChange={(e) => setGuest({
                        ...guest,
                        tag: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                >

                    <option>Regular</option>
                    <option>VIP</option>
                    <option>BLACK</option>
                    <option>Influencer</option>
                    <option>Birthday</option>
                    <option>Artist</option>

                </select>



                <input
                    type="date"
                    value={guest.birthday || ""}
                    onChange={(e) => setGuest({
                        ...guest,
                        birthday: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                />



                <textarea
                    value={guest.notes || ""}
                    onChange={(e) => setGuest({
                        ...guest,
                        notes: e.target.value
                    })}
                    className="w-full bg-zinc-900 p-4 rounded"
                    placeholder="Notes"
                />



                <button
                    type="submit"
                    className="bg-blue-600 px-6 py-3 rounded-lg"
                >
                    Save Changes
                </button>


            </form>


        </main>

    );

>>>>>>> e54d35691c981e006a0e0472c3b7e0afe90ab152
}