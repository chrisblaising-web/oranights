import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 50_000;
const MAX_FIELDS = 50;

const ALLOWED_FIELD_TYPES = new Set([
    "text",
    "email",
    "phone",
    "date",
    "textarea",
    "select",
    "checkbox",
]);

type FormFieldInput = {
    field_key: string;
    label: string;
    field_type: string;
    placeholder?: string;
    is_required?: boolean;
    options?: string[];
    sort_order?: number;
};

type CreateFormBody = {
    name?: string;
    slug?: string;
    form_type?: string;
    event_id?: number;
    title?: string;
    description?: string;
    success_message?: string;
    submit_button_text?: string;
    tags_to_apply?: string[];
    fields?: FormFieldInput[];
};

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

async function getAuthenticatedUser() {
    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return null;
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },

                setAll(cookiesToSet) {
                    try {
                        for (const {
                            name,
                            value,
                            options,
                        } of cookiesToSet) {
                            cookieStore.set(
                                name,
                                value,
                                options
                            );
                        }
                    } catch {
                        /*
                          Cookies may not always be writable
                          during every server execution context.
                        */
                    }
                },
            },
        }
    );

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return null;
    }

    return user;
}

function jsonResponse(
    body: Record<string, unknown>,
    status: number
) {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store",
        },
    });
}

function cleanText(
    value: unknown,
    maxLength: number
) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim().slice(0, maxLength);
}

function cleanSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 150);
}

function cleanFieldKey(value: string) {
    return cleanSlug(value)
        .replaceAll("-", "_")
        .slice(0, 100);
}

function cleanPositiveInteger(value: unknown) {
    const numberValue = Number(value);

    if (
        !Number.isInteger(numberValue) ||
        numberValue <= 0
    ) {
        return null;
    }

    return numberValue;
}

export async function POST(
    request: Request
) {
    const user = await getAuthenticatedUser();

    if (!user) {
        return jsonResponse(
            {
                success: false,
                error:
                    "You must be logged in to create forms.",
            },
            401
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
                    "This endpoint only accepts JSON.",
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
                    "The form request is too large.",
            },
            413
        );
    }

    const supabase = createSupabaseAdmin();

    if (!supabase) {
        console.error(
            "Missing Supabase service-role credentials."
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
                        "The form request is too large.",
                },
                413
            );
        }

        let body: CreateFormBody;

        try {
            body = JSON.parse(
                rawBody
            ) as CreateFormBody;
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

        const name = cleanText(
            body.name,
            150
        );

        const title = cleanText(
            body.title,
            200
        );

        const slug = cleanSlug(
            cleanText(body.slug, 150) ||
            name
        );

        const formType =
            cleanText(body.form_type, 50) ||
            "custom";

        const eventId =
            cleanPositiveInteger(
                body.event_id
            );

        const description =
            cleanText(body.description, 5_000) ||
            null;

        const successMessage =
            cleanText(
                body.success_message,
                1_000
            ) ||
            "Thank you. Your submission was received.";

        const submitButtonText =
            cleanText(
                body.submit_button_text,
                100
            ) || "Submit";

        const fields = Array.isArray(
            body.fields
        )
            ? body.fields
            : [];

        if (!name) {
            return jsonResponse(
                {
                    success: false,
                    error: "Form name is required.",
                },
                400
            );
        }

        if (!title) {
            return jsonResponse(
                {
                    success: false,
                    error:
                        "Public form title is required.",
                },
                400
            );
        }

        if (!slug) {
            return jsonResponse(
                {
                    success: false,
                    error:
                        "A valid form slug is required.",
                },
                400
            );
        }

        if (!eventId) {
            return jsonResponse(
                {
                    success: false,
                    error:
                        "Select a valid event for this form.",
                },
                400
            );
        }

        if (fields.length === 0) {
            return jsonResponse(
                {
                    success: false,
                    error:
                        "Add at least one field to the form.",
                },
                400
            );
        }

        if (fields.length > MAX_FIELDS) {
            return jsonResponse(
                {
                    success: false,
                    error:
                        "A form cannot contain more than 50 fields.",
                },
                400
            );
        }

        const fieldRows = fields.map(
            (field, index) => {
                const fieldKey = cleanFieldKey(
                    cleanText(
                        field.field_key,
                        100
                    )
                );

                const label = cleanText(
                    field.label,
                    200
                );

                const fieldType = cleanText(
                    field.field_type,
                    50
                ).toLowerCase();

                const placeholder =
                    cleanText(
                        field.placeholder,
                        300
                    ) || null;

                const options = Array.isArray(
                    field.options
                )
                    ? field.options
                        .map((option) =>
                            cleanText(option, 200)
                        )
                        .filter(Boolean)
                        .slice(0, 100)
                    : [];

                return {
                    form_id: 0,
                    field_key: fieldKey,
                    label,
                    field_type: fieldType,
                    placeholder,
                    is_required:
                        field.is_required === true,
                    options:
                        options.length > 0
                            ? options
                            : null,
                    sort_order:
                        Number.isInteger(
                            field.sort_order
                        ) &&
                            Number(field.sort_order) > 0
                            ? Number(field.sort_order)
                            : index + 1,
                };
            }
        );

        const invalidField =
            fieldRows.find(
                (field) =>
                    !field.field_key ||
                    !field.label ||
                    !ALLOWED_FIELD_TYPES.has(
                        field.field_type
                    )
            );

        if (invalidField) {
            return jsonResponse(
                {
                    success: false,
                    error:
                        "Every field needs a valid key, label and supported type.",
                },
                400
            );
        }

        const fieldKeys = fieldRows.map(
            (field) => field.field_key
        );

        const uniqueFieldKeys = new Set(
            fieldKeys
        );

        if (
            uniqueFieldKeys.size !==
            fieldKeys.length
        ) {
            return jsonResponse(
                {
                    success: false,
                    error:
                        "Each form field must have a unique key.",
                },
                400
            );
        }

        for (const field of fieldRows) {
            if (
                field.field_type === "select" &&
                (!field.options ||
                    field.options.length === 0)
            ) {
                return jsonResponse(
                    {
                        success: false,
                        error: `${field.label} needs at least one option.`,
                    },
                    400
                );
            }
        }

        const tagsToApply = Array.isArray(
            body.tags_to_apply
        )
            ? body.tags_to_apply
                .map((tag) =>
                    cleanText(tag, 100)
                )
                .filter(Boolean)
                .slice(0, 20)
            : [];

        const {
            data: selectedEvent,
            error: selectedEventError,
        } = await supabase
            .from("events")
            .select(
                "id,name,is_active"
            )
            .eq("id", eventId)
            .maybeSingle();

        if (selectedEventError) {
            console.error(
                "Selected event lookup error:",
                selectedEventError
            );

            return jsonResponse(
                {
                    success: false,
                    error:
                        "The selected event could not be verified.",
                },
                500
            );
        }

        if (!selectedEvent) {
            return jsonResponse(
                {
                    success: false,
                    error:
                        "The selected event does not exist.",
                },
                404
            );
        }

        const {
            data: existingForm,
            error: existingFormError,
        } = await supabase
            .from("forms")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();

        if (existingFormError) {
            console.error(
                "Form slug lookup error:",
                existingFormError
            );

            return jsonResponse(
                {
                    success: false,
                    error:
                        "The form slug could not be checked.",
                },
                500
            );
        }

        if (existingForm) {
            return jsonResponse(
                {
                    success: false,
                    error:
                        "That form URL is already being used.",
                },
                409
            );
        }

        const {
            data: form,
            error: formError,
        } = await supabase
            .from("forms")
            .insert({
                name,
                slug,
                form_type: formType,
                event_id: eventId,
                title,
                description,
                success_message:
                    successMessage,
                submit_button_text:
                    submitButtonText,
                tags_to_apply: tagsToApply,
                is_active: true,
            })
            .select(
                "id,name,slug,form_type,title,event_id"
            )
            .single();

        if (formError || !form) {
            console.error(
                "Form creation error:",
                formError
            );

            return jsonResponse(
                {
                    success: false,
                    error:
                        formError?.code === "23505"
                            ? "That form URL is already being used."
                            : "The form could not be created.",
                },
                formError?.code === "23505"
                    ? 409
                    : 500
            );
        }

        const finalFieldRows =
            fieldRows.map((field) => ({
                ...field,
                form_id: form.id,
            }));

        const { error: fieldsError } =
            await supabase
                .from("form_fields")
                .insert(finalFieldRows);

        if (fieldsError) {
            console.error(
                "Form fields creation error:",
                fieldsError
            );

            await supabase
                .from("forms")
                .delete()
                .eq("id", form.id);

            return jsonResponse(
                {
                    success: false,
                    error:
                        "The form fields could not be created.",
                },
                500
            );
        }

        return jsonResponse(
            {
                success: true,
                form,
            },
            201
        );
    } catch (error) {
        console.error(
            "Create form API error:",
            error
        );

        return jsonResponse(
            {
                success: false,
                error:
                    "The form could not be created.",
            },
            500
        );
    }
}