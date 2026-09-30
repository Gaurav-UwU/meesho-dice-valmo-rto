# 12 — Prototype theme: colours, type and real-life references

Researched 2026-09-29 in Chrome: valmo.in, meesho.com, and Play Store screenshots of Valmo's own apps (**Valmo Pilot** = rider app `com.valmo.rider`; **Valmo Operations** = hub/branch app `com.valmo.ops`). The screenshots are saved in `research/ui-refs/`. The hex values were read from the live site CSS, or sampled from the screenshots with PIL.

## Principle: each screen looks like the real thing it would live in
| Prototype screen | Looks like | Why |
|---|---|---|
| **Rider app** | A clone of **Valmo Pilot** ("Today's Tasks") plus our one new chip | The judges see it as a feature added to Valmo's real app, not a new app |
| **Refused-parcel desk** | **Valmo Operations** style, as a new menu item next to its real "RTO Manifest" | Its menu already has RTO Manifest, RVP Inscan, DRS, COD and Audit, so ours slots in beside them |
| **Ops console** (desktop) | Valmo Operations colours on a desktop layout | Central Valmo team |
| **Customer WhatsApp** | Real WhatsApp, "Valmo ✓ Business account", **the exact wording of Valmo's real messages** ("Arriving Today : Your Meesho order with AWB… is out for delivery.") + our reply buttons | Before/after against Gaurav's real screenshot |
| **Landing + pilot simulator** (our pitch layer) | **Our R1 deck palette** (Meesho magenta/purple) | Ties the prototype to the deck. It's clearly "Team GPS", not Valmo |

## Colour tokens

### Valmo layer (rider app, ops console, refused-parcel desk)
| Token | Hex | Source |
|---|---|---|
| `valmo-navy` (primary, CTA, header) | **#092D5E** | valmo.in header CSS; Pilot app "Lets get Started" button |
| `valmo-navy-ops` (ops app header) | #142C5B | Valmo Operations screenshot |
| `valmo-cyan` (logo accent) | #61EEFF / #89EBFC | valmo.in CSS; logo |
| `valmo-gradient` (hero) | #2BC0E4 → #EAECC6 | valmo.in hero CSS |
| `page-bg` | #F2F2F3 | Pilot app task list |
| `card` | #FFFFFF, soft shadow, 12px radius | Pilot app cards |
| `cod-pill-bg` | #EBF7FE (text navy) | Pilot app "COD: ₹…" pill |
| `tag-bg` (Delivery tag) | #ECEBF5 | Pilot app "Delivery" tag |
| `item-pill` | #E6E6E6 | Pilot app "1 Item" |
| `tab-active` | #E9EAF3 with a #0A2E5F underline | Pilot "Pending" tab |
| `text` / `text-muted` | #1F1E1E / #6E748E | Pilot/Ops screens |
| `fab-progress` | #F4511E | Pilot app % button |
| `ops-link-blue` | #5985F7 | Ops app FAB |
| `status-pill` (LOCKED/PENDING) | #142C5B bg, white text | Ops app |
| **`bonus` (our new chip)** | **#0E8A4F on #E7F6EE**, "₹ +15 Bonus Eligible" | Green = money. It matches the Pilot app's own green "CREDITED" earnings screen and stands out from the navy/grey UI |
| `danger` (failed/refused) | #D93025 | standard |

### Meesho layer (customer-facing touches)
| Token | Hex | Source |
|---|---|---|
| `meesho-magenta` | **#9F2089** | meesho.com CSS (brand) |
| `meesho-plum` | #580A46 | meesho.com CSS |
| `meesho-green` (price/offer) | #038D63 | meesho.com CSS |
| `meesho-orange` | #FF6637 | meesho.com CSS |
| `meesho-text` / `muted` / `bg` | #353543 / #616173 / #F8F8FF | meesho.com CSS |

### Team GPS pitch layer (landing, simulator; matches the R1 deck)
| Token | Hex | Source |
|---|---|---|
| `gps-pink` | **#ED0B7D** (alt #E5178E) | R1 PPTX XML |
| `gps-navy` | #120A4A / #2B2650 | R1 PPTX XML (most-used) |
| `gps-purple` | #2A0680 / #3304A0 | R1 PPTX XML |
| `gps-green` (good / GO) | #4FBF83 (light #9FE6BF) | R1 PPTX XML (rider-bag boxes) |
| `gps-pink-bg` (callout) | #FCF0F6 | R1 PPTX XML |
| `gps-cream` | #FFF3D7 | R1 PPTX XML |
Verdict colours: **GO** #4FBF83 · **RE-PRICE** #F5A623 · **KILL** #ED0B7D (the same as R1's verdict box).

### WhatsApp (customer flow; standard WhatsApp look)
Light: header #008069, chat bg #EFEAE2, incoming bubble #FFFFFF, outgoing #D9FDD3, button text #027EB5. Dark (Gaurav's screenshot): bg #0B141A, bubble #202C33. Buttons are rendered as WhatsApp quick-reply buttons.

## Type
- **App screens (Valmo layer):** **Roboto** (what the Android Pilot and Ops apps render in). Card title 16/600, address 14/400, pills 13/500.
- **Pitch layer:** **Figtree**, a free Google font close to Meesho's proprietary *Mier* (seen on valmo.in and meesho.com). Mier itself is proprietary, so it isn't used.
- **Deck:** Graphik + Segoe UI, as in R1 (from the PPTX XML).

## Real UI patterns to copy (from the screenshots)
**Valmo Pilot, "Today's Tasks":**
- Header with an avatar, "Today's Tasks" and the rider ID.
- Tabs **Pending / Failed / Completed**, with counts.
- Chips **Delivery (n) · Pickup (n) · Priority (n)**.
- Card: "Delivery" tag · "1 Item" pill · "COD: ₹…" pill · customer name · address · "Landmark:" line · outlined navy button **View On Map** / **Direction**.
- An orange round **% progress** button at the bottom right.
- **Our addition:** the green "₹ +15 Bonus Eligible" chip on flagged cards, plus a "Priority" count that includes bonus orders. Keep everything else identical.

**Valmo Operations:**
- Navy app bar, a white list of cards with an ID, "Next Location / Destination", and a navy status pill (LOCKED / PENDING).
- Drawer menu: Dashboard, Tracking, Inbound, Manifest Unload, RVP Inscan, DRS, Forward Manifest, **RTO Manifest**, COD, Audit.
- OTP screen: 4 boxes plus a coral SUBMIT button.
- **Our addition:** a drawer item **"Refused Parcel Desk"** just above RTO Manifest. Each card shows the AWB, the lane chip (Second chance / Hold & Re-home / Local disposal / Consolidated return), the reason, and ₹ saved.

**Valmo WhatsApp (Gaurav's real order, 28 Sep):** "Arriving Today : … Pay Rs. X via UPI by scanning the QR code on the rider app. For any assistance… contact the delivery agent at …" and "Failed Delivery : Sorry, we failed to deliver… We will try to deliver again in 24–48 Hrs – Meesho". Ours keeps the same text and adds the buttons **✅ I'm home · 🕐 Change time · 📍 Fix address · 💳 Pay now (UPI)**.

## Guardrail
The prototype reuses Valmo/Meesho look-and-feel **for a Meesho-run competition**. Every screen carries a footer: "Prototype by Team GPS (IIT Bombay) for Meesho DICE 3.0. Not an official Valmo app. Synthetic data." We don't use real rider phone numbers or AWBs.
