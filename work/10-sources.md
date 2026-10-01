# 10 — Sources for every R2 figure

Compiled 2026-09-27 (session 2). Every number on the R2 deck should trace to a row here or to a derivation in `09-r2-slide-spec.md` (appendix section).
Credibility: **P** = primary (Meesho/Valmo document, regulator) · **C** = company report with a stated method · **S** = secondary (news, broker note) · **B** = blog (use only as "reportedly").

## Meesho / Valmo

| Figure | Value | Source | Cred. |
|---|---|---|---|
| COD share of shipped orders | 88.71% FY23 · 85.39% FY24 · 76.95% FY25 · 78.51% H1 FY25 · 72.00% H1 FY26 | Axis Capital IPO note quoting the RHP (chittorgarh.net/reports/ipo_notes/meesho-ipo-note-axis-capital.pdf) | S (cites P) |
| COD / prepaid delivery success | COD 76.57 / 78.60 / 77.70 / 75.85%; prepaid 96.76 / 97.85 / 97.28 / 96.39% | RHP, as recorded in `HANDOVER.md`. The H1 FY26 figures were cross-checked against Upstox/INDmoney snippets. The DRHP Q1 FY26 figures were 75.55 / 96.33 | P (via notes) |
| RTO rate 21.2 / 18.6 / 17.8% | **Derived** = COD share × (1 − COD success) + prepaid share × (1 − prepaid success). Not printed in any filing. Label it "derived from RHP" | Our calculation | derived |
| Valmo share of Meesho shipments | 1.83% FY23 · 19.55% FY24 · 48.08% FY25 · 64.52% H1 FY26 | Axis note quoting the RHP | S (cites P) |
| Valmo share, latest | **~50% of volume in Q1 FY27, flat QoQ**; Meesho gives each lane to the lowest-cost provider, "no specific guidance" on Valmo share | Q1 FY27 earnings call transcript, 23 Jul 2026 (investing.com); MediaNama 30 Jul 2026 | P (call) / S |
| Valmo delivery agents | 73,671 (FY25) · 102,349 (12 months to Sep 2025) · ~120k (Q4 FY26 letter) | Axis note; Q4 FY26 shareholder letter | S / P |
| TrustMesh | "has reduced RTO by >10%"; predicts RTO before dispatch across **166 Mn active listings**; FY26: ~9 Mn risky transactions blocked, ~2 Mn consumers and 62K sellers restricted | Q4 FY26 Shareholders' Letter, 6 May 2026, p.4 (static-assets.meesho.com/investor-relations/manual-uploads/IntimationShareholdersresult0605.pdf) | P |
| Predictive routing lowered RTO | "lower RTOs … and cancellations YoY driven by our investments in predictive routing models". No RTO % newer than FY25 | Q1 FY27 Shareholders' Letter, 23 Jul 2026 (static-assets.meesho.com/investor-relations/1784806298911/Q1ShareholdersLetter.pdf) | P |
| Q1 FY27 GMV / NMV | ₹19,054 cr / ₹11,614 cr; NMV excludes cancelled, RTO and returned orders | Q1 FY27 letter | P |
| Other Q4 FY26 initiatives | GeoIndia LLM (misroute cost −5%), route planning system (NIS) | Q4 FY26 letter | P |
| Average order value | ₹265 FY25 (₹337 FY23), ₹265.5 H1 FY26 | RHP via Medianama, Dec 2025 | S (cites P) |
| No RTO fee charged to sellers | "Meesho will not charge a return shipping fee for any RTOs" | Shiprocket blog. The official supplier.meesho.com/shipping page returned 403 | B, **confirm on the supplier panel** |
| Asset-light doctrine | Vidit Aatrey: warehousing "tends to have lower return on investment (ROI)… Staying asset light makes sense" | MediaNama, 2 Feb 2026 (Q3 FY26 earnings call) | S (quote) |
| "Flexible delivery options already offered on Valmo" | **No public source found.** Team to supply one or drop it | — | — |

## Valmo Delivery Services Agreement v1.0 (primary, key R2 evidence)
URL: https://www.valmo.in/static-assets/valmo-partner-app/documents/valmo-app-delivery-service-agreement-v1.0.html. Term 15 Mar 2025 – 15 Mar 2026. Valmo may have renewed or updated it since, so cite it as "Valmo's published Delivery Services Agreement".

| Clause | What it says | Deck use |
|---|---|---|
| Parties | Contract between Meesho (as "Valmo") and the individual "Delivery Executive", an independent contractor | Riders contract with Valmo directly |
| §3 Pricing | The rider is paid a "Service Amount" **upon successful delivery**, remitted to the rider's bank account; Valmo raises invoices on the rider's behalf | Pay only on success, direct to the rider |
| §3 Additional Incentive | "You shall raise invoices upon Valmo with respect to amounts agreed between Valmo and You ('Additional Incentive')" | **An existing rail for the Rescue Bonus** |
| §3 Facilitation Fee | The rider pays Valmo a facilitation fee, set off against payouts | Context only |
| Annex A: FAD | "maintain a first attempt delivery success rate"; penalty table row "FAD targets nonadherence → Incentive as per commercial" | Today's incentive tracks the **overall first-attempt rate**, not per-order difficulty |
| Annex A: verification | "In the event of a failed delivery, Valmo shall call the Customer to verify whether the attempt… has been made" | Controls against fake attempts already exist, so R2 is mostly in play |
| Annex A: refusal OTP | A refusal is updated in the app, then "an OTP will be generated to the Customer"; if the customer won't give the OTP, 3 attempts | The "refused" slice is verified refusals |
| Annex A: re-attempt | A rider-attributable failure means another attempt within 48h; 3 attempts before RTO | Existing re-attempt rule |
| Annex A: prepaid OTP | OTP required for prepaid delivery | The bonus trigger uses existing proof |
| Annex A: cash | COD cash is deposited at the Last Mile Delivery Hub the same day; undelivered and return shipments are handed to the hub the same day | Bonus trigger for COD = cash reconciled; the hub holds refused parcels |
| Annex B | Service Amount "as intimated by Valmo from time to time" | No public per-delivery rate |

## Rider pay
| Figure | Value | Source | Cred. |
|---|---|---|---|
| Payout per successful delivery | ₹18–25 | indiapost.org Valmo franchise page (Jun 2026). Probably the partner rate, not the rider's own | B, say "reportedly" |

## Industry / third party
| Figure | Value | Source | Cred. |
|---|---|---|---|
| RTO by delivery time | 22% (1–2 days) → 35% (5+ days) | Shipway ShipNotes, via mediabrief.com, 29 Jul 2025 | C |
| RTO by zone / city | intra-city 20%, metro–metro 22%, non-metro inter-state 27%, NE/J&K 28%; Vadodara 18% vs Patna 35% | Same | C |
| COD vs prepaid (D2C) | ~26% vs <2% | Same | C |
| D2C RTO seasonality | ~39% (Nov 2025 peak) → ~21% (Feb 2026) | Unicommerce D2C Report 2026 | C |
| Tier-2/3 share of new D2C orders | 66% FY26 | Business Standard, 20 Apr 2026 (Unicommerce) | S |
| RTO cause split | **None published with a method.** Our pie is our own blend and must be labelled so | — | — |
| Fake attempts "~15% of failed deliveries" | Unsourced | Shiprocket blog | B, **do not cite** |

## Precedents
| Item | Source | Cred. |
|---|---|---|
| Gig-worker incentive RCT: effects vary by worker | Butschek, González Amor, Kampkötter & Sliwka, "Motivating gig workers", *Labour Economics* 2022 (IZA DP 12667) | P (academic) |
| Rain pay ₹15–50 per order in geofenced zones (paying per order for difficulty) | BusinessToday, May 2025 + blogs | S |
| Amazon DSP scorecard bonuses (fleet-level, success-based) | aboutamazon.com ($660M in rate increases and bonuses) + consultancy blogs | P/S |
| Flipkart Open Box delivery (check at the door, then OTP) | stories.flipkart.com, 2 Sep 2025 | P |
| GoKwik RTO-risk API (150+ signals) | GoKwik docs | C |
| Shopee: refusal on the 1st attempt → cancel and return to sender; repeat refusers can lose COD | help.shopee.ph/portal/4/article/81113 | P |

## Refused parcels
| Item | Source | Cred. |
|---|---|---|
| Direct resale of in-transit returns | sellers.skipreturns.com | B |
| Patents for a local return centre shipping to a new buyer | USPTO 11315069, 11810060; also Pitney Bowes US 7,299,198 (expired 2025) and Formula Labs US 9,760,854 (see `13-refused-parcels.md` C11) | P |
| Amazon Grade & Resell / Liquidations (US/EU) | aboutamazon.com | P |
| Batched returns $3–5 vs $8–14 per parcel | closo.co 2026 (Happy Returns guide) | B |
| Couriers make up to 3 attempts over 24–72h, then hold 5–7 days | icarry.in; clickpost.ai | B (the two agree) |
| We found no marketplace re-homing refused parcels from the last-mile hub (desk search, Sep 2026); one small fulfiller (Merch Factory) re-routes RTO stock from its own hub (see `13-refused-parcels.md`) | Negative search result + 13 | P |
| Surat, Apr 2026: 33,035 Meesho parcels (₹1.35 cr) falsely marked delivered via OTP loopholes | deshgujarat.com, 13 Apr 2026 (see `13-refused-parcels.md` C8; copied 2 Oct, not re-verified) | P |

## Legal (Hold & Re-home gates)
| Rule | Source |
|---|---|
| Place of supply = delivery address on the invoice | CBIC Circular 209/3/2024 (26 Jun 2024), via cleartax |
| Seller identity on the invoice, seller disclosure | Consumer Protection (E-Commerce) Rules 2020, Rules 5(16) & 6; Amendment Rules 2026 (notified 9 Sep 2026, effective 1 Jan 2027) add GST/MSME disclosure only (SCC Online, 14 Sep 2026) |
| Marketplace must not own or control inventory | FDI Press Note 2 (2018), via Khaitan & Co |
| MRP re-declaration only by the packer | Legal Metrology (Packaged Commodities) Rules 2011 (from `06-…md`). Unopened parcels only |

## Case data pack (Valmo PDF)
COD 80% of Valmo orders · COD RTO 20% · prepaid RTO 5% · forward ₹50 (FM Hub 4 · FM Carting 2 · FMSC 5 · NLH 8 · LMSC 5 · RLH 5 · LMDC 21) · reverse ₹120.
**Distance from delivery hub → share returned undelivered: ~2 km 15% · ~5 km 17% · 10 km+ 22%.** Note: first-time/new or incomplete/unclear addresses show a noticeably higher failure share than repeat, well-recognised addresses. (Missed in R1 notes; added 2026-09-27.)

## Meesho: what's already in play (checked 2026-09-27)
| Item | Source | Cred. |
|---|---|---|
| Prepaid c.37% of shipped orders (Q1 FY27), via shareable UPI, **Pay Before Delivery**, payment offers | Q1 FY27 letter | P |
| TrustMesh filtering high-risk orders cut cancellations and RTO | Q1 FY27 letter | P |
| COD limited for repeat cancellers (RHP risk factor; exact wording not verified, the PDF returned 403) | INDmoney summary of RHP | S, **read the RHP before quoting** |
| Seller quality/returns penalties (no seller-level *RTO* score found) | Third-party seller guides | B |
| Partial COD, WhatsApp order confirmation | **Not found** at Meesho | — |

## Fact-check log: the AI trend summary the team received (2026-09-27)
| Claim | Verdict | Use |
|---|---|---|
| Shiprocket × Tata Comms WhatsApp: −45% RTO losses, +50% contact rate, response 30%→70% | ✅ tatacommunications.com/case-study/shiprocket (undated) | Yes, "vendor-reported". Don't date it 2026 |
| Delhivery GenAI geocoding 8,000 req/min @ 160 ms, ~80% lower serving cost | ✅ aws.amazon.com/solutions/case-studies/delhivery-case-study/ (undated) | Yes (P2 feasibility) |
| Meesho allocates lanes by lowest cost, no fixed Valmo share | ✅ Q1 FY27 call, 23 Jul 2026 | Yes (10x) |
| Cost per successful delivery maths (₹45@90% = ₹50 vs ₹40@75% = ₹53.3) | ✅ arithmetic | Yes, redone with our ₹120 reverse leg |
| RTO rises with distance from hub | ✅ case data pack | Yes |
| Shiprocket Checkout case: partial COD + RTO engine + prepaid incentives; >99% of very-high-risk carts didn't convert | ✅ checkout.shiprocket.in blog, 14 Aug 2026 | Context only (a checkout-friction lever, excluded by the brief) |
| Shiprocket Aug 2026: NDR reason breakdown, "delivery recovery rate" dashboard | ✅ shiprocket.in product highlights Aug 2026 | Optional |
| Shiprocket RADAR: pincode-level risk for courier choice | ✅ TipRanks 20 Jul 2026 | Optional |
| "17 Sep 2026 Shiprocket beauty brand RTO 28.62% → 5.47%" | ❌ **not found anywhere** | **DO NOT USE** |
| "Shiprocket 2026 AI address-quality alerts / checks at order creation" | ❌ not found (address correction at reattempt is an old feature) | **DO NOT USE** |
| "Sep 2026 Shiprocket intelligence layer choosing courier, node, route" | ❌ not found as stated | **DO NOT USE** |
| "NDR recovery 30–40%" | ⚠️ ClickPost blog, expected result, no source | Don't use |

## Added 2 Oct for deck plan 28 (carried over from `01-valmo-research.md`, `06-…md` and `07-problem-breakdown.md`)
| Item | Source | Cred. |
|---|---|---|
| Predicting *when* the customer is home: up to 10.2% delivery-cost savings | Kandula, Krishnamoorthy & Roy (2021), "A prescriptive analytics framework for efficient E-commerce order delivery", *Decision Support Systems* 149:113584, doi:10.1016/j.dss.2021.113584 | P (academic) |
| Prior art: offering the return cost as a discount to a nearby buyer | Amazon US 8,615,473 B2 (filed 2012), patents.google.com/patent/US8615473B2 | P |
| Dark stores at last-mile delivery centres | Ecom Express DRHP p.181 | P |
| Doorstep QC on returns: AJIO resaleable returns 25% → 98% | Delhivery QC-RVP (vendor-reported; **URL to add**) | C/B, say "vendor-reported" |
| Carrier may sell unclaimed goods only after notice | Carriage by Road Act 2007 s.15 | P |
| E-way bill threshold ₹50,000 | CGST Rules, Rule 138 | P |
| Node margins: a large 3PL nets ~15 paise an order (2.86% EBITDA) | Shadowfax financials, as cited in `06-solution-inventory-recovery.md` (**URL to add**; else say "reportedly") | S |
| Vendor RTO claims are self-reported (Delhivery "up to 20%", GoKwik, Shadowfax "almost 60%") | Vendor sites, see `01-valmo-research.md` §C | C (self-reported; that is the point) |
| Meesho allocates lanes by lowest cost, no fixed Valmo share | Q1 FY27 earnings call, 23 Jul 2026 (see fact-check log above) | P |

## Source lines still MISSING (checked 2 Oct, Session 16)
The deck's "Is it new?" claim ("we found none") rests on peers that have **no source line in this file yet**. Nothing was invented: each needs a URL, a date read and one quoted sentence before it goes on a slide (or cut the peer from the slide).
| Peer | What the deck says | What is missing |
|---|---|---|
| **Meituan** | A model-driven rider bonus, but for order *acceptance* | The paper is cited as "arXiv 2202.10695, 2022" in the footer, but there is no URL line, date read or quote here. Open the paper and copy the sentence that says the incentive is for accepting orders. |
| **Uber Eats / DoorDash** | Extra pay for harder orders, also at acceptance | No source line at all. Needs the Uber fare/earnings guide URL (the footer cites "Uber fare guide") and a DoorDash Dasher pay page, each with a quote. |
| **Ekart** | A first-attempt incentive on all orders | No source line at all. Needs the Ekart (Flipkart) delivery-partner incentive page or a news report, with a quote. |
Also still open: the novelty wording must stay "we found none (searched [date])", and the Delhivery QC-RVP URLs listed in `28-deck-plan-final.md`.
