# Zulim Email Reminders (free, runs on GitHub Actions)

Sends your workout/water/walk/pushup reminders automatically on a
schedule. No server to keep running — GitHub runs it for you for free.

## What gets sent (all to BOTH of you)
- 6:30am — water kickoff
- 8am / 12pm / 4pm / 8pm — water + eat-to-satisfaction
- 10am — daily 3-mile walk
- 6pm — daily pushups (auto-counts your week: 5→10→20→25→…cap 40)
- Mon/Tue/Wed/Fri 6am & 4pm — gym-day focus
- Sunday 6pm — weekly recap nudge
- 1st of month 8am — monthly 5-lb check-in

## One-time setup (~10 min, no terminal)

### 1. Get a Resend API key (free)
- Sign up at https://resend.com
- Dashboard → API Keys → Create. Copy the key (starts with `re_`).
- IMPORTANT: on the free test sender, Resend can only email the
  address you SIGNED UP with. So to start, both of you will get the
  emails at YOUR inbox. To email Zulim's separate address, you'll
  later verify a domain (see "Phase 2" below).

### 2. Put these files in a GitHub repo
- Make a new repo (e.g. `zulim-reminders`).
- Upload `send.js` and the `.github` folder (with workflows/send.yml
  inside it). Keep the folder structure exactly.

### 3. Add your settings as repository "Secrets"
In the repo: Settings → Secrets and variables → Actions → New
repository secret. Add each of these:

| Name             | Value                                             |
|------------------|---------------------------------------------------|
| RESEND_API_KEY   | your re_... key                                   |
| FROM             | Zulim Workouts <onboarding@resend.dev>            |
| EMAIL_CHRISTIAN  | your email (the one you signed up to Resend with) |
| EMAIL_ZULIM      | for now, put YOUR email again (same as above)     |
| TZ_OFFSET        | -6   (Central Time. Eastern=-5, Mountain=-7, Pacific=-8) |
| PROGRAM_START    | the Monday you START, e.g. 2026-06-01             |

### 4. Turn it on & test
- Go to the repo's **Actions** tab. If prompted, click to enable
  workflows.
- Click "Zulim Reminders" → "Run workflow" (the manual button) to
  fire a test run right now. Check your inbox.
- After that, it runs automatically every 2 hours and sends whatever
  is due for that time.

## Phase 2 — email Zulim's own inbox
1. Buy a cheap domain (~$12/yr at Namecheap, Cloudflare, etc.)
2. In Resend → Domains → add it, and add the DNS records they show
   you (copy-paste into your domain registrar). Wait for "verified."
3. Change the FROM secret to use your domain, e.g.
   `Zulim Workouts <reminders@yourdomain.com>`
4. Change EMAIL_ZULIM to her real address. Done — shared emails now
   reach both inboxes.

## Adjusting times or messages
Open `send.js`. Each reminder is an `if (hour === ...)` block with
its subject and text. Change the hour numbers or wording, commit, and
the next run uses the new version. (Times are in YOUR local hour via
TZ_OFFSET.)
