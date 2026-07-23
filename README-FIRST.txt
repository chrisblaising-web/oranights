ORA CRM - LINKED SMS VERSION

DO NOT replace your .env.local file.

1. Back up your current project.
2. Copy these project files over your stable project.
3. In Supabase SQL Editor, open SUPABASE_SMS_CAMPAIGN_LINK.sql, copy ALL its contents, and click Run.
4. In PowerShell inside the folder containing package.json:
   npm install
   npm run dev

TEST
1. Open /sms.
2. Select one saved guest and send a test campaign.
3. Confirm one row appears in sms_campaigns.
4. Confirm one row appears in sms_logs with BOTH campaign_id and guest_id.
5. Open that guest profile. The SMS should appear in SMS History.

FILES INTENTIONALLY CHANGED
- app/api/send-sms/route.ts
- app/api/twilio/status/route.ts (new)
- app/sms/page.tsx
- app/guests/[id]/page.tsx
- app/dashboard/page.tsx
- app/reservations/page.tsx (existing TypeScript mismatch repaired)
- SUPABASE_SMS_CAMPAIGN_LINK.sql (new)
- CHANGES-MADE.txt (new)

EXTERNAL EMBED FORM
This is the next phase and is not mixed into this SMS patch. It should include:
- form_templates table
- form_fields table or JSON field configuration
- public /forms/[slug] page
- secure server-side submission API
- source, consent, and form ID saved on each guest
- embed code generator using an iframe
