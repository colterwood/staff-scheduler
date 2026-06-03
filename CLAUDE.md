# MacKenzie Staff Scheduler — Project Context

## What This Is
A staff scheduling web app for the **MacKenzie Art Gallery gift shop** (retail, Regina SK).
- **5–10 staff members**, mix of students and retirees (wide age range — UX must be simple)
- Staff enter monthly availability and time-off requests
- AI generates a proposed schedule; manager approves and publishes it
- Staff view their confirmed shifts and can offer shifts to others (Phase 7)

---

## Tech Stack
| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database + Auth | Supabase (Postgres + RLS + Auth) |
| Styling | Tailwind CSS v4 |
| Deployment | Vercel (auto-deploys from GitHub on push to `main`) |
| Date utils | date-fns v4 |

**Repository:** `https://github.com/colterwood/staff-scheduler`
**Live URL:** `https://staff-scheduler-neon.vercel.app`

---

## Environment Variables
Required in `.env.local` (and in Vercel dashboard):
```
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=        # Supabase service role key (server-side only)
```
The service role key is used in `app/utils/supabase/admin.ts` for operations that bypass RLS (invite flow, admin editing staff availability).

---

## Brand Colors (MacKenzie Art Gallery)
- **Background:** `#FBD9DC` (blush pink)
- **Primary accent:** `#E5003B` (crimson red)
- **Hover/darker accent:** `#C5002E`
- **Body text:** `#1A1A1A`
Exact hex codes to be confirmed with official brand guide — these were eyeballed from the website.

---

## Supabase Project Notes
- The original project from the ChatGPT-era codebase expired; a new project was created
- The service role key and anon key MUST be from the same Supabase project
- Supabase Site URL: `https://staff-scheduler-neon.vercel.app`
- Redirect URLs: `https://staff-scheduler-neon.vercel.app/**`

---

## Key Architecture Decisions

### Auth & Routing
- `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`) handles session refresh + route protection
- Route groups: `app/(staff)/` for staff pages, `app/admin/` for admin pages
- Role check is in both the proxy and each layout (defense in depth)
- `app/page.tsx` redirects to `/dashboard` (staff) or `/admin/dashboard` (admin) based on DB role

### Supabase Clients
- `app/utils/supabase/client.ts` — browser client (client components)
- `app/utils/supabase/server.ts` — server client (server components, layouts)
- `app/utils/supabase/admin.ts` — service role client (bypasses RLS; server-side only)

### Invite Flow
1. Admin goes to `/admin/staff` → generates invite link (writes to `invitations` table)
2. Admin copies and sends the link manually (email integration is Phase 6)
3. Staff opens `/invite/[token]` → enters name + password → account created
4. Supabase sends a confirmation email; staff confirms, then logs in
5. A DB trigger (`handle_new_user`) auto-creates `staff_profiles` on signup

### Availability Model (two-layer)
- **Layer 1 — Weekly pattern** (`weekly_availability` table): Staff sets their typical weekly availability in their Profile. Stored per day-of-week with a `slots` JSONB array (`[{from: "09:00", to: "13:45"}, {from: "15:15", to: "21:00"}]`). Supports multiple windows per day.
- **Layer 2 — Monthly submission** (`availability_submissions` + `availability_days`): Staff opens the Availability page, picks a month, clicks "Apply my weekly pattern" to pre-fill, then adjusts individual days. Each day also supports multiple time slots. Staff submit when done (locked after submission).
- **Time-off requests** are separate from availability (require manager approval)

### Schedule Generation (not yet built — Phase 4)
Plan: Use the Claude API to generate the schedule. Pass structured data (all shifts to fill, each staff member's availability, priority ranks, min/max constraints, incompatibility rules) and receive a JSON schedule back. Manager reviews and approves.

---

## Database Schema (Supabase)

### Tables
```
staff_profiles        — extends auth.users; role ('staff'|'admin'), priority_rank (1-10), notify_email, notify_sms
invitations           — token-based invite links; expires_at, accepted_at
weekly_availability   — staff's standing weekly pattern; day_of_week (0=Sun), slots JSONB [{from, to}]
availability_submissions — one per staff per month; preferred_shifts_per_week, is_submitted
availability_days     — per-day entries within a submission; slots JSONB [{from, to}], is_unavailable
time_off_requests     — date + reason; status (pending/approved/denied)
monthly_configs       — manager's monthly setup; status (draft/pending_approval/approved/published)
weekly_shift_templates — default shifts per day-of-week for a monthly config
template_shifts       — individual shifts within a weekly template; start_time, end_time, slots_needed
date_shift_overrides  — date-specific override replacing the weekly template
override_shifts       — individual shifts within a date override
staff_scheduling_rules — manager-set min/max shifts per staff member
staff_incompatibilities — pairs to avoid scheduling together; severity (prefer_avoid/never)
scheduled_shifts      — generated schedule output; status (draft/confirmed/available_for_swap)
notification_log      — audit trail of sent emails/SMS
```

### Key RLS Pattern
```sql
-- Helper function defined AFTER staff_profiles table
CREATE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM staff_profiles WHERE user_id = auth.uid() AND role = 'admin');
$$;

-- Most tables: own data OR admin
CREATE POLICY "..." ON table FOR ALL USING (
  staff_id = (SELECT id FROM staff_profiles WHERE user_id = auth.uid()) OR is_admin()
);
```

### Trigger
```sql
-- Auto-creates staff_profiles when a user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
-- Reads full_name and role from raw_user_meta_data
```

### Schema Migration Applied
The `available_from`/`available_to` columns were replaced with a `slots JSONB` column on both `weekly_availability` and `availability_days` to support multiple time windows per day.

---

## File Structure (key files)
```
proxy.ts                              # Route protection (Next.js 16 middleware)
supabase/schema.sql                   # Full DB schema — run this in Supabase SQL editor
app/
  layout.tsx                          # Root layout; metadata title = "MacKenzie Staff Scheduler"
  page.tsx                            # Role-based redirect (→ /dashboard or /admin/dashboard)
  globals.css                         # Brand colors as CSS variables
  login/page.tsx
  invite/[token]/
    page.tsx                          # Server: validates token, renders form
    AcceptForm.tsx                    # Client: name + password form
    actions.ts                        # Server action: creates auth user + marks invite used
  (staff)/
    layout.tsx                        # Auth check + staff role check + NavBar
    dashboard/page.tsx
    profile/
      page.tsx                        # Fetches staff_profiles + weekly_availability
      ProfileForm.tsx                 # Client: contact info + multi-slot weekly availability
      actions.ts                      # saveProfile (contact + weekly availability)
    availability/
      page.tsx                        # Fetches weekly pattern + submissions + saved days
      AvailabilityCalendar.tsx        # Client: month picker + calendar grid + multi-slot
      actions.ts                      # saveAvailability, submitAvailability
    schedule/page.tsx                 # Placeholder
    days-off/page.tsx                 # Placeholder
  admin/
    layout.tsx                        # Auth check + admin role check + AdminNavBar
    dashboard/page.tsx                # Shows staff count, pending time-off count
    staff/
      page.tsx                        # Staff list + pending invites + InviteForm
      InviteForm.tsx                  # Client: generate invite link
      actions.ts                      # createInvitation, revokeInvitation
      [staffId]/
        page.tsx                      # Staff detail: info + availability editor
        StaffAvailabilityEditor.tsx   # Client: admin edits staff weekly + monthly availability
        actions.ts                    # adminSaveWeeklyAvailability, adminSaveAvailability
    templates/page.tsx                # Placeholder (Phase 3)
    time-off/page.tsx                 # Placeholder (Phase 3)
    schedule/page.tsx                 # Placeholder (Phase 4)
components/
  NavBar.tsx                          # Staff nav (Dashboard, Schedule, Availability, Days Off, Profile, Log out)
  AdminNavBar.tsx                     # Admin nav (Dashboard, Staff, Shift Templates, Time Off, Schedule, Log out)
app/utils/supabase/
  client.ts                           # Browser Supabase client
  server.ts                           # Server Supabase client
  admin.ts                            # Service role client (bypasses RLS)
lib/supabaseClient.ts                 # Legacy — unused, can be deleted
```

---

## Build & Deploy
```bash
npm run dev        # Local dev at localhost:3000
npm run build      # Production build (must pass before pushing)
git push           # Auto-triggers Vercel deployment
```
TypeScript check: `npx tsc --noEmit`

**Important:** PowerShell on this machine is Windows PowerShell 5.1 — `-Raw` and `-Encoding utf8` flags on Get-Content/Set-Content don't work. Use `[System.IO.File]::ReadAllText` / `WriteAllText` for file manipulation scripts. Bulk text replacement has previously corrupted Unicode characters (em-dash, arrows) — use HTML entities (`&rarr;`, `—`) in JSX instead of raw Unicode where this matters.

---

## What's Built (Phase 1 + 2 complete)
- ✅ Full DB schema with RLS
- ✅ Supabase auth (email + password)
- ✅ Role-based routing (staff / admin)
- ✅ Invite + onboarding flow
- ✅ Staff profile (contact info + multi-slot weekly availability — saves to DB)
- ✅ Monthly availability calendar (multi-slot per day, apply weekly pattern, save draft, submit)
- ✅ Admin dashboard (staff count, pending time-off count)
- ✅ Admin staff list + invite generation
- ✅ Admin staff detail page (edit any staff member's weekly + monthly availability)
- ✅ Logout on both navbars

## What's Not Built Yet
- ⬜ **Phase 3:** Time-off request form (staff), approve/deny UI (admin), shift template builder (admin)
- ⬜ **Phase 4:** AI schedule generation (Claude API), manager approval workflow
- ⬜ **Phase 5:** Published schedule view for staff (upcoming shifts page)
- ⬜ **Phase 6:** Email/SMS notifications (Resend for email, Twilio for SMS) — 30-day availability reminders, schedule published alerts
- ⬜ **Phase 7:** Shift swap marketplace (staff offers shift, others request it, manager approves)
- ⬜ Staff profile: preferred days/shifts count not yet wired to DB (schema has preferred_shifts_per_week on availability_submissions — that's handled; preferred days would need thought)
- ⬜ Admin: staff priority rank editing, min/max shifts per staff, incompatibility rules UI
- ⬜ Mobile-friendly availability calendar (currently `hidden md:grid` — desktop only)
- ⬜ Custom domain

## Next Logical Steps
1. **Days Off page** — time-off request form for staff + approval UI for admin
2. **Shift Template builder** — admin enters the monthly shift schedule (weekly defaults + date overrides)
3. **Schedule generation** — Claude API integration
4. **Email notifications** — Resend integration for availability reminders
