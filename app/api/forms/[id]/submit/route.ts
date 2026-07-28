import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 25_000;
const MAX_FIELDS = 50;
const MAX_TEXT_LENGTH = 2_000;
const MAX_SOURCE_URL_LENGTH = 2_048;

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 100;

const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type FormRecord = {
  id: number;
  slug: string;
  title: string;
  is_active: boolean;
  tags_to_apply: string[] | null;
  success_message: string | null;
  event_id: number | null;
};

type EventRecord = {
  id: number;
  name: string;
  venue: string;
  address: string;
  event_date: string;
  dinner_time: string | null;
  club_time: string;
  timezone: string;
  dress_code: string | null;
  music: string | null;
  host_name: string | null;
  invitation_message: string | null;
  reminder_message: string | null;
  is_active: boolean;
};

type FormFieldRecord = {
  id: number;
  field_key: string;
  label: string;
  field_type:
  | "text"
  | "email"
  | "phone"
  | "date"
  | "textarea"
  | "select"
  | "checkbox";
  is_required: boolean;
  options: string[] | null;
};

type SubmissionBody = {
  data?: Record<string, unknown>;
  source_url?: string;

  /*
    Optional honeypot field.

    Real users should never fill this in.
    It can later be added as a hidden input.
  */
  website?: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<
  string,
  RateLimitEntry
>();

function createSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  extraHeaders?: Record<string, string>
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function cleanText(
  value: unknown,
  maxLength = MAX_TEXT_LENGTH
) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function normalizePhone(value: unknown) {
  const phone = cleanText(value, 40);

  if (!phone) {
    return "";
  }

  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return hasPlus ? `+${digits}` : digits;
}

function isValidEmail(email: string) {
  if (!email || email.length > 254) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  return (
    digits.length >= 7 &&
    digits.length <= 15
  );
}

const BLOCKED_WORDS = [
  "fuck",
  "fucker",
  "fucking",
  "shit",
  "bullshit",
  "bitch",
  "asshole",
  "motherfucker",
  "caca",
  "myass",
  "dick",
  "pussy",
  "whore",
  "slut",
  "nigger",
  "nigga",
  "pute",
  "salope",
  "connard",
  "connasse",
  "merde",
  "encule",
];

function normalizeForContentCheck(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsBlockedWords(value: string) {
  const normalized = normalizeForContentCheck(value);

  return BLOCKED_WORDS.some((word) => {
    const normalizedWord = normalizeForContentCheck(word);
    return normalized.includes(normalizedWord);
  });
}

function hasSuspiciousRepeatedCharacters(value: string) {
  return /(.)\1{4,}/i.test(value);
}

function hasTooManySymbols(value: string) {
  if (!value) {
    return false;
  }

  const symbols = value.match(/[^a-zA-ZÀ-ÿ0-9\s'@._+-]/g);

  return (
    (symbols?.length || 0) >
    Math.max(3, value.length * 0.25)
  );
}

function looksLikeRealName(value: string) {
  const name = value.trim();

  if (
    name.length < 2 ||
    name.length > 100
  ) {
    return false;
  }

  if (!/^[a-zA-ZÀ-ÿ' -]+$/.test(name)) {
    return false;
  }

  if (
    containsBlockedWords(name) ||
    hasSuspiciousRepeatedCharacters(name)
  ) {
    return false;
  }

  const letters = name.match(/[a-zA-ZÀ-ÿ]/g);

  return Boolean(letters && letters.length >= 2);
}

function looksLikeAcceptableFreeText(value: string) {
  const text = value.trim();

  if (!text) {
    return true;
  }

  if (
    containsBlockedWords(text) ||
    hasSuspiciousRepeatedCharacters(text) ||
    hasTooManySymbols(text)
  ) {
    return false;
  }

  return true;
}

function looksLikeInstagramUsername(value: string) {
  const username = value.trim().replace(/^@/, "");

  if (!username) {
    return true;
  }

  return /^[a-zA-Z0-9._]{1,30}$/.test(username);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime());
}

function isEmptyValue(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return true;
  }

  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return true;
  }

  if (typeof value === "boolean") {
    return value === false;
  }

  return false;
}

function getClientIp(request: Request) {
  const forwardedFor =
    request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return (
      forwardedFor.split(",")[0]?.trim() ||
      "unknown"
    );
  }

  return (
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(identifier: string) {
  const now = Date.now();
  const current =
    rateLimitStore.get(identifier);

  if (!current || current.resetAt <= now) {
    const resetAt =
      now + RATE_LIMIT_WINDOW_MS;

    rateLimitStore.set(identifier, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining:
        RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt,
    };
  }

  if (
    current.count >=
    RATE_LIMIT_MAX_REQUESTS
  ) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  rateLimitStore.set(identifier, current);

  return {
    allowed: true,
    remaining:
      RATE_LIMIT_MAX_REQUESTS -
      current.count,
    resetAt: current.resetAt,
  };
}

function cleanSourceUrl(value: unknown) {
  const sourceUrl = cleanText(
    value,
    MAX_SOURCE_URL_LENGTH
  );

  if (!sourceUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(sourceUrl);

    if (
      parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:"
    ) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function sanitizeFieldValue(
  field: FormFieldRecord,
  value: unknown
): unknown {
  if (field.field_type === "checkbox") {
    return value === true;
  }

  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return "";
  }

  const rawValue = String(value);

  switch (field.field_type) {
    case "email":
      return cleanText(
        rawValue,
        254
      ).toLowerCase();

    case "phone":
      return normalizePhone(rawValue);

    case "date":
      return cleanText(rawValue, 10);

    case "select": {
      const selectedValue = cleanText(
        rawValue,
        200
      );

      const allowedOptions = Array.isArray(
        field.options
      )
        ? field.options
        : [];

      if (
        selectedValue &&
        !allowedOptions.includes(selectedValue)
      ) {
        return "";
      }

      return selectedValue;
    }

    case "textarea":
      return cleanText(
        rawValue,
        MAX_TEXT_LENGTH
      );

    default:
      return cleanText(rawValue, 500);
  }
}



function formatEventDate(
  dateValue: string,
  timeZone: string
) {
  const date = new Date(
    `${dateValue}T12:00:00`
  );

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
    }
  ).format(date);
}

function formatEventTime(
  timeValue: string | null
) {
  if (!timeValue) {
    return "";
  }

  const [hourText, minuteText] =
    timeValue.split(":");

  const hour = Number(hourText);
  const minute = Number(minuteText);

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

function renderEventMessage(
  template: string,
  event: EventRecord
) {
  const values: Record<string, string> = {
    event_name: event.name || "",
    event_date: formatEventDate(
      event.event_date,
      event.timezone ||
      "America/Toronto"
    ),
    venue: event.venue || "",
    address: event.address || "",
    dinner_time: formatEventTime(
      event.dinner_time
    ),
    club_time: formatEventTime(
      event.club_time
    ),
    dress_code: event.dress_code || "",
    music: event.music || "",
    host_name: event.host_name || "",
  };

  return template.replace(
    /\{\{\s*([a-z_]+)\s*\}\}/gi,
    (_match, key: string) =>
      values[key.toLowerCase()] ?? ""
  );
}

function createTwilioClient() {
  const accountSid =
    process.env.TWILIO_ACCOUNT_SID;

  const authToken =
    process.env.TWILIO_AUTH_TOKEN;

  const fromNumber =
    process.env.TWILIO_PHONE_NUMBER;

  if (
    !accountSid ||
    !authToken ||
    !fromNumber
  ) {
    return null;
  }

  return {
    client: twilio(accountSid, authToken),
    fromNumber,
  };
}

function getTimeZoneOffsetMinutes(
  date: Date,
  timeZone: string
) {
  const formatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }
  );

  const parts = formatter.formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ])
  );

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return (asUtc - date.getTime()) / 60_000;
}

function eventDayNoonUtc(
  eventDate: string,
  timeZone: string
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      eventDate
    );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const approximateUtc = new Date(
    Date.UTC(year, month - 1, day, 12, 0, 0)
  );

  const offsetMinutes =
    getTimeZoneOffsetMinutes(
      approximateUtc,
      timeZone
    );

  return new Date(
    approximateUtc.getTime() -
    offsetMinutes * 60_000
  ).toISOString();
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  const clientIp = getClientIp(request);

  const rateLimit = checkRateLimit(
    `form-submission:${clientIp}`
  );

  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(
        (rateLimit.resetAt - Date.now()) /
        1000
      )
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Too many submissions. Please wait a few minutes and try again.",
      },
      429,
      {
        "Retry-After": String(
          retryAfterSeconds
        ),
        "X-RateLimit-Remaining": "0",
      }
    );
  }

  const contentType =
    request.headers.get("content-type") || "";

  if (
    !contentType
      .toLowerCase()
      .includes("application/json")
  ) {
    return jsonResponse(
      {
        success: false,
        error:
          "This endpoint only accepts JSON submissions.",
      },
      415
    );
  }

  const declaredContentLength = Number(
    request.headers.get("content-length") ||
    "0"
  );

  if (
    Number.isFinite(declaredContentLength) &&
    declaredContentLength >
    MAX_BODY_BYTES
  ) {
    return jsonResponse(
      {
        success: false,
        error:
          "The submitted form is too large.",
      },
      413
    );
  }

  const supabase = createSupabaseAdmin();

  if (!supabase) {
    console.error(
      "Missing Supabase server credentials."
    );

    return jsonResponse(
      {
        success: false,
        error:
          "The form service is temporarily unavailable.",
      },
      500
    );
  }

  try {
    const { id: rawSlug } =
      await context.params;

    const slug = cleanText(rawSlug, 150);

    if (
      !slug ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
        slug
      )
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid form link.",
        },
        400
      );
    }

    const rawBody = await request.text();

    const bodySize =
      new TextEncoder().encode(
        rawBody
      ).length;

    if (bodySize > MAX_BODY_BYTES) {
      return jsonResponse(
        {
          success: false,
          error:
            "The submitted form is too large.",
        },
        413
      );
    }

    let body: SubmissionBody;

    try {
      body = JSON.parse(
        rawBody
      ) as SubmissionBody;
    } catch {
      return jsonResponse(
        {
          success: false,
          error:
            "The submitted form data is invalid.",
        },
        400
      );
    }

    /*
      Honeypot protection.

      Bots commonly fill every input they find.
    */
    if (cleanText(body.website, 200)) {
      return jsonResponse(
        {
          success: true,
          success_message:
            "Thank you. Your submission was received.",
        },
        200
      );
    }

    const submittedData =
      body.data &&
        typeof body.data === "object" &&
        !Array.isArray(body.data)
        ? body.data
        : null;

    if (!submittedData) {
      return jsonResponse(
        {
          success: false,
          error:
            "No form information was submitted.",
        },
        400
      );
    }

    if (
      Object.keys(submittedData).length >
      MAX_FIELDS
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "The submission contains too many fields.",
        },
        400
      );
    }

    const {
      data: formData,
      error: formError,
    } = await supabase
      .from("forms")
      .select(
        `
          id,
          slug,
          title,
          is_active,
          tags_to_apply,
          success_message,
          event_id
        `
      )
      .eq("slug", slug)
      .maybeSingle();

    if (formError) {
      console.error(
        "Public form lookup error:",
        formError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "The form could not be loaded.",
        },
        500
      );
    }

    if (!formData) {
      return jsonResponse(
        {
          success: false,
          error: "Form not found.",
        },
        404
      );
    }

    const form = formData as FormRecord;

    if (!form.is_active) {
      return jsonResponse(
        {
          success: false,
          error:
            "This form is no longer accepting submissions.",
        },
        403
      );
    }

    const {
      data: fieldData,
      error: fieldsError,
    } = await supabase
      .from("form_fields")
      .select(
        `
          id,
          field_key,
          label,
          field_type,
          is_required,
          options
        `
      )
      .eq("form_id", form.id)
      .order("sort_order", {
        ascending: true,
      });

    if (fieldsError) {
      console.error(
        "Public form fields error:",
        fieldsError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "The form fields could not be loaded.",
        },
        500
      );
    }

    const fields =
      (fieldData as FormFieldRecord[]) ||
      [];

    if (fields.length > MAX_FIELDS) {
      return jsonResponse(
        {
          success: false,
          error:
            "This form contains too many fields.",
        },
        500
      );
    }

    const cleanSubmissionData:
      Record<string, unknown> = {};

    for (const field of fields) {
      cleanSubmissionData[field.field_key] =
        sanitizeFieldValue(
          field,
          submittedData[field.field_key]
        );
    }

    const missingField = fields.find(
      (field) =>
        field.is_required &&
        isEmptyValue(
          cleanSubmissionData[
          field.field_key
          ]
        )
    );

    if (missingField) {
      return jsonResponse(
        {
          success: false,
          error: `${missingField.label} is required.`,
          field_key:
            missingField.field_key,
        },
        400
      );
    }

    for (const field of fields) {
      const value = cleanSubmissionData[
        field.field_key
      ];

      if (
        isEmptyValue(value) &&
        !field.is_required
      ) {
        continue;
      }

      if (
        field.field_type === "email" &&
        typeof value === "string" &&
        !isValidEmail(value)
      ) {
        return jsonResponse(
          {
            success: false,
            error: `${field.label} must be a valid email address.`,
            field_key:
              field.field_key,
          },
          400
        );
      }

      if (
        field.field_type === "phone" &&
        typeof value === "string" &&
        !isValidPhone(value)
      ) {
        return jsonResponse(
          {
            success: false,
            error: `${field.label} must be a valid phone number.`,
            field_key:
              field.field_key,
          },
          400
        );
      }

      if (
        field.field_type === "date" &&
        typeof value === "string" &&
        !isValidDate(value)
      ) {
        return jsonResponse(
          {
            success: false,
            error: `${field.label} must be a valid date.`,
            field_key:
              field.field_key,
          },
          400
        );
      }
    }

    const name = cleanText(
      cleanSubmissionData.name,
      200
    );

    const phone = normalizePhone(
      cleanSubmissionData.phone
    );

    const email = cleanText(
      cleanSubmissionData.email,
      254
    ).toLowerCase();

    const instagram = cleanText(
      cleanSubmissionData.instagram,
      200
    );

    const birthday = cleanText(
      cleanSubmissionData.birthday,
      10
    );


    if (
      name &&
      !looksLikeRealName(name)
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Please enter a valid name.",
          field_key: "name",
        },
        400
      );
    }

    if (
      instagram &&
      !looksLikeInstagramUsername(instagram)
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Please enter a valid Instagram username.",
          field_key: "instagram",
        },
        400
      );
    }

    for (const field of fields) {
      if (
        field.field_type !== "text" &&
        field.field_type !== "textarea"
      ) {
        continue;
      }

      const value = cleanSubmissionData[field.field_key];

      if (
        typeof value === "string" &&
        !looksLikeAcceptableFreeText(value)
      ) {
        return jsonResponse(
          {
            success: false,
            error: `${field.label} contains invalid or inappropriate content.`,
            field_key: field.field_key,
          },
          400
        );
      }
    }

    let guestId: number | null = null;

    /*
      Search by phone first because it is usually
      the strongest identifier for SMS marketing.
    */
    if (phone) {
      const {
        data: guestByPhone,
        error: phoneSearchError,
      } = await supabase
        .from("guests")
        .select(
          "id,name,phone,email,instagram,birthday"
        )
        .eq("phone", phone)
        .maybeSingle();

      if (phoneSearchError) {
        console.error(
          "Guest phone search error:",
          phoneSearchError
        );
      }

      if (guestByPhone) {
        guestId = guestByPhone.id;

        const guestUpdates: Record<
          string,
          string
        > = {};

        if (name) {
          guestUpdates.name = name;
        }

        if (email) {
          guestUpdates.email = email;
        }

        if (instagram) {
          guestUpdates.instagram =
            instagram;
        }

        if (birthday) {
          guestUpdates.birthday =
            birthday;
        }

        if (
          Object.keys(guestUpdates).length >
          0
        ) {
          const {
            error: updateGuestError,
          } = await supabase
            .from("guests")
            .update(guestUpdates)
            .eq("id", guestId);

          if (updateGuestError) {
            console.error(
              "Guest update error:",
              updateGuestError
            );
          }
        }
      }
    }

    /*
      If no phone match was found, search by email.
    */
    if (!guestId && email) {
      const {
        data: guestByEmail,
        error: emailSearchError,
      } = await supabase
        .from("guests")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (emailSearchError) {
        console.error(
          "Guest email search error:",
          emailSearchError
        );
      }

      if (guestByEmail) {
        guestId = guestByEmail.id;
      }
    }

    /*
      Create a guest when no matching profile
      already exists.
    */
    if (
      !guestId &&
      (name || phone || email)
    ) {
      const guestPayload: Record<
        string,
        string
      > = {
        vip_level: "Regular",
        notes: `Submitted through form: ${form.title}`,
      };

      if (name) {
        guestPayload.name = name;
      }

      if (phone) {
        guestPayload.phone = phone;
      }

      if (email) {
        guestPayload.email = email;
      }

      if (instagram) {
        guestPayload.instagram =
          instagram;
      }

      if (birthday) {
        guestPayload.birthday =
          birthday;
      }

      const {
        data: createdGuest,
        error: createGuestError,
      } = await supabase
        .from("guests")
        .insert(guestPayload)
        .select("id")
        .single();

      if (createGuestError) {
        console.error(
          "Guest creation error:",
          createGuestError
        );
      } else if (createdGuest) {
        guestId = createdGuest.id;
      }
    }

    /*
      Block identical submissions made within
      the last two minutes.
    */
    const duplicateCutoff = new Date(
      Date.now() - DUPLICATE_WINDOW_MS
    ).toISOString();

    if (
      Object.keys(cleanSubmissionData)
        .length > 0
    ) {
      const {
        data: duplicateSubmission,
        error: duplicateError,
      } = await supabase
        .from("form_submissions")
        .select("id")
        .eq("form_id", form.id)
        .contains(
          "data",
          cleanSubmissionData
        )
        .gte(
          "created_at",
          duplicateCutoff
        )
        .limit(1)
        .maybeSingle();

      if (duplicateError) {
        console.error(
          "Duplicate submission check error:",
          duplicateError
        );
      }

      if (duplicateSubmission) {
        return jsonResponse(
          {
            success: false,
            error:
              "This submission was already received. Please wait before submitting it again.",
          },
          409
        );
      }
    }

    const userAgent = cleanText(
      request.headers.get("user-agent"),
      500
    );

    const sourceUrl =
      cleanSourceUrl(body.source_url) ||
      cleanSourceUrl(
        request.headers.get("referer")
      );

    const {
      data: submission,
      error: submissionError,
    } = await supabase
      .from("form_submissions")
      .insert({
        form_id: form.id,
        guest_id: guestId,
        data: cleanSubmissionData,
        source_url: sourceUrl,
        user_agent:
          userAgent || null,
      })
      .select(
        "id,form_id,guest_id,created_at"
      )
      .single();

    if (submissionError) {
      console.error(
        "Submission insert error:",
        submissionError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "The submission could not be saved.",
        },
        500
      );
    }

    const tags = Array.isArray(
      form.tags_to_apply
    )
      ? form.tags_to_apply
        .map((tag) =>
          cleanText(tag, 100)
        )
        .filter(Boolean)
        .slice(0, 20)
      : [];

    if (
      guestId &&
      tags.length > 0
    ) {
      const tagRows = tags.map(
        (tag) => ({
          guest_id: guestId,
          tag,
        })
      );

      const { error: tagError } =
        await supabase
          .from("guest_tags")
          .upsert(tagRows, {
            onConflict: "guest_id,tag",
            ignoreDuplicates: true,
          });

      if (tagError) {
        console.error(
          "Guest tag error:",
          tagError
        );
      }
    }


    /*
      Ora Night event workflow:
      create the guest-list entry, schedule the
      event-day reminder for noon, and send the
      invitation SMS immediately.
    */
    if (
      form.event_id &&
      guestId
    ) {
      const {
        data: eventData,
        error: eventError,
      } = await supabase
        .from("events")
        .select(
          `
            id,
            name,
            venue,
            address,
            event_date,
            dinner_time,
            club_time,
            timezone,
            dress_code,
            music,
            host_name,
            invitation_message,
            reminder_message,
            is_active
          `
        )
        .eq("id", form.event_id)
        .maybeSingle();

      if (eventError) {
        console.error(
          "Event workflow lookup error:",
          eventError
        );
      } else if (
        eventData &&
        eventData.is_active
      ) {
        const event =
          eventData as EventRecord;

        const reminderScheduledFor =
          eventDayNoonUtc(
            event.event_date,
            event.timezone ||
            "America/Toronto"
          );

        if (reminderScheduledFor) {
          const {
            data: existingEntry,
            error: existingEntryError,
          } = await supabase
            .from("guest_list_entries")
            .select(
              `
                id,
                invitation_status,
                invitation_sent_at,
                sms_opted_out
              `
            )
            .eq("event_id", event.id)
            .eq("guest_id", guestId)
            .maybeSingle();

          if (existingEntryError) {
            console.error(
              "Guest-list entry lookup error:",
              existingEntryError
            );
          }

          let guestListEntry =
            existingEntry;

          if (!guestListEntry) {
            const {
              data: createdEntry,
              error: entryError,
            } = await supabase
              .from("guest_list_entries")
              .insert({
                event_id: event.id,
                guest_id: guestId,
                form_submission_id:
                  submission.id,
                phone: phone || null,
                status: "confirmed",
                invitation_status:
                  "pending",
                reminder_scheduled_for:
                  reminderScheduledFor,
                reminder_status:
                  "pending",
                sms_opted_out: false,
              })
              .select(
                `
                  id,
                  invitation_status,
                  invitation_sent_at,
                  sms_opted_out
                `
              )
              .single();

            if (entryError) {
              console.error(
                "Guest-list entry creation error:",
                entryError
              );
            } else {
              guestListEntry =
                createdEntry;
            }
          }

          if (
            guestListEntry &&
            phone &&
            !guestListEntry.sms_opted_out &&
            !guestListEntry.invitation_sent_at &&
            guestListEntry.invitation_status !==
            "sent"
          ) {
            const twilioService =
              createTwilioClient();

            const invitationMessage =
              event.invitation_message
                ? renderEventMessage(
                  event.invitation_message,
                  event
                )
                : "";

            if (
              !twilioService ||
              !invitationMessage
            ) {
              await supabase
                .from("guest_list_entries")
                .update({
                  invitation_status:
                    "failed",
                  invitation_error:
                    !twilioService
                      ? "Twilio is not configured."
                      : "Invitation message is missing.",
                })
                .eq(
                  "id",
                  guestListEntry.id
                );
            } else {
              try {
                const statusCallback =
                  process.env
                    .TWILIO_STATUS_WEBHOOK_URL;

                const sentMessage =
                  await twilioService.client
                    .messages.create({
                      to: phone,
                      from:
                        twilioService.fromNumber,
                      body:
                        invitationMessage,
                      ...(statusCallback
                        ? {
                          statusCallback,
                        }
                        : {}),
                    });

                const sentAt =
                  new Date().toISOString();

                await supabase
                  .from("guest_list_entries")
                  .update({
                    invitation_status:
                      "sent",
                    invitation_sent_at:
                      sentAt,
                    invitation_twilio_sid:
                      sentMessage.sid,
                    invitation_error: null,
                  })
                  .eq(
                    "id",
                    guestListEntry.id
                  );

                await supabase
                  .from("sms_messages")
                  .insert({
                    guest_id: guestId,
                    guest_name:
                      name || null,
                    phone,
                    direction: "outbound",
                    message:
                      invitationMessage,
                    status:
                      sentMessage.status ||
                      "queued",
                    twilio_sid:
                      sentMessage.sid,
                    twilio_error_code:
                      null,
                    error_message: null,
                    is_read: true,
                    created_at: sentAt,
                    updated_at: sentAt,
                    delivered_at: null,
                  });
              } catch (smsError) {
                console.error(
                  "Invitation SMS error:",
                  smsError
                );

                await supabase
                  .from("guest_list_entries")
                  .update({
                    invitation_status:
                      "failed",
                    invitation_error:
                      smsError instanceof Error
                        ? smsError.message.slice(
                          0,
                          500
                        )
                        : "Unable to send invitation SMS.",
                  })
                  .eq(
                    "id",
                    guestListEntry.id
                  );
              }
            }
          }
        }
      }
    }

    return jsonResponse(
      {
        success: true,
        submission,
        guest_id: guestId,
        success_message:
          form.success_message ||
          "Thank you. Your submission was received.",
      },
      200,
      {
        "X-RateLimit-Remaining": String(
          rateLimit.remaining
        ),
      }
    );
  } catch (error) {
    console.error(
      "Public form submission error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "The submission could not be processed.",
      },
      500
    );
  }
}