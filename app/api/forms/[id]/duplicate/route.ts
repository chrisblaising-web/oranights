import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function createSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase URL or service-role key."
    );
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

function cleanSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createUniqueSlug(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  originalSlug: string
) {
  const baseSlug = cleanSlug(
    `${originalSlug}-copy`
  );

  let candidate = baseSlug;
  let number = 2;

  while (true) {
    const { data, error } = await supabase
      .from("forms")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Slug check failed: ${error.message}`
      );
    }

    if (!data) {
      return candidate;
    }

    candidate = `${baseSlug}-${number}`;
    number += 1;
  }
}

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    const supabase = createSupabaseAdmin();

    const params = await context.params;
    const formId = Number(params.id);

    if (!Number.isInteger(formId) || formId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid form ID.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: originalForm,
      error: originalFormError,
    } = await supabase
      .from("forms")
      .select(
        `
          id,
          name,
          slug,
          form_type,
          title,
          description,
          image_url,
          success_message,
          submit_button_text,
          tags_to_apply
        `
      )
      .eq("id", formId)
      .maybeSingle();

    if (originalFormError) {
      throw new Error(
        `Unable to load original form: ${originalFormError.message}`
      );
    }

    if (!originalForm) {
      return NextResponse.json(
        {
          success: false,
          error: `Form ${formId} was not found.`,
        },
        {
          status: 404,
        }
      );
    }

    const {
      data: originalFields,
      error: originalFieldsError,
    } = await supabase
      .from("form_fields")
      .select(
        `
          field_key,
          label,
          field_type,
          placeholder,
          is_required,
          options,
          sort_order
        `
      )
      .eq("form_id", formId)
      .order("sort_order", {
        ascending: true,
      });

    if (originalFieldsError) {
      throw new Error(
        `Unable to load form fields: ${originalFieldsError.message}`
      );
    }

    const newSlug = await createUniqueSlug(
      supabase,
      originalForm.slug
    );

    const {
      data: duplicatedForm,
      error: duplicatedFormError,
    } = await supabase
      .from("forms")
      .insert({
        name: `${originalForm.name} Copy`,
        slug: newSlug,
        form_type:
          originalForm.form_type || "custom",
        title: originalForm.title,
        description:
          originalForm.description || null,
        image_url:
          originalForm.image_url || null,
        success_message:
          originalForm.success_message ||
          "Thank you. Your submission was received.",
        submit_button_text:
          originalForm.submit_button_text ||
          "Submit",
        tags_to_apply:
          Array.isArray(
            originalForm.tags_to_apply
          )
            ? originalForm.tags_to_apply
            : [],
        is_active: false,
      })
      .select("id,name,slug,is_active")
      .single();

    if (
      duplicatedFormError ||
      !duplicatedForm
    ) {
      throw new Error(
        `Unable to create form copy: ${duplicatedFormError?.message ||
        "Unknown database error"
        }`
      );
    }

    const copiedFields =
      (originalFields || []).map(
        (field, index) => ({
          form_id: duplicatedForm.id,
          field_key: field.field_key,
          label: field.label,
          field_type: field.field_type,
          placeholder:
            field.placeholder || null,
          is_required:
            field.is_required === true,
          options: field.options || null,
          sort_order:
            field.sort_order ?? index + 1,
        })
      );

    if (copiedFields.length > 0) {
      const { error: insertFieldsError } =
        await supabase
          .from("form_fields")
          .insert(copiedFields);

      if (insertFieldsError) {
        await supabase
          .from("forms")
          .delete()
          .eq("id", duplicatedForm.id);

        throw new Error(
          `Unable to copy form fields: ${insertFieldsError.message}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      form: duplicatedForm,
      copiedFields:
        copiedFields.length,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : JSON.stringify(error);

    console.error(
      "Duplicate form API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      {
        status: 500,
      }
    );
  }
}