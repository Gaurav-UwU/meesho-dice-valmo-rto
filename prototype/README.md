# Valmo Rescue Console (Team GPS, Meesho DICE 3.0 Round 2)

A working prototype of the Rescue Bonus, two-way WhatsApp and the Refused-Parcel Router for Valmo's RTO problem.
Not an official Valmo app. All orders, riders and outcomes are synthetic and labelled that way on every screen.

Specs: `../work/08-prototype-spec.md` (plan), `../work/12-prototype-theme.md` (look), diagrams in `../work/diagrams/`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 1,200+ tests
npm run test:coverage
npx tsc -b && npx oxlint && npx vite build
```

## The screens

| Route | Who | What |
|---|---|---|
| `/` | Anyone | Landing: the 90-second demo, real vs simulated, QR codes |
| `/ops` | Valmo ops team | Live map, KPIs, Bonus vs Control, suspect attempts, feed. Start day / Autopilot / Reset |
| `/rider` | Rider | Clone of Valmo Pilot with the green ₹+15 chip (Bonus riders only). Deliver, Attempted, Refused with OTP |
| `/customer` | Customer | On-screen WhatsApp (Demo mode) with Valmo's wording and reply buttons |
| `/desk` | Hub operator | Refused-Parcel Desk: inspect a parcel, second chance (deliver again, different time, pay now, pick up at hub), Hold & Re-home on a match forecast, consolidated return, pilot KPIs |
| `/pilot` | Meesho decision-maker | 30-day A/B simulator (paired riders, pair-by-pair 95% range, fair-comparison check, two safety rules), GO / RE-PRICE / KILL, P&L, break-even |
| `/captain` | Hub captain | Fake-attempt control: review queue with evidence, Confirm valid / Free re-attempt / Strike with a reason, held bonuses, rider monitor, scorecard, outcome numbers. Works with the bonus off. Demo: no login |
| `/audit` | Anyone | Eighteen checks on the day's own record, each green or red |

Add `?hub=lucknow|powai|whitefield|gaya` to any link. Open Ops, Rider and Customer in separate tabs of one browser and they move together; to use several phones, see "How to run the multi-phone demo" under Modes.

### Demo script (about 90 seconds, hub Lucknow)
1. `/ops` press **Start day**. Top 20% of orders become Bonus-Eligible.
2. `/customer` the flagged customer taps **I'm home** or **Fix address** (shares a location; the pin moves).
3. `/rider` pick **Demo Bonus rider**. Green chip on flagged stops. Tap **Deliver**.
4. `/customer` read the OTP, type it into the rider sheet. ₹15 shows as pending; ops updates live.
5. `/rider` mark another stop **Attempted**, then on `/customer` answer **No, the agent never came**: it lands in the ops suspect queue and blocks the bonus.
6. `/rider` **Refused** on demo stops. The first four give four different Router outcomes on `/desk`: Hold & Re-home (press **Record inspection** first: Hold needs it), second chance, out-of-state seller, broken seal.
7. `/pilot` move the uplift slider (riders are paired on past delivery rate, the range is worked out pair by pair): at the top 20%, +8 gives RE-PRICE, +12 gives GO on the default seed (about 6 runs in 10 at +12; about 97 in 100 at +15), 0 gives KILL. Look for the ✔ Fair comparison line. The landing page (`/`) has the full walkthrough.

## Modes

Every screen shows a badge that says whether this device shares its day with others (tap it for the details):

- **ALONE** = this device has its **own private day**. Other phones cannot see it.
- **SYNCED** = a **shared day** (hub, day number and id, version, when it last changed). Every device that joined sees and changes the same day.
- **OFFLINE** / **NEEDS RESET** / **JOIN KEY REFUSED** / **PAGE OUT OF DATE** say what is wrong and what to do.

**How to run the multi-phone demo (one line):** on the laptop open the landing page, choose **Several devices (shared day)**, press **Start with a fresh day**, then scan the **Rider** and **Customer** QR codes with the phones (the codes carry `?mode=live` and the join key, so nobody types anything).

- **Demo mode (default, one device).** Everything runs in the browser. State is saved in localStorage and synced between the tabs of *that browser* with BroadcastChannel (and the `storage` event where a browser has no BroadcastChannel). No accounts, no internet needed. Separate phones never share a day in this mode, and say ALONE.
- **Live mode / shared day** (`?mode=live`, only when the Supabase settings are built in). State lives in Supabase; screens read it live (Realtime plus a 5 second poll) and send taps to `/api`. The Customer screen is an in-app WhatsApp, so no Twilio is needed for the multi-phone demo; Twilio is only used for an order you link to a real number. If `?mode=live` is asked for but the site has no Supabase settings, the device says ALONE and why.
- **A reset is a new day.** Reset day gives the day a new id and the next day number. Every device switches to it within a few seconds, and starts its screens over (open sheets, typed OTPs, Autopilot). A tap made on a day that has since been reset is refused ("The day was reset, refreshing"), never applied to the new one. A stale device cannot overwrite a newer day: days are compared by day number first, then by version. A day saved by an older version of the app is replaced automatically when a screen opens it.

## Deploy (Vercel)

The server routes live in `api-src/*.ts` and are bundled to plain JS in `api/*.js` (Vercel's own TypeScript step rejects our `.ts` import paths). **Always bundle first:**

```bash
node scripts/build-api.mjs && npx vercel deploy --prod --yes
```

Production: https://valmo-rescue-console.vercel.app (Demo mode by default; add `?mode=live` for Live mode). Secrets are Vercel environment variables (marked sensitive); `.vercelignore` keeps `.env*`, raw data and tests out of the upload.

## Live mode setup

Step-by-step for the accounts: **[LIVE-SETUP.md](LIVE-SETUP.md)**. Summary (you do these; nothing here creates accounts or enters keys):

1. Create a Supabase project. Run `supabase/schema.sql` in its SQL editor.
2. Create a Twilio account and join the WhatsApp Sandbox on 2 to 3 team phones.
3. Copy `.env.example` to `.env.local` and fill it in. Add the same variables in Vercel (Settings, Environment Variables). Never commit real values.
4. `vercel login`, then `vercel deploy`.
5. In the Twilio sandbox settings, set "When a message comes in" to `https://<your-app>.vercel.app/api/whatsapp` (must equal `TWILIO_WEBHOOK_URL`).
6. Link a phone to an order: `POST /api/admin` with `Authorization: Bearer <ADMIN_TOKEN>` and `{ "op": "bind", "hubId": "lucknow", "orderId": "lucknow-0001", "phone": "+91..." }`.
7. Sandbox sessions expire after 3 days: re-join on the morning you record.

The Twilio sandbox cannot send tappable buttons, so Live mode sends numbered options ("Reply 1, 2, 3"). Demo mode shows real buttons.

## Real geography

Until `data/geo-<hub>.json` exists for a hub, a labelled synthetic catchment is used. To build the real ones:

```bash
# 1. Pincode lists per hub from data/raw/pincodes.csv (GeoNames-derived, its own coordinates are unreliable),
#    then each pincode's centre from OpenStreetMap Nominatim (1 request a second, cached in data/cache/).
node scripts/geocode-pins.ts --csv data/raw/pincodes.csv --hub lucknow --hub powai --hub whitefield --hub gaya
# 2. Per hub: keep pincodes within 15 km, routed road distances from the public OSRM demo server (cached).
node scripts/build-geo.ts --csv data/raw/pincodes-geocoded.csv --hub lucknow --osrm
```

Sources: pincode lists from the GeoNames postal-code data (CC BY 4.0, via github.com/egovspace/India-PIN-Code); pincode centres and map tiles (c) OpenStreetMap contributors (ODbL); road distances from OSRM (OpenStreetMap data).

## Layout

```
src/engine/   pure logic, unit tested: Rescue Score, economics, pilot simulator, Router v2, attempt check, generator
src/domain/   the day as pure state: reducer(state, action), autopilot, selectors
src/store/    Store interface with two backends: local.ts (Demo) and live.ts (Live)
src/pages/    the six screens
api/          Vercel functions for Live mode (api/_lib holds the tested logic)
supabase/     schema.sql
scripts/      build-geo.ts
```
