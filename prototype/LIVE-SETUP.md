# Live mode setup: what you do, in order (about 30 to 40 minutes)

Live mode = real WhatsApp on team phones, shared across devices. Demo mode already works without any of this.
**Never paste a key into a chat, a doc or a commit.** Keys go only into `prototype/.env.local` and Vercel's Environment Variables page.

You need three free accounts: **Supabase** (the shared database), **Twilio** (WhatsApp), **Vercel** (hosting). Use the same email for all three.

---

## Part A. Supabase (about 10 min)

1. Go to **supabase.com** and sign in (Google or GitHub is fastest). Click **New project**.
   - Name: `valmo-rescue`
   - Database password: click *Generate*, then save it in your password manager (you will not need it again for this project).
   - Region: **Mumbai (ap-south-1)** if offered, otherwise the closest one.
   - Plan: Free.
2. Wait about 2 minutes for it to finish setting up.
3. Left sidebar, **SQL Editor** → **New query**. Open `prototype/supabase/schema.sql` on your computer, copy everything, paste it in, click **Run**. It should say "Success".
   - This creates three tables and makes `day_state` readable by browsers but writable only by our server.
4. Left sidebar, **Project Settings** (gear) → **API Keys** (or **API**). Copy these three into a scratch text file for now:
   - **Project URL**, looks like `https://abcdxyz.supabase.co`
   - **Publishable / anon key** (public, safe in the browser)
   - **Secret / service_role key** (SECRET, server only)
5. Check Realtime: **Database** → **Publications** → `supabase_realtime` should list `day_state`. (The SQL does this; just confirm.)

## Part B. Twilio WhatsApp sandbox (about 15 min)

1. Go to **twilio.com/try-twilio** and sign up. Verify your email and your phone number.
2. In the Twilio Console, open **Messaging** → **Try it out** → **Send a WhatsApp message**. (Path can differ slightly; search the console for "WhatsApp Sandbox".)
3. You will see the sandbox number (yours is **+1 737 250 8034**, join phrase `join twilio-trial`) and a join code like `join word-word`.
4. On **each team phone** (2 to 3 of them), open WhatsApp, message that number with exactly `join word-word`. You get a confirmation reply. Those phones can now receive our messages.
   - Sandbox membership **expires after 3 days**: re-join on the morning you record the video and before you submit.
   - A trial account has a small free credit (about 100 messages), so we only message real phones for the hero orders.
5. From the Console home page copy **Account SID** (starts with `AC`) and **Auth Token** (click the eye icon) into your scratch file.
6. **Leave the "When a message comes in" box empty for now.** We fill it in Part D after the site has a web address.

## Part C. Vercel (about 5 min)

1. Go to **vercel.com** and sign up (Hobby plan, free). Use "Continue with Google or GitHub".
2. Open a terminal in the `prototype` folder and run:
   ```bash
   npx vercel login
   ```
   Choose your login method and finish it in the browser. That is all I need from you here; then I can run the deploy.

## Part D. Fill in the keys (about 10 min)

1. Make 3 random secrets. Run this three times and keep each result:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   One becomes `OTP_PEPPER`, one `ADMIN_TOKEN`, and pick a short memorable word-based one for `LIVE_KEY` (at least 6 characters; the team types it once per browser tab).
2. Copy `prototype/.env.example` to `prototype/.env.local` and fill in every line (the file explains each one):
   - `SUPABASE_URL` and `VITE_SUPABASE_URL` = the Project URL
   - `SUPABASE_SERVICE_KEY` = the secret / service_role key
   - `VITE_SUPABASE_ANON_KEY` = the publishable / anon key
   - `OTP_PEPPER`, `ADMIN_TOKEN`, `LIVE_KEY` = your three secrets
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` = from Twilio
   - `TWILIO_WHATSAPP_FROM=whatsapp:+17372508034` (your sandbox number)
   - `TWILIO_WEBHOOK_URL` = leave as the placeholder for now
3. Tell me "keys are in `.env.local`". I will then:
   - add the same variables to Vercel and deploy (first deploy gives us the web address),
   - you set `TWILIO_WEBHOOK_URL` to `https://<that-address>/api/whatsapp` in Vercel, and paste the same URL into Twilio's sandbox settings box **When a message comes in** (method **POST**), then Save,
   - I redeploy and test one real WhatsApp round trip on your phone.

## Part E. Link a phone to an order (after the deploy)

Each real phone stands in for one synthetic customer order. Pick the order in the Customer screen (`/customer?hub=lucknow`), note its id (for example `lucknow-0042`), then:

```bash
curl -X POST https://<your-address>/api/admin \
  -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" \
  -d '{"op":"bind","hubId":"lucknow","orderId":"lucknow-0042","phone":"+91XXXXXXXXXX"}'
```

From then on that order's WhatsApp messages (order-day message, OTP, checks) go to that real phone, and the customer's numbered replies come back. I can also build a small "Link my phone" form in the app so you do not need curl. Ask me.

## Checklist to tell me when done
- [ ] Supabase project created, `schema.sql` ran without error
- [ ] Sandbox joined on 2 to 3 phones
- [ ] `.env.local` filled in
- [ ] `npx vercel login` done
