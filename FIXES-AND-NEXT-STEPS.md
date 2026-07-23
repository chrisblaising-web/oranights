# ORA CRM review

## Fixed in this version

1. Guest deletion now checks whether Supabase actually deleted the row.
2. Supabase/RLS delete failures are shown instead of silently hiding the guest only in React state.
3. Added `supabase-fixes.sql` with the missing development DELETE policy, `tag` column, and `sms_logs` table.
4. SMS campaign name and audience are now sent to the API.
5. SMS sends are logged as `sent` or `failed` when `SUPABASE_SERVICE_ROLE_KEY` is configured.
6. SMS history is visible on the SMS page.
7. Tags are available when adding and editing a guest and are searchable in the guest list.
8. Supabase browser credentials now come from `.env.local` instead of being hardcoded in source code.
9. Added phone-format and required-field validation for SMS.

## Required setup

1. Open Supabase > SQL Editor.
2. Run the full contents of `supabase-fixes.sql` once.
3. Open Supabase > Project Settings > API.
4. Copy the service-role key into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`.
5. Never expose the service-role key in a variable beginning with `NEXT_PUBLIC_`.
6. Restart the Next.js dev server after changing `.env.local`.

## Important security note

The SQL file contains temporary anonymous development policies because employee authentication does not exist yet. Before production, replace them with `authenticated` employee policies and protect all dashboard routes.

## Next build phase

1. Employee login with Supabase Auth and protected dashboard routes.
2. Employee roles: owner, manager, host, promoter, read-only.
3. Public client form that writes only approved fields and prevents dashboard access.
4. Consent fields: SMS opt-in, source, consent date, unsubscribe status.
5. Real audience-based SMS campaigns with preview, recipient count, batching, and unsubscribe handling.
6. Reservations table and guest activity timeline.
7. Audit log recording which employee created, edited, deleted, or messaged a guest.
8. Replace the single `tag` field with a proper many-to-many tags system if guests need multiple tags.
