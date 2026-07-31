"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Guest = {
  id: number;
  created_at?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  gender?: string | null;
  vip_level?: string | null;
  tag?: string | null;
  notes?: string | null;
};

type StatusMessage = {
  type: "success" | "error";
  message: string;
} | null;

export default function GuestSearch({
  guests = [],
}: {
  guests?: Guest[];
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [guestList, setGuestList] = useState<Guest[]>(guests);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingGenderId, setUpdatingGenderId] = useState<number | null>(
    null
  );
  const [updatingVipId, setUpdatingVipId] = useState<number | null>(null);
  const [updatingTagId, setUpdatingTagId] = useState<number | null>(null);
  const [status, setStatus] = useState<StatusMessage>(null);

  const filteredGuests = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return guestList;
    }

    return guestList.filter((guest) =>
      [
        guest.name,
        guest.phone,
        guest.email,
        guest.instagram,
        guest.gender,
        guest.vip_level,
        guest.tag,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [guestList, search]);

  async function updateGuestGender(
    guest: Guest,
    newGender: string
  ) {
    if (updatingGenderId !== null) {
      return;
    }

    setStatus(null);
    setUpdatingGenderId(guest.id);

    const previousGender = guest.gender ?? null;
    const genderValue = newGender || null;

    setGuestList((currentGuests) =>
      currentGuests.map((currentGuest) =>
        currentGuest.id === guest.id
          ? {
            ...currentGuest,
            gender: genderValue,
          }
          : currentGuest
      )
    );

    try {
      const { data: updatedGuest, error } = await supabase
        .from("guests")
        .update({
          gender: genderValue,
        })
        .eq("id", guest.id)
        .select("id, gender")
        .single();

      if (error) {
        throw new Error(
          `Could not update gender: ${error.message}`
        );
      }

      if (!updatedGuest) {
        throw new Error(
          "Supabase did not return the updated guest."
        );
      }

      setGuestList((currentGuests) =>
        currentGuests.map((currentGuest) =>
          currentGuest.id === guest.id
            ? {
              ...currentGuest,
              gender: updatedGuest.gender,
            }
            : currentGuest
        )
      );

      const guestName =
        guest.name?.trim() || `Guest #${guest.id}`;

      setStatus({
        type: "success",
        message: `${guestName}'s gender was updated to ${updatedGuest.gender || "Not set"
          }.`,
      });

      router.refresh();
    } catch (error) {
      setGuestList((currentGuests) =>
        currentGuests.map((currentGuest) =>
          currentGuest.id === guest.id
            ? {
              ...currentGuest,
              gender: previousGender,
            }
            : currentGuest
        )
      );

      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      console.error("Update guest gender error:", error);

      setStatus({
        type: "error",
        message,
      });
    } finally {
      setUpdatingGenderId(null);
    }
  }

  async function updateGuestVip(guest: Guest, newVipLevel: string) {
    if (updatingVipId !== null) {
      return;
    }

    setStatus(null);
    setUpdatingVipId(guest.id);

    const previousVipLevel = guest.vip_level ?? null;
    const vipValue = newVipLevel || "Regular";

    setGuestList((currentGuests) =>
      currentGuests.map((currentGuest) =>
        currentGuest.id === guest.id
          ? { ...currentGuest, vip_level: vipValue }
          : currentGuest
      )
    );

    try {
      const { data: updatedGuest, error } = await supabase
        .from("guests")
        .update({ vip_level: vipValue })
        .eq("id", guest.id)
        .select("id, vip_level")
        .single();

      if (error) {
        throw new Error(`Could not update VIP level: ${error.message}`);
      }

      if (!updatedGuest) {
        throw new Error("Supabase did not return the updated guest.");
      }

      setGuestList((currentGuests) =>
        currentGuests.map((currentGuest) =>
          currentGuest.id === guest.id
            ? { ...currentGuest, vip_level: updatedGuest.vip_level }
            : currentGuest
        )
      );

      const guestName = guest.name?.trim() || `Guest #${guest.id}`;

      setStatus({
        type: "success",
        message: `${guestName}'s VIP level was updated to ${updatedGuest.vip_level || "Regular"
          }.`,
      });

      router.refresh();
    } catch (error) {
      setGuestList((currentGuests) =>
        currentGuests.map((currentGuest) =>
          currentGuest.id === guest.id
            ? { ...currentGuest, vip_level: previousVipLevel }
            : currentGuest
        )
      );

      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      console.error("Update guest VIP error:", error);

      setStatus({
        type: "error",
        message,
      });
    } finally {
      setUpdatingVipId(null);
    }
  }

  async function updateGuestTag(guest: Guest, newTag: string) {
    if (updatingTagId !== null) {
      return;
    }

    setStatus(null);
    setUpdatingTagId(guest.id);

    const previousTag = guest.tag ?? null;
    const tagValue = newTag || "Regular";

    setGuestList((currentGuests) =>
      currentGuests.map((currentGuest) =>
        currentGuest.id === guest.id
          ? { ...currentGuest, tag: tagValue }
          : currentGuest
      )
    );

    try {
      const { data: updatedGuest, error } = await supabase
        .from("guests")
        .update({ tag: tagValue })
        .eq("id", guest.id)
        .select("id, tag")
        .single();

      if (error) {
        throw new Error(`Could not update tag: ${error.message}`);
      }

      if (!updatedGuest) {
        throw new Error("Supabase did not return the updated guest.");
      }

      setGuestList((currentGuests) =>
        currentGuests.map((currentGuest) =>
          currentGuest.id === guest.id
            ? { ...currentGuest, tag: updatedGuest.tag }
            : currentGuest
        )
      );

      const guestName = guest.name?.trim() || `Guest #${guest.id}`;

      setStatus({
        type: "success",
        message: `${guestName}'s tag was updated to ${updatedGuest.tag || "Regular"}.`,
      });

      router.refresh();
    } catch (error) {
      setGuestList((currentGuests) =>
        currentGuests.map((currentGuest) =>
          currentGuest.id === guest.id
            ? { ...currentGuest, tag: previousTag }
            : currentGuest
        )
      );

      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      console.error("Update guest tag error:", error);

      setStatus({
        type: "error",
        message,
      });
    } finally {
      setUpdatingTagId(null);
    }
  }

  async function deleteGuest(guest: Guest) {
    if (deletingId !== null) {
      return;
    }

    setStatus(null);

    const guestName =
      guest.name?.trim() || `Guest #${guest.id}`;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${guestName}?\n\nThe guest will first be copied into guests_backup.`
    );

    if (!confirmed) {
      return;
    }

    const confirmationText = window.prompt(
      `Type DELETE to remove ${guestName} from the active guest list.`
    );

    if (confirmationText !== "DELETE") {
      setStatus({
        type: "error",
        message:
          "Deletion cancelled. You must type DELETE exactly.",
      });

      return;
    }

    setDeletingId(guest.id);

    try {
      const {
        data: fullGuest,
        error: loadError,
      } = await supabase
        .from("guests")
        .select("*")
        .eq("id", guest.id)
        .single();

      if (loadError) {
        throw new Error(
          `Could not load guest: ${loadError.message}`
        );
      }

      if (!fullGuest) {
        throw new Error(
          "The guest no longer exists in the guests table."
        );
      }

      const {
        data: existingBackup,
        error: backupCheckError,
      } = await supabase
        .from("guests_backup")
        .select("id")
        .eq("id", guest.id)
        .maybeSingle();

      if (backupCheckError) {
        throw new Error(
          `Could not check the backup table: ${backupCheckError.message}`
        );
      }

      if (!existingBackup) {
        const { error: backupError } = await supabase
          .from("guests_backup")
          .insert([fullGuest]);

        if (backupError) {
          throw new Error(
            `Backup failed. The guest was not deleted. ${backupError.message}`
          );
        }
      }

      const {
        data: deletedGuest,
        error: deleteError,
      } = await supabase
        .from("guests")
        .delete()
        .eq("id", guest.id)
        .select("id")
        .single();

      if (deleteError) {
        throw new Error(
          `Delete failed: ${deleteError.message}`
        );
      }

      if (!deletedGuest) {
        throw new Error(
          "Supabase did not delete the guest."
        );
      }

      setGuestList((currentGuests) =>
        currentGuests.filter(
          (currentGuest) =>
            currentGuest.id !== guest.id
        )
      );

      setStatus({
        type: "success",
        message: `${guestName} was backed up and removed from the active guest list.`,
      });

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";

      console.error("Delete guest error:", error);

      setStatus({
        type: "error",
        message,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <input
        type="search"
        value={search}
        placeholder="Search by name, phone, email, gender, Instagram, VIP or tag..."
        onChange={(event) =>
          setSearch(event.target.value)
        }
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-white outline-none transition focus:border-zinc-500"
      />

      {status && (
        <div
          className={`mt-4 rounded-lg border p-4 text-sm ${status.type === "success"
            ? "border-green-800 bg-green-950/50 text-green-200"
            : "border-red-800 bg-red-950/50 text-red-200"
            }`}
        >
          {status.message}
        </div>
      )}

      <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b border-zinc-700 text-left">
              <th className="p-5">Name</th>
              <th className="p-5">Phone</th>
              <th className="p-5">Email</th>
              <th className="p-5">Gender</th>
              <th className="p-5">VIP Level</th>
              <th className="p-5">Tag</th>
              <th className="p-5">Instagram</th>
              <th className="p-5">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredGuests.map((guest) => {
              const isDeleting =
                deletingId === guest.id;

              const isUpdatingGender =
                updatingGenderId === guest.id;

              const isUpdatingVip =
                updatingVipId === guest.id;

              const isUpdatingTag =
                updatingTagId === guest.id;

              return (
                <tr
                  key={guest.id}
                  className="border-b border-zinc-800 last:border-b-0"
                >
                  <td className="p-5">
                    {guest.name || "-"}
                  </td>

                  <td className="p-5">
                    {guest.phone || "-"}
                  </td>

                  <td className="p-5">
                    {guest.email || "-"}
                  </td>

                  <td className="p-5">
                    <div className="flex min-w-[130px] flex-col gap-1">
                      <select
                        value={guest.gender ?? ""}
                        onChange={(event) =>
                          updateGuestGender(
                            guest,
                            event.target.value
                          )
                        }
                        disabled={
                          isUpdatingGender ||
                          deletingId !== null
                        }
                        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">
                          Not set
                        </option>

                        <option value="Male">
                          Male
                        </option>

                        <option value="Female">
                          Female
                        </option>
                      </select>

                      {isUpdatingGender && (
                        <span className="text-xs text-zinc-400">
                          Saving...
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-5">
                    <div className="flex min-w-[130px] flex-col gap-1">
                      <select
                        value={guest.vip_level ?? "Regular"}
                        onChange={(event) =>
                          updateGuestVip(guest, event.target.value)
                        }
                        disabled={
                          isUpdatingVip ||
                          deletingId !== null
                        }
                        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Regular">Regular</option>
                        <option value="VIP">VIP</option>
                        <option value="VVIP">VVIP</option>
                      </select>

                      {isUpdatingVip && (
                        <span className="text-xs text-zinc-400">
                          Saving...
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-5">
                    <div className="flex min-w-[140px] flex-col gap-1">
                      <select
                        value={guest.tag ?? "Regular"}
                        onChange={(event) =>
                          updateGuestTag(guest, event.target.value)
                        }
                        disabled={
                          isUpdatingTag ||
                          deletingId !== null
                        }
                        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Regular">Regular</option>
                        <option value="Host">Host</option>
                        <option value="Promoter">Promoter</option>
                        <option value="Influencer">Influencer</option>
                        <option value="Artist">Artist</option>
                        <option value="Birthday">Birthday</option>
                        <option value="Temp">Temp</option>
                      </select>

                      {isUpdatingTag && (
                        <span className="text-xs text-zinc-400">
                          Saving...
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-5">
                    {guest.instagram
                      ? `@${guest.instagram.replace(/^@/, "")}`
                      : "-"}
                  </td>

                  <td className="p-5">
                    <div className="flex gap-2">
                      <Link
                        href={`/guests/${guest.id}`}
                        className="rounded bg-zinc-700 px-3 py-2 transition hover:bg-zinc-600"
                      >
                        View
                      </Link>

                      <Link
                        href={`/guests/${guest.id}/edit`}
                        className="rounded bg-blue-600 px-3 py-2 transition hover:bg-blue-500"
                      >
                        Edit
                      </Link>

                      <button
                        type="button"
                        onClick={() => deleteGuest(guest)}
                        disabled={
                          deletingId !== null ||
                          updatingGenderId !== null ||
                          updatingVipId !== null ||
                          updatingTagId !== null
                        }
                        className="rounded bg-red-600 px-3 py-2 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting
                          ? "Backing up..."
                          : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredGuests.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-zinc-500"
                >
                  No guests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}