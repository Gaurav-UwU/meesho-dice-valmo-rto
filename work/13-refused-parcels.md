# 13 — Refused parcels: GST, legal constraints, precedents, and the design that fits all of them

Researched 2026-09-29 (three web-research agents), building on `06-solution-inventory-recovery.md`. Items marked [verify] need a primary-source check before they go on a slide.

---

## 1. The constraint stack (everything the design must satisfy)

| # | Constraint | Rule / fact | What it forces |
|---|---|---|---|
| C1 | **GST: where the goods are supplied from** | "Location of supplier" for goods is undefined. s.2(85) says "place of business" includes any "warehouse, godown or any other place where a taxable person stores his goods". So a hub holding a seller's goods for resale can count as the seller's place of business. There is **no GST "sale in transit" safe harbour** (Sch. III para 8(a)/(b) covers imports only). No advance ruling exists. | **Hold & Re-home only when seller state = hub state = new buyer's state.** A cross-state re-home is grey, bordering on blocked. |
| C2 | **GST: paperwork** | Invoice at removal (s.31). The refused sale is cancelled if not yet in GSTR-1, otherwise a full credit note (s.34), which reduces TCS "net value" (s.52). The new buyer gets a **new invoice issued by the seller**. | Automate: credit note/cancel + new invoice from the seller's Meesho panel. |
| C3 | **E-way bill** | Needed only above ₹50k (₹1L intra-state in MH/DL/TN). **The average Meesho order is ₹265, so almost never.** | No e-way bill work for 99%+ of parcels. |
| C4 | **Non-GST sellers** | Notif. 34/2023-CT (from 1 Oct 2023): unregistered sellers with an enrolment ID sell **only intra-state** via the ECO. Meesho enforces this ("non-GST sellers' products are only sold intra-state"). ~25k joined in the first 2 months (40% of new registrations). | **This pool is same-state by law.** Every refused parcel from them already meets C1, and so does all demand for their SKUs. |
| C5 | **FDI Press Note 2** | A marketplace "will not exercise ownership or control over the inventory"; this applies to group entities too (Valmo). | **Seller opt-in per SKU, seller-set rules, a neutral allocation rule, the seller invoices, title never passes** to Meesho/Valmo. |
| C6 | **Consumer Protection (E-Com) Rules 2020 + Legal Metrology 2011** | Sell as new only if unopened and untampered; no repacking (that triggers packer duties). | **Tamper-seal check + photo at the hub**; opened or damaged parcels are never re-homed. |
| C7 | **DPDP Act 2023** (rules notified 13 Nov 2025; most duties from 13 May 2027) | Buyer 1's data needs security and erasure. | Buyer 1's label is fully covered or destroyed on relabel. **The tax invoice currently travels *inside* the parcel** (third-party label tools; [verify]), so an opted-in seller must switch to an **outside pouch or digital invoice**. |
| C8 | **Custody / pilferage** | Surat, Apr 2026: 33,035 Meesho parcels (₹1.35 cr) falsely marked "delivered" by exploiting OTP loopholes (DeshGujarat, 13 Apr 2026). | Scan-in/scan-out, old AWB linked to new AWB, OTP to the new buyer, 48h cap, daily shelf count, no cash handling at the desk. |
| C9 | **Asset-light doctrine** | Aatrey: warehousing "tends to have lower ROI". Hubs are 150–500 sq ft. | A shelf on existing floor space, max 48h, software only. |
| C10 | **Case brief** | "without hurting delivery cost, rider earnings, or speed/ease of ordering". | Buyer 2's ordering is unchanged, they get it faster, and the rider gets an extra paid drop. |
| C11 | **Patents** | Pitney Bowes US 7,299,198 (reroute a return to a secondary buyer): **expired 2025**. Shopify US 11,315,069 (to 2039), Formula Labs US 9,760,854 (to 2033). All US-only [verify there are no Indian filings]. | Prior art exists; the earliest patent expired in 2025 and the others are US-only [verify there are no Indian filings]. Differentiate on execution (last-mile hub, same-state, seller rules). |

---

## 2. Precedents (what's proven vs new)
| What | Who | Status |
|---|---|---|
| Hold at a pickup point / locker after a failed attempt | Amazon pickup points, Shopee SPX self-collect, Cainiao (30k+ stations), Hive Box (~9M parcels/day) | **Proven at scale** |
| Paid one-time redelivery within a window | GHN Vietnam: 11,000 VND, once, within 72h | **Proven** |
| Consolidated returns | UPS Happy Returns: "save merchants up to 40%"; Optoro: up to 20% lower transport cost | **Proven (US)** |
| Returns to a closer/alternate address | Delhivery separate "Return Warehouse Address"; Shiprocket multiple pickup locations | **Proven (India)** |
| Returnless refund / write-off | Amazon Returnless ($1–75 cap), Temu, Pinduoduo "refund only" (regulator told PDD to fix it in 2024) | **Proven, but abuse-prone** |
| **Reroute a return to a new buyer** | Pitney Bowes patent (2002, expired), Shopify patents (2019), Formula Labs (2012); **Merch Factory (India)**: "RTO inventory shelf at our Indore hub for 30 days… re-route it to any new customer with a single click" | **Patented concept + one small live Indian case (at the fulfiller's hub)** |
| Refused COD parcel re-homed from the **last-mile hub** to a **nearby new buyer**, at marketplace scale | — | **Nobody found. This is our novelty.** |
| Meesho's own policy: rejected RTOs "will be **disposed of by the logistics partner**" (Meesho returns policy, Mar 2023) | Meesho | **Precedent inside Meesho for the carrier handling a parcel locally** |

---

## 3. The design: Refused-Parcel Router v2 (every lane checked against C1–C11)

Every refused parcel is scanned at the hub desk (Valmo Operations app → a new "Refused Parcel Desk" item) and takes the **first lane it qualifies for**:

| Lane | When | Legal status | ₹ effect vs the ₹120 return |
|---|---|---|---|
| **1. Second chance** | The refusal is soft (not home, no cash, "later"), confirmed by the customer on WhatsApp (Flipkart-style): *reschedule · pick up at hub · alternate address in the same state · pay now by UPI* | **Clean.** Same invoice, same sale. (An address in a different state needs a re-invoice, so it's excluded.) | Saves the sale + the full ₹120; costs one ₹21 re-attempt |
| **2. Hold & Re-home** | Unopened + seal-checked · **seller state = hub state** · seller has **opted in for that SKU** · invoice in an outside pouch or digital · SKU has near-term demand in the catchment | **Clean-ish.** Intra-state; non-GST sellers are cleanest (C4); registered sellers add the hub cluster as an **APOB** (a one-time non-core amendment). | Saves **~₹145 per match**; costs **~₹8 to hold for 48h**; **break-even at a 5.5% match rate** |
| **3. Consolidated return** | Everything else | **Clean.** Credit note + delivery challan; no e-way bill below the threshold. | Batching by seller/region: **−20% to −40%** of reverse cost (UPS/Optoro benchmarks; India unmeasured, so the pilot measures it) |
| 4. Local donation/destruction (later, not in the pilot) | The seller pre-authorises it for items worth less than the return trip | **Grey.** s.17(5)(h) ITC reversal; a local *sale* re-triggers C1. | Deferred until legal review, so it doesn't overreach |

**How Hold & Re-home works without breaking C5 (FDI):** the seller sets the rules ("re-home this SKU if a same-state order arrives within 48h, at list price"). Allocation is **neutral**: the first nearby order for that exact SKU, the same rule for every seller. The seller issues the invoice from its panel, and the title stays with the seller. Meesho/Valmo only run the logistics service at arm's length.

**Demand side, without discounting:** SKUs sitting on a hub shelf can show buyers in that catchment **"Arrives tomorrow · already near you"**. That's a delivery-speed badge, not a price change. It lifts the match rate and keeps checkout the same (C10).

**Where to start:**
- **Pool:** non-GST (enrolment-ID) sellers first, because their supply and demand are same-state by law. Then opted-in registered sellers whose state is the hub's state.
- **Place:** **Uttar Pradesh**. It's the #1 seller state (15.87% of transacting sellers, RHP) and a top buyer state, so same-state flows are densest there. Gujarat (15.70%) is second.

---

## 4. Sizing (show the working; the match rate is not claimed)
- RTO parcels a year ≈ 763.5M Valmo orders (FY25) × 17% ≈ **130M**.
- Lane 2's eligible pool = RTO parcels × same-state share (**unknown**; scenarios 25 / 35 / 45%) × unopened × opted-in × "head" SKUs.
- ₹ per matched parcel = ₹145; hold cost ₹8; break-even match rate **5.5%**. Scenarios: ~₹50 / ₹140 / ₹270 cr a year (from `06`, effective match 2.5 / 7 / 13.5%).
- Lanes 1 and 3 apply to **every** refused parcel, so the Router saves money even if lane 2's match rate turns out low.
- **Data gaps, stated honestly:** there's no public intra-state order share and no public SKU concentration; only Meesho's AWB data has them. The pilot measures them.

## 5. 30-day Router pilot (one UP cluster, 3 hubs)
1. Measure **dwell time** (how long refused parcels sit before the return leaves) and the share of **soft refusals** (via the WhatsApp check).
2. Lane 1 live: WhatsApp second chance.
3. Lane 2 manual: 30–50 opted-in same-state sellers (non-GST first); seal check + photo; relabel; new AWB; buyer-2 OTP.
4. Lane 3: batch returns by seller for the pilot hubs.
5. **Metrics:** sales saved in lane 1 · lane 2 match rate vs 5.5% · lane 3 ₹ per parcel · pilferage incidents (target 0) · buyer-2 complaints.
6. **Kill:** match rate < 3% after 30 days, or any custody incident.

## 6. What goes on slide 6 (one message)
**"Send each refused parcel to its cheapest legal recovery; only the rest travels back."**
- Left: why it matters. ₹120 = 45% of the ₹265 average order, Meesho bears it, ~130M parcels a year.
- Centre: the Router, with its 3 lanes and a legal-status tick on each.
- Right: the Hold & Re-home break-even (5.5%), the same-state rule, and "non-GST sellers are same-state by law".
- Footer: precedents (Happy Returns −40%, Cainiao stations, Merch Factory, the expired Pitney Bowes patent) + "we found no marketplace doing this from the last-mile hub (desk search, Sep 2026)".

## Sources
Agents' URLs:
- GST: taxguru s.34 amendment; cleartax GSTR-8, e-way-bill thresholds; Notif. 34/2023 via taxguru; supplier.meesho.com/dont-have-gst; gstgyaan s.2(85); taxmanagementindia Sch. III
- FDI: DPIIT FDI policy PDF; Bar & Bench PN3 2026
- DPDP: PIB DPDP Rules PDF
- Precedent patents: patents.google.com US7299198 / US11315069 / US9760854 / US8533126
- Precedent operators: merchfactory.in/glossary/rto; supplychaindive (Happy Returns); wwd (Optoro); ghn.vn; seller.shopee.sg
- Meesho: images.meesho.com returns-policy PDF (Mar 2023); deshgujarat.com 13 Apr 2026 (Surat); inc42 + Business Standard (non-GST sellers); indmoney (RHP seller shares)
