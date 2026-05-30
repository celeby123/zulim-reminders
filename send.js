/* ============================================================
   ZULIM REMINDERS — runs on GitHub Actions (free, no server)
   ------------------------------------------------------------
   GitHub triggers this script on a schedule (see send.yml).
   Each run, the script checks the current local hour/day and
   sends whatever emails are due. Emails go via Resend.

   RECIPIENTS
   - Shared reminders (water, eat, walk, pushups, gym, travel,
     recap, monthly) → BOTH Christian and Zulim
   - Personal congrats (tier unlock) → names the person, still
     sent to both so you celebrate together

   PHASE 1 (no domain): set EMAIL_ZULIM = EMAIL_CHRISTIAN so
   everything lands in your inbox (Resend test sender only mails
   your signup address). PHASE 2 (domain verified): put her real
   address in and verify your domain in Resend.
   ============================================================ */

// ---------- CONFIG via environment (set as GitHub Secrets) ----------
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.FROM || "Zulim Workouts <onboarding@resend.dev>";
const EMAIL_CHRISTIAN = process.env.EMAIL_CHRISTIAN;
const EMAIL_ZULIM = process.env.EMAIL_ZULIM || EMAIL_CHRISTIAN;
const TZ_OFFSET = parseInt(process.env.TZ_OFFSET || "-6", 10); // CST default
const PROGRAM_START = process.env.PROGRAM_START || "2026-06-01";

const BOTH = [EMAIL_CHRISTIAN, EMAIL_ZULIM].filter(Boolean);

// ---------- time helpers (local) ----------
function nowLocal() {
  return new Date(Date.now() + TZ_OFFSET * 3600 * 1000);
}
const L = nowLocal();
const hour = L.getUTCHours();
const minute = L.getUTCMinutes();
const dow = L.getUTCDay(); // 0=Sun..6=Sat
const dom = L.getUTCDate();
const dateStr = L.toISOString().slice(0, 10);

function programWeek() {
  const start = new Date(PROGRAM_START + "T00:00:00Z");
  return Math.max(0, Math.floor((L.getTime() - start.getTime()) / (7 * 86400000)));
}
function pushupsToday() {
  const w = programWeek();
  let n;
  if (w === 0) n = 5;
  else if (w === 1) n = 10;
  else if (w === 2) n = 20;
  else if (w === 3 || w === 4) n = 25;
  else n = 25 + (w - 4) * 5;
  return Math.min(40, n);
}

const GYM_FOCUS = {
  1: "Chest · Shoulders · Triceps",
  2: "Legs · Calves · Core",
  3: "Back · Biceps · Rear Delts",
  5: "Shoulders · Arms · Core",
};

// ---------- email shell ----------
const shell = (title, body, accent = "#ff5a3c") => `
  <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:480px;margin:auto;color:#0f1115">
    <h2 style="color:${accent};font-size:22px;margin:0 0 8px">${title}</h2>
    ${body}
    <p style="font-size:12px;color:#8a909c;margin-top:18px">— Zulim Workouts</p>
  </div>`;

async function send(to, subject, html) {
  if (!RESEND_API_KEY) { console.error("Missing RESEND_API_KEY"); return; }
  if (!to.length) { console.error("No recipients"); return; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  const data = await res.json();
  if (!res.ok) console.error("Send failed:", JSON.stringify(data));
  else console.log(`✓ "${subject}" → ${to.join(", ")}`);
}

// ---------- the schedule ----------
// GitHub Actions fires this script every 2 hours (see send.yml).
// We match on the LOCAL hour so each email lands at the right time.
// Because runs are ~2h apart, we trigger when the local hour is the
// target (within that run's window).
async function run() {
  const jobs = [];

  // TEST MODE: when you trigger the workflow manually with test mode on,
  // send one sample email immediately so you can confirm everything works
  // regardless of the current hour.
  if (process.env.TEST_MODE === "true") {
    await send(BOTH, "✅ Zulim reminders test — it works!",
      shell("Setup complete 🎉",
        `<p style="font-size:15px;line-height:1.5">If you're reading this, your reminder system is wired up correctly. Real reminders will start arriving on schedule. You can turn test mode off now.</p>`));
    console.log("Test email sent.");
    return;
  }

  // 6:30am — water kickoff (fires on the 6:00 run window catching :30)
  if (hour === 6) {
    jobs.push(send(BOTH, "Good morning — start with water 💧",
      shell("Morning, you two 💧",
        `<p style="font-size:15px;line-height:1.5">First thing today: a big glass of water. Sets the tone — more nudges coming through the day.</p>`)));
  }

  // water + eat to satisfaction — 8am, 12pm, 4pm, 8pm
  if ([8, 12, 16, 20].includes(hour)) {
    jobs.push(send(BOTH, "Water + eat to satisfaction",
      shell("Quick check-in 💧🍽️",
        `<ul style="font-size:15px;line-height:1.7"><li><b>Sip some water.</b></li><li><b>Eat only to satisfaction</b> — comfortable, not stuffed.</li></ul>`)));
  }

  // daily walk reminder — pair it with the noon nudge time at 10am
  if (hour === 10) {
    jobs.push(send(BOTH, "Daily 3-mile walk 🚶",
      shell("Time for your walk 🚶",
        `<p style="font-size:15px;line-height:1.5">Get your <b>3 miles</b> in and time it — watch the pace drop week over week.</p>`)));
  }

  // pushups — 6pm, week-aware
  if (hour === 18) {
    const n = pushupsToday();
    jobs.push(send(BOTH, `Today's pushups: ${n}`,
      shell("Daily pushups 💪",
        `<p style="font-size:15px;line-height:1.5">Today's target: <b style="font-size:18px;color:#ff5a3c">${n} pushups</b>. All at once or spread out — your call.</p>
         <p style="font-size:13px;color:#8a909c">Capped at 40/day. Clean reps win.</p>`)));
  }

  // gym day — Mon/Tue/Wed/Fri, morning (6am window) and evening (6pm we already used for pushups, so use 4pm-adjacent 14h? keep 6am + a 2pm heads-up)
  if (GYM_FOCUS[dow] && hour === 6) {
    jobs.push(send(BOTH, `Gym day — ${GYM_FOCUS[dow]}`,
      shell("Today's a gym day 🏋️",
        `<p style="font-size:15px;line-height:1.5">Focus: <b>${GYM_FOCUS[dow]}</b>. Lift ~60 min, log it in the app, sauna after if you've got time.</p>`)));
  }
  if (GYM_FOCUS[dow] && hour === 16) {
    jobs.push(send(BOTH, `Gym reminder — ${GYM_FOCUS[dow]}`,
      shell("Don't skip the gym 🏋️",
        `<p style="font-size:15px;line-height:1.5">Evening check: today is <b>${GYM_FOCUS[dow]}</b>. If you haven't gone yet, now's the window.</p>`)));
  }

  // Sunday recap — 6pm (reuses 18h; recap is data-light without app sync)
  if (dow === 0 && hour === 18) {
    jobs.push(send(BOTH, "Sunday recap — new week tomorrow 📊",
      shell("Week wrap-up 📊",
        `<p style="font-size:15px;line-height:1.5">Another week in the books. Open the app, log your Sunday weigh-in, and check the chart. Fresh start tomorrow — reset those gym sessions in your head and let's go again.</p>`,
        "#ffb020")));
  }

  // Monthly check-in — 1st at 8am (reuses the 8h nudge window; send both)
  if (dom === 1 && hour === 8) {
    jobs.push(send(BOTH, "Monthly check-in ⚖️",
      shell("New month ⚖️",
        `<p style="font-size:15px;line-height:1.5">Goal is at least <b>5 lbs a month</b>. Open the app, compare this month's weigh-ins, and see if you each cleared it. Onto the next.</p>`)));
  }

  await Promise.all(jobs);
  if (jobs.length === 0) console.log(`No emails due at local hour ${hour} on ${dateStr}.`);
}

run().catch((e) => { console.error(e); process.exit(1); });
