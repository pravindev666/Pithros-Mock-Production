You are right to push back. I was too quick to accept the prices instead of engineering the pricing system from the product, Indian payment behavior, competitive reference points, and unit economics.
I checked the actual PITHROS ZIP. The current product already contains the pieces needed for a recurring model: the free memorial with biography/timeline/photos/tributes/privacy, plus paid-capability candidates such as high-resolution media, voice memories, HD video, family collaboration, digital legacy links, PDF memory export, anniversary/milestone notifications, and the family/multi-memorial architecture. The current code still uses placeholder/lifetime pricing and a memorialId-centric billing model, so I would replace that rather than inherit it.
First: there is no single "Indian psychology"
I would not build PITHROS around stereotypes such as "Indians only buy cheap things."
The useful evidence is more specific:
India's consumers are increasingly digital-first, but value, safety, language and trust matter. Google/Temasek/Bain reported that roughly 80% of surveyed Indian consumers preferred digital-first experiences for convenience/value and highlighted language and safety/security as important design factors. ([Temasek](https://www.temasek.com.sg/en/news-and-resources/news-room/news/2023/e-Conomy-IN-2023-report?utm_source=chatgpt.com))
Current Indian CX research also shows that trust and payment experience can justify paying a premium: KPMG India's 2025 CX research reports, for the sector it studied, 29% willing to pay more for a trusted brand and 22% willing to pay more for a smooth website/checkout/payment experience. ([KPMG](https://kpmg.com/in/en/insights/2025/03/india-cx-report-2025/retail/electronic-stores.html?utm_source=chatgpt.com))
And UPI is not merely available—it is habitual at enormous scale. NPCI's August 2026 statistics show about 24.5 billion UPI transactions in one month. ([NPCI](https://www.npci.org.in/product/upi/product-statistics?utm_source=chatgpt.com)) Government data for FY2026 also reports that 86% of UPI P2M transactions were below ₹500, which is relevant to PITHROS's ₹249 monthly price point. ([Press Information Bureau](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2257087&lang=1&reg=3&utm_source=chatgpt.com))
So the PITHROS pricing engine should optimize for:
low perceived risk + obvious value + small-ticket payment familiarity + strong trust + family sharing + annual value.
Not "trick the customer."
Now I would actually FINALIZE the pricing
And I am going to disagree with one part of your earlier proposal.
Do not make every plan have every billing interval.
That produces a pricing matrix nobody needs.
Instead, I would use one consumer product with three billing choices, then a separate family bundle.
PITHROS Memorial Care
Plan
Price
Role
Monthly
₹249/month
No long commitment
6 Months
₹649
Intermediate commitment
Annual
₹999/year
Primary plan
PITHROS Family Archive
₹2,999/year — up to 5 memorials
I am deliberately changing the earlier ₹2,499 recommendation to ₹2,999.
Why?
Because 5 memorials at ₹2,499 means you're effectively selling each slot for ₹499.80/year compared with ₹999 for one memorial. That's a 50% bundle discount before we've established that PITHROS needs to discount that aggressively.
₹2,999 still gives the family a substantial discount:
5 individual memorials 5 × ₹999 = ₹4,995 Family Archive = ₹2,999 saving = ₹1,996 ≈ 40% discount
That's sufficient to create the family incentive without destroying ARPU.
This is an inference from your product economics, not a claim that ₹2,999 is empirically proven optimal.
Why ₹999/year is the important number
This is not just because you suggested it.
There is actual category validation in India.
Shradhanjali currently charges ₹999 for one year and ₹3,999 for five years, with memorial features including biography, family tree, photos, videos and anniversary reminders. ([The Eternal Memory](https://theeternalmemory.com/pricing?utm_source=chatgpt.com))
That's unusually useful evidence for PITHROS because it is not some unrelated SaaS product.
It tells us that:
₹999/year is already a recognizable Indian price point for an online memorial/tribute service.
Therefore I would use ₹999 as the launch control, rather than arbitrarily choosing ₹799 or ₹1,499.
Why ₹249/month?
This should not be your hero price.
It is your flexibility price.
The arithmetic is powerful:
₹249 × 12 = ₹2,988
versus:
₹999/year
So the annual plan is:
₹1,989 cheaper than paying monthly for a full year.
That's a very obvious value proposition.
A monthly customer is essentially paying a flexibility premium.
That is good pricing architecture.
Why ₹649/6 months?
This is your middle commitment.
Compared with paying monthly:
₹249 × 6 = ₹1,494
6-month plan:
₹649
Saving:
₹845
Compared with two six-month periods:
₹649 × 2 = ₹1,298
Annual:
₹999
Annual saving:
₹299
So:
MONTHLY ₹249 ↓ 6 MONTHS ₹649 ↓ ANNUAL ₹999
The mathematics naturally pushes the customer toward annual without needing a fake "decoy."
Research on nine-ending prices shows that such pricing can affect perceptions, but also that its effect is context-dependent, so don't build your entire strategy around ₹999 being psychologically magical. ([ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0969698922002995?utm_source=chatgpt.com))
In PITHROS, ₹999 is stronger because it is both a familiar psychological price point and a category-validated Indian price.
The real Indian conversion engine
This is the part you actually need.
The pricing page alone will not make people pay.
PITHROS should use a value-reveal paywall
Do NOT do:
Landing page ↓ ₹999 ↓ Pay
Instead:
Visitor ↓ Create Memorial ↓ Upload photo ↓ Write story ↓ Build timeline ↓ See finished memorial ↓ Add more memories ↓ Encounter premium capability ↓ Memorial Care ₹999/year
Why?
Because the user has now accumulated perceived value.
Freemium research across 55 studies found that willingness to pay is driven by perceived functional, hedonic, social and price value, with trust mediating willingness to pay. ([ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0268401224000355?utm_source=chatgpt.com))
That's exactly the mechanism PITHROS should exploit—value demonstration, not emotional pressure.
Your paywall should appear at the moment of actual need
This is much better than a generic popup.
Example 1 — Photo
User has uploaded 25 photos.
Then:
Your memorial is growing.
Free Memorial includes up to 25 photos.
Memorial Care lets your family continue building the complete photo archive.
₹999/year
Button:
Continue with Memorial Care
Example 2 — Voice
User clicks:
Add Voice Memory
Show:
Preserve their voice, too.
Voice memories are available with Memorial Care.
₹999/year
This is much stronger than:
"Upgrade to Premium."
Example 3 — Video
User uploads a video.
Instead of rejecting it:
Keep this memory in the memorial
Memorial Care includes HD video preservation.
₹999/year
This is a feature-triggered conversion.
The important thing in PITHROS: don't manufacture the pain
Your product operates around bereavement.
So I would explicitly prohibit these conversion patterns:
"Pay now or their memories disappear."
"Don't let your loved one's memory die."
"Only 2 plans remaining."
"Offer expires tonight."
"Your memorial will be deleted."
That's not sophisticated psychology.
It's crude emotional pressure.
And it creates the wrong long-term brand.
Instead, exploit information asymmetry, not emotional vulnerability:
"Here's what Free includes."
"Here's what Memorial Care adds."
"Here's exactly what you pay."
"Here's what happens if you stop renewing."
That is enough.
The strongest PITHROS conversion mechanism may be "family pays"
This is something I would definitely engineer.
The person who creates the memorial does not necessarily have to be the person who pays.
Imagine:
Son creates memorial ↓ Memorial complete ↓ "Preserve this memorial with your family" ↓ Share upgrade link ↓ Brother / sister / spouse pays ↓ Memorial upgraded
The payer doesn't even need to own the memorial.
This matters because memorial creation is naturally collaborative.
Your existing application already has contributor/steward concepts, so this feature fits the product rather than being artificially added.
I would call this:
Family Sponsorship
Not:
Donation
Not:
Contribution
Not:
Tip
The transaction is:
Purchase of Memorial Care for a family memorial.
That is a much cleaner commercial model.
Your existing ZIP actually gives PITHROS a fantastic retention mechanism
This is something I would lean into much more heavily.
You already have:
Timeline
The memorial isn't static.
Tributes
Visitors can continue adding memories.
Voice memories
Family members can add new recordings.
Videos
New family footage can be added.
Digital legacy links
External content can be maintained.
Anniversary/milestone notifications
The memorial can bring families back.
Family contributors
Multiple people can continue editing.
Archive
The memorial can grow over time.
These features are already represented in your project. The important commercial insight is:
PITHROS is not selling storage. It is selling an evolving family remembrance space.
That gives the annual subscription a legitimate reason to exist.
The freemium literature supports the basic principle that continuing perceived value and trust influence premium conversion. ([ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0268401224000355?utm_source=chatgpt.com))
Free must remain genuinely useful
Do not destroy your acquisition funnel.
I would keep the current free concept but remove the dangerous word "permanent."
Current:
Free Forever
Change to:
Free Memorial
Current:
Permanent Preservation
Change to:
Memorial Care
The free version should let a family actually create something.
For example:
FREE MEMORIAL 1 memorial 25 photos 10 timeline milestones Biography Basic privacy Tributes Basic sharing Basic memorial page
Then:
MEMORIAL CARE 1 memorial Expanded media Voice memories HD video Family collaboration Digital legacy links Archive export Anniversary/milestone notifications Enhanced controls
The feature boundary is obvious.
Do NOT sell verification as a premium badge
This is a major product-design point.
Your ZIP has:
Document Review / Trust Verification
I would not say:
Pay ₹999 to get verified.
That makes verification look like something people can buy.
Instead:
Verification should mean verification.
You can charge for the broader service around it if necessary, but don't let the commercial tier determine whether a person's death documentation is "truthful."
That's both better product architecture and better trust engineering.
Your pricing page should be engineered like this
Hero
Give Their Story a Place to Stay
Create a memorial freely. Continue building it with Memorial Care whenever your family is ready.
Then:
FREE
₹0
Create Memorial
MEMORIAL CARE
₹999/year
₹83/month equivalent
Primary CTA
Preserve the complete memorial
Below it:
₹649 / 6 months
₹249 / month
No fake "Most Popular."
You don't have the data yet.
You can say:
Best value
because the arithmetic objectively supports it.
Show savings explicitly
On the annual card:
Save ₹1,989 vs monthly
For six months:
Save ₹845 vs monthly
This is legitimate, mathematically verifiable price framing.
Current consumer research finds that shoppers value straightforward pricing and clarity more than gimmicky deal mechanics. ([BCG Global](https://www.bcg.com/publications/2025/consumers-are-rewriting-rules-year-end-sales?utm_source=chatgpt.com))
That fits PITHROS very well.
I would actually hide the monthly price initially
Not hide it in the legal sense.
I mean de-emphasize it visually.
UI:
Memorial Care ₹999/year Best value ₹83/month equivalent [ Preserve Memorial ] Other billing options ₹649 / 6 months ₹249 / month
The user can still choose monthly.
You're simply making the economically sensible option the visual default.
No coupon box
This is important.
Don't put:
Have a coupon?
on the pricing page.
Why?
Because you teach the customer:
"The real price is negotiable."
You're building a trust-oriented service.
Have stable pricing.
Later, acquisition campaigns can use tracked offers without turning every checkout into a coupon hunt.
No "₹999 crossed out from ₹1,999"
Unless ₹1,999 was genuinely charged previously.
Otherwise it's manufactured anchoring.
Don't do it.
You don't need it.
Localization should be part of the conversion engine
The Indian market is highly heterogeneous. Don't launch with:
English-only, ₹ pricing, generic copy
and then declare that Indian consumers don't convert.
Your product should support:
English + major Indian languages progressively, especially for memorial content.
Google/Temasek/Bain specifically highlighted language responsiveness, safety/security and differentiated India-first experiences as important considerations in India's digital consumer ecosystem. ([Temasek](https://www.temasek.com.sg/en/news-and-resources/news-room/news/2023/e-Conomy-IN-2023-report?utm_source=chatgpt.com))
And the price does not need to change by language.
The experience changes.
Payment engineering
Your pricing architecture should map directly to Cashfree like this:
PLAN_ID PRICE INTERVAL memorial_care_monthly ₹249 month memorial_care_halfyear ₹649 6 months memorial_care_annual ₹999 year family_archive_annual ₹2,999 year additional_memorial_annual ₹499 year
I would initially not offer monthly/6-month Family Archive.
That's deliberate.
You don't need:
249 649 999 499 1299 1999 699 1799 2999
That's nine decisions.
Start with:
1 memorial ₹249 / ₹649 / ₹999 OR up to 5 memorials ₹2,999/year
Much cleaner.
Why UPI matters
The annual purchase is ₹999 and the monthly purchase is ₹249—both firmly in the small-ticket range where UPI is highly relevant.
India's UPI ecosystem is enormous, and FY2026 data indicate that most merchant transactions were below ₹500. ([Press Information Bureau](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2257087&lang=1&reg=3&utm_source=chatgpt.com))
So checkout should be:
UPI │ ├── PhonePe ├── Google Pay ├── Paytm └── Other UPI apps Cards Net Banking
And for recurring renewal:
UPI AutoPay / card mandate with explicit customer authorization.
Cashfree currently supports recurring subscriptions across UPI AutoPay, cards and eNACH, including yearly/monthly recurring structures. ([Cashfree](https://www.cashfree.com/recurring-payment/?utm_source=chatgpt.com))
Renewal psychology
This is where you make the recurring model survive.
Don't wait until:
subscription expired
to contact them.
Use:
30 days before ↓ "Your Memorial Care renews on 30 Oct" 7 days before ↓ "Your Memorial Care renews in 7 days" 1 day before ↓ "₹999 renewal tomorrow"
Then:
Payment successful ↓ Care continues
And if payment fails:
Failed renewal ↓ Grace period ↓ Retry ↓ Reminder ↓ Premium restrictions
Never delete the memorial.
Shradhanjali's current model is instructive here: after its paid period, profile details remain searchable while editing controls are removed. ([Shradhanjali](https://www.shradhanjali.com/faq?utm_source=chatgpt.com))
That is a reasonable model for PITHROS too.
The killer conversion loop
This is the architecture I would build into the product:
VISITOR │ ▼ CREATE MEMORIAL │ ▼ FREE PROFILE │ ┌──────────────┼──────────────┐ │ │ │ Photos Story Timeline │ │ │ └──────────────┼──────────────┘ ▼ BEAUTIFUL RESULT │ ▼ FAMILY STARTS SHARING │ ▼ MORE MEMORIES GET ADDED │ ┌──────────────┼──────────────┐ ▼ ▼ ▼ Voice Video Archive │ │ │ └──────────────┼──────────────┘ ▼ PREMIUM GATE │ ▼ MEMORIAL CARE ₹999/year │ ▼ FAMILY SHARES │ ▼ FAMILY MEMBER PAYS │ ▼ MORE MEMORIES │ ▼ ANNUAL RENEWAL
That is the conversion engine.
Not a fancy pricing card.
The psychological equation
For PITHROS I would model conversion as:
Purchase Probability ≈ Perceived Memorial Value × Trust × Emotional Relevance × Payment Convenience × Price Clarity ÷ Perceived Risk × Payment Friction × Commitment Anxiety
That is not a scientific equation or predictive model; it is a product-design framework.
You improve conversion by increasing the numerator and reducing the denominator.
Increase value
Show the completed memorial before payment.
Increase trust
Clear company identity, privacy, document handling, refund policy, secure payment.
Increase relevance
Gate premium features exactly when the family attempts to use them.
Increase convenience
UPI + simple checkout.
Reduce risk
Free creation + no card required to begin + clear cancellation/renewal terms.
Reduce commitment anxiety
₹249 monthly option.
Reduce price confusion
One primary annual plan.
The strongest psychological mechanism: "I have already built something"
This is essentially the sunk-cost/commitment mechanism, but I would use it carefully.
The goal isn't:
"They've already spent time, so trap them."
The goal is:
"Now they can see what PITHROS is actually worth."
The family may have created:
Biography + 15 photos + timeline + 3 tributes
and then they try:
Add Voice Memory
That's where the value of Premium becomes concrete.
That is dramatically stronger than:
"Would you like to buy Premium?"
What I would NOT do
I would specifically ban these from the PITHROS growth specification:
Fake countdowns Fake scarcity Fake testimonials Fake "most popular" Fake original prices Automatic renewal without clear authorization Deleting memorials after failed renewal Paid verification status Paid condolence messages Pressure language involving the deceased Hidden GST Hidden renewal terms Forced monthly subscription Coupon dependence Nine different consumer plans
Those are not sophisticated conversion engineering.
And here's the final pricing decision
I would put this into the PRD as the V1 pricing control:
Product
Billing
Final V1 price
Free Memorial
Forever
₹0
Memorial Care
Monthly
₹249
Memorial Care
6 months
₹649
Memorial Care
Annual
₹999
Family Archive
Annual
₹2,999
Additional memorial
Annual
₹499
The default purchase
₹999/year
The flexibility escape hatch
₹249/month
The intermediate commitment
₹649/6 months
The family upsell
₹2,999/year — up to 5 memorials
And I would not add ten more plans until real PITHROS data demonstrates a reason.
This also fits the current recurring-payment capability you were considering: Cashfree supports UPI AutoPay and other recurring rails, so the pricing decision can now be made independently of the gateway implementation. ([Cashfree](https://www.cashfree.com/recurring-payment/?utm_source=chatgpt.com))
The key thing is that ₹999 is not being selected because you suggested it. It has three independent arguments behind it: it sits below ₹1,000, it fits India's small-ticket digital-payment environment, and—most importantly—it is already an observed price point in the Indian online-memorial category. ([The Eternal Memory](https://theeternalmemory.com/pricing?utm_source=chatgpt.com))
I would therefore freeze this pricing and conversion architecture before integrating Cashfree. The next engineering task should be to change the current ZIP from its placeholder pricingPlans/lifetime architecture into this plan → subscription → entitlement → memorial-slot model, with the paywalls triggered by the actual PITHROS features rather than by arbitrary marketing screens.

PITHROS — Final Payment, Subscription, Monetization, Data-Rights & Compliance PRD
Document status: V1 implementation baseline / pricing-control document
Date: 30 September 2026
Scope: PITHROS memorial platform only
Gateway decision: Cashfree Payments
Legal/business assumption: Indian proprietorship / Udyam-registered MSME; not a Private Limited company
Primary market: India
Important: This document supersedes placeholder pricing, one-time/lifetime pricing language, simulated payment behavior, and placeholder payment services currently present in the project. It does not treat any placeholder amount or placeholder funeral/provider service in the repository as a commercial requirement.
0. Executive decisions — freeze before payment integration
0.1 Payment gateway
PITHROS V1 will integrate Cashfree Payments as the production payment gateway.
Razorpay remains out of the V1 payment path. The application may retain an adapter abstraction for future portability, but there must be one active production gateway and it must be Cashfree.
Cashfree's current product stack supports normal payment collection and recurring subscriptions, including UPI AutoPay, recurring cards and eNACH. Recurring plans can be configured for monthly, half-yearly and yearly cycles. The gateway's current public pricing and offer terms are mutable; the code must therefore never hard-code gateway fee assumptions into business pricing.
0.2 Business/payment boundary
PITHROS V1 collects money for PITHROS-owned memorial products and subscriptions.
PITHROS V1 does not collect customer funeral-service money and then distribute it to funeral providers.
Funeral-service providers may be listed in PITHROS and contacted by users, but the funeral-service transaction is a direct customer/provider transaction unless and until a separate marketplace/payment model is approved.
This keeps PITHROS V1 out of unnecessary split-settlement, vendor-payout, escrow and commission-payment complexity.
0.3 Final consumer pricing
These are the V1 pricing controls to implement. They are pilot prices selected for the product and market, not copied from repository placeholders and not presented as guaranteed optimal prices.
Product
Billing
Price
Entitlement
Free Memorial
No charge
₹0
1 memorial
Memorial Care
Monthly
₹249/month
1 memorial
Memorial Care
6 months
₹649/6 months
1 memorial
Memorial Care
Annual
₹999/year
1 memorial
Family Archive
Annual
₹2,999/year
Up to 5 memorials
Additional Memorial Slot
Annual add-on
₹499/year
+1 memorial slot
The ₹999/year Memorial Care plan is the default/hero plan.
The monthly plan is a flexibility option; the six-month plan is an intermediate commitment option.
Family Archive launches as annual-only. Do not build monthly and six-month family billing in V1 unless product evidence requires it.
0.4 Pricing psychology — operating principle
PITHROS will optimize conversion through:
Value demonstration before payment. A user creates a real memorial before being asked to pay.
Feature-triggered paywalls. Premium prompts appear when a user actually reaches a premium capability such as voice, HD video, expanded media, advanced archive or additional memorial slots.
Annual value framing. ₹999/year is the prominent choice and displays its arithmetic equivalent of about ₹83/month.
Commitment escape hatch. ₹249/month exists for users unwilling to commit annually.
Family sponsorship. The memorial owner can generate a secure payment link so another family member can pay for the memorial.
Transparent savings. Savings versus shorter billing periods can be shown only when mathematically correct.
No grief coercion. No fake scarcity, fake countdowns, fake popularity, fake original prices, threats of deletion, or emotional pressure involving the deceased.
No fake social proof. Do not label a plan "Most Popular" until actual PITHROS transaction data supports that statement.
Simple Indian checkout. UPI is first-class; cards and NetBanking remain available.
Clear recurring authorization. Auto-renew must be explicit, visible, cancellable and accompanied by applicable pre-debit notices.
The commercial objective is to make the user understand the value of continued memorial care. It is not to exploit bereavement.
1. Product positioning
1.1 Free product
Rename the existing "Free Forever" concept to:
Free Memorial
Do not make a perpetual-service promise through UI text such as "permanent," "forever," or "guaranteed for life."
The free memorial should remain useful enough to create organic distribution and family sharing.
Free Memorial V1
1 memorial
life story / biography
basic timeline
up to 25 photos
basic memorial page
privacy controls
tributes / condolences
basic sharing
basic QR/link access
no advertising
Limits are entitlement values and must be server-enforced. The frontend must never be the authority for a quota.
1.2 Paid product
Rename the premium concept to:
Memorial Care
Position it as an ongoing service for the evolving memorial archive, not as a storage fee.
Memorial Care unlocks the deeper parts of the existing product:
expanded/high-resolution photo capacity
voice memories
audio playback and preservation
HD video tributes / archival clips
expanded family collaboration
richer permissions and family roles
document review/verification workflow where applicable
digital legacy links
PDF Memory Book export
archive/export features
anniversary and milestone notifications
enhanced privacy/presentation controls
continued premium memorial capabilities
The repository already contains the underlying domain concepts for memorials, stories, timelines, legacy links, media, family roles, verification, tributes, privacy and audit events. The work in this PRD is to convert those capabilities into explicit commercial entitlements.
1.3 Family Archive
A billing account can own up to five memorial slots under:
Family Archive — ₹2,999/year
The Family Archive is a family-level subscription. It is not five unrelated user accounts.
Example:
Family Account ├── Memorial 1 — Grandfather ├── Memorial 2 — Grandmother ├── Memorial 3 — Father ├── Memorial 4 — Mother └── Memorial 5 — Sibling
Family collaborators do not create separate paid seats in V1. The value being sold is memorial capacity and preservation, not login-seat count.
1.4 Additional memorial slot
After the five Family Archive slots are consumed:
Additional Memorial Slot — ₹499/year
The initial implementation may restrict this to annual billing.
The add-on belongs to the billing account and creates one additional entitlement slot.
2. Repository baseline and mandatory replacement areas
The current repository contains a payment UX and adapter layer, but the payment path is still a demo/simulation and must not be promoted to production.
Known V1 replacement requirements include:
Pithros/src/services/payment/CashfreeGateway.ts
Pithros/src/services/payment/RazorpayGateway.ts
Pithros/src/services/payment/paymentService.ts
Pithros/src/hooks/useBilling.ts
Pithros/src/views/checkout/CheckoutView.tsx
Pithros/src/data/mockData.ts pricing/placeholder plan definitions
The existing Cashfree adapter currently fabricates gateway order/session identifiers and contains permissive signature acceptance logic. Those behaviors are demo-only and are explicitly prohibited in production.
The checkout currently reads plan amounts from frontend mock data, associates a payment directly with a memorial, simulates success/failure, and hard-codes an 18% GST calculation. Those behaviors must be removed from the authoritative payment path.
The current Users API exposes GET /me and PATCH /me but does not expose a true account-deletion workflow. The existing User and Memorial models have soft-delete support, which should be extended into a controlled data-rights lifecycle rather than treated as sufficient compliance by itself.
The current audit log is append-only and supports actor/entity/action/result plus before/after/reason metadata. Keep that design, but change deletion and billing flows so they generate the appropriate audit events without placing unnecessary personal data into immutable audit records.
3. Commercial architecture
3.1 Source of truth
The backend/database is the sole authority for:
plan identity
price
currency
billing interval
tax configuration
active/inactive state
entitlement limits
subscription state
billing period
payment state
renewal state
grace period
refund state
memorial-slot allocation
The browser may request a plan_price_id but must never be allowed to choose the amount.
3.2 No arbitrary amount from the client
The production API must reject or ignore:
customAmount frontendAmount frontendTax frontendDiscount frontendSubscriptionState frontendPaymentSuccess
The client sends only an allowed product/price identifier and relevant memorial slot information.
The server resolves:
price_id ↓ plan ↓ price ↓ currency ↓ tax rule ↓ entitlement
3.3 Price versioning
Never overwrite historical prices.
Use a price-record model:
plan_prices ------------- id plan_id billing_interval amount_minor currency version valid_from valid_until active
A subscription stores the exact price_id used for its current billing term.
A future price change must not silently mutate an existing paid subscription.
4. Pricing and conversion UX
4.1 Pricing page
Primary presentation:
MEMORIAL CARE ₹999 / year ₹83 / month equivalent [ Preserve This Memorial ] ₹649 / 6 months ₹249 / month
Annual is visually prominent because it has the lowest effective monthly cost.
The user must still be able to select monthly and six-month billing.
4.2 Savings copy
Correct arithmetic:
Monthly annualized: ₹249 × 12 = ₹2,988 Annual: ₹999 Difference: ₹1,989
For six months:
Monthly annualized for six months: ₹249 × 6 = ₹1,494 Six-month plan: ₹649 Difference: ₹845
Do not show savings against a made-up original price.
4.3 Family Archive display
Show:
Family Archive — ₹2,999/year
Up to 5 memorials
Use factual comparison:
5 individual Annual Memorial Care subscriptions 5 × ₹999 = ₹4,995 Family Archive ₹2,999 Family savings ₹1,996
Do not call it "40% OFF" unless the displayed calculation is kept synchronized with the active individual annual price.
4.4 Free-to-paid funnel
The intended funnel is:
Visitor ↓ Create memorial ↓ Upload story / photos / timeline ↓ Preview finished memorial ↓ Share with family ↓ Attempt premium capability ↓ Feature-specific explanation ↓ Memorial Care ↓ Cashfree checkout ↓ Verified payment ↓ Entitlement activation
4.5 Feature-triggered paywall examples
Voice
Preserve their voice, too.
Voice memories are included with Memorial Care.
₹999/year
Video
Keep this video with the memorial.
HD video preservation is included with Memorial Care.
₹999/year
Archive
Keep a copy of the memorial archive.
Archive export is included with Memorial Care.
Fifth-to-sixth memorial
Your Family Archive includes 5 memorials.
Add another memorial slot for ₹499/year.
These paywalls must explain the actual feature being requested. Do not use generic "Upgrade now" prompts wherever a feature-specific explanation is available.
4.6 Family sponsorship
A memorial steward may generate a payment link for another family member.
Memorial owner ↓ Create sponsorship payment link ↓ Family member opens link ↓ Cashfree checkout ↓ Payment verified ↓ Subscription/entitlement activates on billing account ↓ Receipt sent to payer
A sponsorship payment is a purchase of PITHROS Memorial Care. It must not be described as a donation.
The sponsor link must contain a cryptographically random, short-lived or otherwise revocable token and must not expose unnecessary memorial data.
5. Subscription domain model
5.1 Core entities
Implement or extend the backend with:
plans
id code name description product_type active created_at updated_at
Example codes:
MEMORIAL_CARE FAMILY_ARCHIVE ADDITIONAL_MEMORIAL
plan_prices
id plan_id billing_interval amount_minor currency version active valid_from valid_until
subscriptions
id billing_account_id plan_id price_id status gateway cashfree_subscription_id cashfree_schedule_id current_period_start current_period_end auto_renew grace_period_start grace_period_end cancel_at_period_end cancelled_at created_at updated_at
subscription_entitlements
id subscription_id max_memorials max_photos max_video_bytes max_audio_bytes max_documents max_contributors verification_enabled archive_export_enabled anniversary_notifications_enabled legacy_links_enabled premium_theme_enabled
memorial_entitlements
id billing_account_id memorial_id subscription_id slot_number status assigned_at released_at
This changes the domain from:
payment → memorial
to:
billing account ↓ subscription ↓ entitlements ↓ memorial slots ↓ memorials
5.2 Billing account
Introduce a billing-account abstraction even if V1 maps one-to-one to the user.
billing_accounts ---------------- id owner_user_id billing_email billing_name country currency tax_profile_id status created_at updated_at
This allows Family Archive and sponsored payments without redesigning the system later.
5.3 Payment records
payments
id billing_account_id subscription_id plan_price_id memorial_id nullable internal_order_id gateway cashfree_order_id cashfree_payment_id amount_minor currency status payment_method_type payment_method_masked failure_code failure_reason paid_at created_at updated_at
webhook_events
id gateway event_id event_type payload_hash payload_json signature_valid received_at processed_at processing_status retry_count last_error
event_id must be unique where Cashfree provides a stable event identifier.
invoices
id billing_account_id subscription_id invoice_number amount_minor tax_minor total_minor currency status issued_at due_at paid_at pdf_object_key nullable
Historical invoices must be immutable apart from explicit correction/void records.
refunds
id payment_id cashfree_refund_id amount_minor currency status reason requested_by approved_by created_at processed_at
6. Subscription state machine
6.1 Required states
PENDING ACTIVE PAST_DUE GRACE EXPIRED_READ_ONLY CANCELLED TERMINATED
Optional internal states:
PAUSED PAYMENT_PROCESSING RETRYING
6.2 State rules
PENDING
Payment/mandate is being created or awaiting first successful payment.
No premium entitlement is activated until the server has verified the successful payment.
ACTIVE
Premium features are available according to entitlement.
PAST_DUE
A scheduled renewal failed.
Premium features remain available while recovery attempts are being processed.
GRACE
Payment remains unresolved after initial retry attempts.
PITHROS continues to serve the memorial normally during the grace period.
EXPIRED_READ_ONLY
The paid period and grace period have ended without successful renewal.
Critical rule: this does not delete the account, memorial, media, tributes, story, timeline, verification history, or other user-generated content.
The memorial remains available according to its privacy/publication setting.
The user loses access to new premium operations, such as:
adding new premium-only media beyond free limits
creating additional paid memorial slots
premium-only editing features
new premium exports where applicable
premium notifications/automation
Existing content is not destroyed.
CANCELLED
The customer has explicitly disabled renewal.
The current paid period continues until its end unless a separate immediate-cancellation/refund policy is invoked.
TERMINATED
Reserved for administrative/legal/service-ending conditions. This must never be used simply because a renewal failed.
7. Failed-payment engineering
7.1 Hard rule
A failed payment must NEVER trigger deletion of a memorial or personal data.
Payment state and data-retention state are separate domains.
Do not implement:
payment_failed → delete_memorial
or:
subscription_expired → delete_user
7.2 Renewal timeline
Recommended default V1 policy:
T-30 days Renewal notice T-7 days Renewal notice T-1 day Renewal/pre-debit notice where applicable T0 Gateway attempts renewal T0 failure Subscription = PAST_DUE Premium access remains active T+1 day Retry/recovery attempt where permitted T+3 days Retry/recovery attempt where permitted T+7 days Final automated recovery attempt where supported T+7 to T+30 GRACE Manual renewal available T+30 EXPIRED_READ_ONLY No data deletion
The actual automated retry mechanics must use Cashfree's supported recurring-payment/retry mechanisms and must not conflict with the applicable mandate rules or duplicate-charge safeguards.
7.3 Payment-failure messages
Use neutral copy:
Your Memorial Care payment did not complete.
Your memorial remains safe. We'll keep premium access active during the recovery period.
Retry payment
Do not say:
"Pay now or your loved one's memories will be deleted."
Do not say:
"Your memorial is expiring."
unless what is actually expiring is only the subscription entitlement.
7.4 Manual recovery
For failed recurring payments provide:
Renew now Change payment method View invoice Cancel renewal Contact support
Manual renewal must create a new payment/order linked to the existing subscription instead of creating a second subscription accidentally.
7.5 Successful recovery
If payment succeeds during PAST_DUE/GRACE:
payment success ↓ verify server-side ↓ subscription = ACTIVE ↓ new period calculated ↓ entitlements restored ↓ failed-payment banner cleared
All memorials and media remain intact throughout.
8. Family Archive non-payment behavior
If a ₹2,999/year Family Archive subscription expires:
5 memorials ↓ subscription expires ↓ all 5 memorials retained ↓ all published/private content retained ↓ account enters EXPIRED_READ_ONLY
Do not automatically delete memorials 2–5.
Do not silently move them into another user's account.
Do not delete uploaded photos/videos merely because the family plan expired.
When the user renews Family Archive:
renew ↓ existing memorial-slot assignments restored ↓ full editing restored
If the account deliberately downgrades to a one-memorial plan, the account must receive an explicit disposition screen:
Choose how to handle additional memorials: [ Keep Family Archive ] [ Transfer a Memorial ] [ Archive/Read-only ] [ Delete a Memorial ]
Deletion is a separate explicit action and must run through the memorial-deletion workflow.
9. Payment integration — Cashfree
9.1 Production architecture
React frontend │ │ authenticated request ▼ FastAPI backend │ ├── resolves price from DB ├── validates billing account ├── validates memorial slot entitlement ├── creates internal order └── calls Cashfree server-to-server │ ▼ Cashfree Checkout / Subscription │ ▼ Customer │ ▼ Cashfree result/webhook │ ▼ FastAPI webhook │ signature verification │ idempotency check │ payment verification │ DB transaction/fulfilment │ ▼ Entitlement
9.2 Secrets
Cashfree credentials must exist only server-side.
Allowed locations:
production secret manager
server environment variables
deployment secret store
Forbidden:
Vite frontend environment bundles
React source
localStorage
URL parameters
analytics events
client logs
Git repository
The current demo secret-like values in CashfreeGateway.ts must be removed.
9.3 Server order creation
Client submits:
{ "plan_price_id": "memorial_care_annual_v1", "memorial_id": "optional UUID", "billing_account_id": "server-resolved" }
Server resolves the actual price.
The server creates:
internal_order_id cashfree_order_id amount_minor currency=INR plan_price_id billing_account_id subscription_id if recurring
9.4 Payment verification
The browser return/callback is not authoritative.
Payment is fulfilled only after one of:
verified Cashfree webhook + server-side verification; or
an explicit server-side Cashfree status lookup confirms the required terminal state.
The exact Cashfree API fields must follow the current Cashfree developer documentation at implementation time.
9.5 Webhook security
The webhook handler must:
capture the raw body exactly as received;
capture required Cashfree signature/timestamp headers;
verify the signature using Cashfree's official production verification method;
reject invalid signatures;
calculate/check event idempotency;
validate order/payment/subscription identifiers;
confirm amount and currency against the server order;
process the state transition transactionally;
record the event and processing result;
return the appropriate HTTP response only after the event has been safely accepted/recorded.
No startsWith() or "signature length > N" shortcut is allowed.
The current adapter's permissive demo signature checks must be deleted.
9.6 Idempotency
Example:
Cashfree sends SUCCESS Cashfree retries SUCCESS Cashfree retries SUCCESS
PITHROS must activate the subscription exactly once.
Use:
gateway_event_id UNIQUE
where available, plus unique constraints on stable gateway payment/order references.
9.7 Amount tampering defense
For every webhook/payment confirmation:
cashfree amount == internal order amount == price snapshot amount
If not equal:
payment = FLAGGED fulfilment = BLOCKED finance review = REQUIRED
Do not silently activate the subscription.
10. Recurring payment rules for India
PITHROS must use Cashfree's recurring-payment facilities rather than treating every renewal as a normal one-time payment.
Cashfree currently documents recurring collection through UPI AutoPay, cards and eNACH. The selected mandate mechanism must be explicit to the customer.
For recurring mandates, implement the applicable RBI e-mandate requirements. RBI's 22 August 2024 circular continues to require a pre-debit notification at least 24 hours before the actual debit for covered recurring transactions, except the specifically carved-out auto-replenishment cases. PITHROS is not an auto-replenishment wallet and therefore should assume the normal pre-debit-notification requirement applies to its subscription renewals unless its regulated payment provider handles an applicable exception.
Do not promise "silent renewals." The customer must see:
Plan: Memorial Care Amount: ₹999 Frequency: yearly Next charge date: <date> Auto-renew: ON How to cancel: <link>
A failed auto-debit must not be interpreted as consent cancellation unless the payment provider explicitly reports mandate cancellation/revocation.
11. Cancellation
11.1 User cancellation
The user must be able to cancel renewal from the account/billing screen.
Default behavior:
Cancel auto-renew ↓ auto_renew = false ↓ subscription remains ACTIVE until paid_period_end ↓ no future charge ↓ account falls back to EXPIRED_READ_ONLY
11.2 Immediate cancellation
If the business chooses to offer immediate cancellation, it must define the refund policy separately.
Cancelling auto-renew and requesting a refund are distinct actions.
11.3 Duplicate subscriptions
Before creating a new subscription, the backend must check for an existing ACTIVE/PENDING subscription covering the same entitlement.
Do not allow accidental double charging.
12. Refunds and disputes
12.1 V1 refund policy mechanics
Refund eligibility is governed by PITHROS's published refund policy and applicable law, not by a frontend button.
The implementation must support:
full refund
partial refund where commercially allowed
refund requested
refund approved
refund rejected
refund processing
refunded
refund failed
12.2 Gateway refund
The current mock processRefund() method must be replaced by a real Cashfree refund API call.
The internal system stores:
internal refund id cashfree refund id original payment id amount reason status timestamps operator
12.3 Charge disputes
Gateway disputes must enter the admin finance queue.
PITHROS must retain the minimum evidence necessary for dispute handling:
invoice
order reference
plan
payment reference
service activation timestamp
cancellation/refund history
applicable terms version
relevant consent/authorization evidence
Do not retain raw card details.
13. Tax and invoice architecture
The current frontend hard-codes:
GST (18% Applicable)
This must be removed from the frontend.
Tax calculation is a backend/accounting concern.
The application must support:
merchant tax profile ↓ product tax classification ↓ customer/billing tax context where needed ↓ tax rule ↓ subtotal ↓ tax ↓ total ↓ invoice
Do not assume 18% is universally correct for every future PITHROS product/service.
The product catalog must allow a CA/accounting administrator to configure the applicable tax treatment without modifying React code.
For ordinary taxable supplies, GST registration obligations depend on the facts, turnover and statutory exceptions. MSME/Udyam registration does not by itself determine GST registration status.
The PRD therefore requires a configurable tax engine and a finance-admin approval process, rather than embedding a legal tax rate in the UI.
14. Data model: payment versus personal data
PITHROS should minimize the personal data stored locally.
Cashfree should remain responsible for payment-instrument processing/tokenization as applicable.
PITHROS should store only what is necessary for:
order reconciliation
invoice generation
refund handling
fraud/dispute investigation
customer support
tax/accounting
subscription management
Never store:
full card number
CVV
PIN
UPI PIN
payment password
Store gateway references and masked method descriptors where useful.
15. India privacy/compliance baseline
15.1 Legal terminology
For privacy architecture use:
PITHROS = Data Fiduciary, subject to the factual/legal determination applicable to each processing activity.
Processors = vendors such as payment, authentication, storage, messaging, monitoring and infrastructure providers.
Data Principal = living person whose personal data PITHROS processes.
Memorial Subject = deceased person represented by a memorial. A Memorial Subject is not automatically the Data Principal of PITHROS merely because their information appears in a memorial.
This distinction is mandatory.
PITHROS must not casually assert that the DPDP Act grants a living relative an automatic right to erase every piece of information about a deceased person. The platform needs both:
a DPDP rights system for living Data Principals; and
a separate memorial dispute/takedown/privacy process for memorial subjects and family content.
15.2 DPDP Act status as of 30 September 2026
The Government's 13 November 2025 commencement notification, G.S.R. 843(E), phases the DPDP Act into force.
The notification states that, among other provisions:
sections 18–26 and specified provisions came into force on 13 November 2025;
section 6(9) and section 27(1)(d) are scheduled for one year after publication, i.e. 13 November 2026;
sections 3–5, 6(1)–(8) and (10), 7–10, 11–17 and other listed provisions are scheduled for eighteen months after publication, i.e. 13 May 2027.
Therefore, on 30 September 2026, PITHROS should implement the forthcoming rights and notice architecture now as an engineering standard, but must not inaccurately tell users that every provision has already become legally operative.
15.3 DPDP Rules 2025 status
G.S.R. 846(E), dated 13 November 2025, phases the Rules in a similar manner:
Rules 1, 2 and 17–21 apply from publication;
Rule 4 applies one year after publication;
Rules 3, 5–16, 22 and 23 apply eighteen months after publication, i.e. 13 May 2027.
The implementation should therefore be future-ready now.
16. Privacy notice and consent UX
16.1 Standalone notice
PITHROS must publish a standalone privacy notice in clear, plain language.
It should describe, in an itemized way:
account identity data
contact data
memorial content supplied by a user
uploaded photographs/media
verification documents
device/security information
payment/billing references
support messages
notification preferences
audit/security records
For each class, identify the relevant purpose.
16.2 No bundled consent
Do not use:
"By using PITHROS, you agree to everything."
Separate:
Terms acceptance
Privacy notice acknowledgement
optional marketing consent
notification consent/preferences
optional analytics consent where applicable
16.3 Consent record
Where consent is the processing ground, store:
consent_id user_id policy_type policy_version consent_state captured_at locale source ip_masked user_agent_hash/reference
Do not store more network information than required for the security/legal purpose.
16.4 Withdrawal
A user must be able to withdraw consent using an interface comparable in ease to giving consent where the applicable DPDP rules require this.
Withdrawal of consent does not automatically mean that all processing stops if another lawful basis or legal retention requirement applies. The product must display an explanation for material exceptions.
17. User rights center — mandatory product feature
Create:
Settings → Privacy & Data Rights
with:
My Data Privacy Notice Download My Data Correct My Data Delete My Account Delete Specific Data Withdraw Optional Consent My Grievances Nominee / Posthumous Rights
This must not be hidden in a footer-only form.
17.1 Data access/export
Provide an authenticated self-service export request.
Export should cover, where applicable:
account profile
memorials owned by the user or to which they are entitled to access
content authored by the user
uploaded media metadata
billing history/invoices
consent records
support requests
Do not export other people's private data merely because the requester contributed to the memorial.
The export engine must enforce the same authorization boundary as the UI.
17.2 Correction
Support correction of personal account information.
For memorial content, correction rights depend on the user's stewardship/contributor role. Apply the existing permission model.
17.3 Grievance
Provide a clearly discoverable grievance channel.
Store:
grievance_id user_id nullable category subject description status assigned_to created_at acknowledged_at resolved_at resolution_reason
Publish an appropriate contact for privacy/data-processing questions and grievances.
18. Account deletion — exact engineering behavior
18.1 User requirement
A user must be able to request deletion of their PITHROS account and personal data, subject to legally required retention and legitimate shared-content constraints.
The UI must not say:
"Contact support to delete your account"
when a self-service mechanism can safely be provided.
18.2 Delete endpoint
Add:
POST /api/v1/me/deletion-request
Recommended supporting endpoints:
GET /api/v1/me/deletion-request POST /api/v1/me/deletion-request/cancel GET /api/v1/me/export GET /api/v1/me/rights-requests POST /api/v1/me/consents/withdraw
The request must require recent re-authentication or equivalent high-confidence account verification.
18.3 Deletion states
REQUESTED VERIFIED SCHEDULED EXECUTING COMPLETED BLOCKED_BY_DISPOSITION LEGAL_HOLD REJECTED_WITH_REASON
18.4 Immediate security actions after verified request
Once a deletion request is verified:
revoke active sessions where appropriate
revoke authentication tokens where supported
disable new sign-ins during deletion
stop marketing/optional notification processing
stop future recurring billing/auto-renew
mark the account for deletion processing
create audit record
18.5 Billing behavior on account deletion
If the account has an active subscription:
Delete account request verified ↓ cancel future auto-renewal/mandate ↓ no new recurring charge ↓ process current period according to published cancellation/refund policy
Do not leave a hidden active recurring mandate behind after account deletion.
18.6 Erase account personal data
Subject to legally required retention:
Erase or anonymize the user's:
name
email
phone
avatar
Firebase/Pithros identity linkage
profile preferences
notification settings
optional analytics identifier
other directly identifying account fields
Do not merely set deleted_at and claim the account is erased.
Soft delete is an intermediate state, not automatically the final state.
19. Shared memorials and account deletion
This is one of the hardest PITHROS rules and must be designed explicitly.
A user's account can participate in memorials that also contain other people's contributions.
Therefore:
Deleting a user's account must not automatically delete a memorial that other authorized stewards still use.
19.1 If user is a contributor only
Remove/anonymize the user's personal account identity.
For their authored memorial content, apply the content disposition selected by policy and authorization:
preserve shared content + anonymize author OR remove the authored content
The selected behavior must be documented in the privacy notice and memorial terms.
19.2 If user is a co-steward
The memorial remains with the other authorized steward(s).
The deleting user is removed from the stewardship relationship.
19.3 If user is the sole steward
Before final account deletion, show:
You are the only steward of these memorials. Choose a disposition: [ Transfer stewardship to family member ] [ Delete memorial ] [ Keep memorial in restricted orphaned state ]
Transfer
Invite another user.
The transfer becomes effective only after acceptance and authorization checks.
Record:
old_steward new_steward requested_at accepted_at completed_at reason
Delete memorial
If the user has authority and explicitly chooses deletion, run the memorial deletion workflow.
Orphaned restricted state
If the user needs account deletion but does not designate another steward, the platform may move the memorial into an explicit restricted system-owned/orphaned state rather than blocking the person's account deletion indefinitely.
In that state:
the deleting user's personal data is erased/anonymized;
no new edits are allowed;
existing memorial state is preserved according to its privacy/publication settings;
a future authorized family claimant can request stewardship transfer;
the system does not infer a new owner.
This avoids forcing a person's account to remain open merely because they once administered a shared memorial.
20. Memorial deletion
A memorial is a separate object from the user's account.
20.1 Memorial deletion API
Use the existing authorization model and expose deletion only to an authorized steward.
The existing MemorialPermission.DELETE and stewardship-transfer concepts can be reused.
Recommended endpoint:
DELETE /api/v1/memorials/{memorial_id}
or an explicit request endpoint if immediate deletion is not appropriate.
20.2 Deletion sequence
Deletion request ↓ Authorization check ↓ Confirm memorial disposition ↓ Cancel any memorial-specific premium entitlement ↓ Remove public discovery/search entry ↓ Revoke public media URLs ↓ Delete/anonymize relational content ↓ Queue object-storage deletion ↓ Delete thumbnails/variants ↓ Delete verification evidence subject to retention rules/legal hold ↓ Mark deletion completed ↓ Audit event
20.3 Grace period for accidental deletion
Recommended V1 policy:
user requests deletion;
memorial enters DELETION_PENDING for 7 days;
during the period the user may cancel;
after the window, deletion is executed unless a legal hold or support investigation is active.
The product can use a shorter/longer period in configuration after operational testing.
Do not describe this grace period as a statutory DPDP deadline. It is a PITHROS safety control.
21. Right to erasure versus legal retention
The DPDP Act's section 12 provides for correction/erasure subject to circumstances where retention is necessary for the specified purpose or compliance with law.
Therefore the deletion engine must support exceptions rather than simply returning "cannot delete".
21.1 Data classes that may need controlled retention
Potential examples:
tax/accounting invoice records
payment reconciliation records
fraud/dispute evidence
security audit records
legally required records
incident records
records under legal hold
The system should retain the minimum necessary fields for the minimum necessary period.
21.2 Restricted retention store
Data retained for legal/security reasons should be logically separated using:
retention_reason legal_basis retention_until legal_hold_id nullable access_restriction
It should not remain fully usable as ordinary marketing/customer-profile data.
21.3 Anonymization
Where lawful retention is required, replace unnecessary personal identifiers with pseudonymous references.
Example:
original email ↓ pseudonymous customer reference
Do not use irreversible anonymization claims unless the data is actually rendered non-identifiable under the applicable standard.
22. Verification-document retention
Death certificates and relationship/identity evidence belong to the SENSITIVE storage tier.
The current project already separates sensitive document storage from normal media. Keep that separation.
Recommended V1 internal policy:
Verification submitted ↓ review complete ↓ document retained for operational appeal/support window ↓ secure deletion according to configured retention policy
Use a configurable retention period, initially proposed as 90 days after final verification decision, unless:
an appeal is open;
fraud/security investigation exists;
a legal hold exists;
a longer period is specifically required by law/accounting/contract.
This 90-day period is a PITHROS internal policy, not a claim that Indian law mandates 90 days.
The product must record why a document remains retained after the normal schedule.
23. Storage and deletion propagation
Deletion must reach every system that contains the data.
For a user deletion request, build a deletion job fan-out for:
PostgreSQL Firebase/Auth identity Cloudflare R2 object(s) Redis/cache entries search/index data notification queues Celery jobs email provider contact state where applicable analytics identifiers support records where applicable billing profile where legally erasable
23.1 Backups
Do not attempt destructive edits directly inside historical backup snapshots.
Instead:
record deletion tombstone;
prevent deleted data from being restored into an active system without reapplying deletion tombstones;
allow the normal backup lifecycle to expire the old backup copies;
document the backup retention period;
use the shortest operational retention consistent with disaster recovery and applicable legal/security requirements.
The deletion request should not remain falsely "incomplete" forever merely because an old backup snapshot still exists, provided the backup cannot be used as an active copy and the documented retention/legal basis is satisfied.
24. Audit logging and privacy
The existing audit system is append-only. Keep that property for security/audit integrity.
Do not write these into immutable audit detail fields unless absolutely necessary:
full email addresses
phone numbers
death certificates
access tokens
payment secrets
full user content
raw webhook payloads containing unnecessary personal data
Use:
actor_id actor_role entity entity_id action result reason request_id masked IP security metadata
For deletion:
USER_DELETION_REQUESTED USER_DELETION_VERIFIED USER_DELETION_EXECUTED MEMORIAL_TRANSFERRED MEMORIAL_DELETED DATA_EXPORT_GENERATED CONSENT_WITHDRAWN LEGAL_HOLD_APPLIED
For billing:
CHECKOUT_CREATED PAYMENT_AUTHORIZED PAYMENT_CONFIRMED PAYMENT_FAILED SUBSCRIPTION_ACTIVATED SUBSCRIPTION_RENEWAL_FAILED SUBSCRIPTION_GRACE_STARTED SUBSCRIPTION_EXPIRED_READ_ONLY SUBSCRIPTION_RENEWED SUBSCRIPTION_CANCELLED REFUND_REQUESTED REFUND_APPROVED REFUND_COMPLETED
Audit rows should remain immutable.
If a user is deleted, the actor_id can become NULL while the audit event remains with an opaque actor label/reference and minimal compliance/security metadata.
25. Security logs and CERT-In engineering
CERT-In's 28 April 2022 directions require covered entities to report specified cyber incidents within 6 hours of noticing the incident/being brought to notice and establish supporting logging/time-synchronization controls. CERT-In guidance also specifies maintaining logs of ICT systems for a rolling 180 days in the prescribed context.
The 2025 CERT-In MSME cyber-defense controls also direct MSMEs toward incident response, logging and the same six-hour reporting rule.
PITHROS should therefore engineer its operational environment as though these controls are applicable unless legal counsel/competent authority determines a narrower applicability for a particular entity/activity.
25.1 Required operational controls
NTP-synchronized clocks
centralized security logging
immutable or tamper-resistant log storage
log access controls
incident-response runbook
designated incident-response owner
CERT-In contact/process documentation
backup restoration procedure
breach evidence preservation
incident severity classification
25.2 Do not confuse two timelines
There are different regulatory workflows:
Cybersecurity incident → CERT-In process Personal-data breach → DPDP process when the applicable provisions/rules are in force User grievance → applicable grievance workflow Payment dispute → payment-gateway/consumer/financial workflow
Do not build a single generic "report breach" button and assume it satisfies all four.
26. DPDP security safeguards — implementation baseline
The 2025 DPDP Rules prescribe security safeguards such as encryption/obfuscation/masking/tokenization, access controls, logging/monitoring, backups and contractual security requirements for processors when the corresponding rules come into force.
PITHROS should implement these now.
26.1 Data at rest
PostgreSQL encrypted at infrastructure layer where supported
object storage encrypted
sensitive documents isolated into sensitive bucket
secrets stored outside source code
database credentials rotated
26.2 Data in transit
HTTPS/TLS for:
browser → API
API → Cashfree
API → Supabase/PostgreSQL where applicable
API → R2
API → Firebase
API → email/notification provider
26.3 Access controls
Use least privilege.
Sensitive document access should require explicit authorization.
Admin roles already distinguish finance, verification reviewer, moderator, provider manager, support, etc.; enforce those roles in backend authorization rather than relying on UI visibility.
26.4 Monitoring
Alert on:
abnormal login activity
repeated payment verification failures
webhook signature failures
sensitive-document access anomalies
mass deletion attempts
unexpected export volume
privilege escalation
repeated failed account-deletion authorization
27. Processor/vendor governance
Maintain a processor register.
Suggested table:
processors ---------- id name service processing_purpose data_categories location contract_status subprocessor_status security_review_status data_transfer_notes active
Initial vendors may include:
Cashfree
Firebase/Google authentication services
Cloudflare/R2
email provider
monitoring/error tracking
hosting/cloud infrastructure
any analytics processor
Contracts must define:
permitted purpose
security safeguards
confidentiality
breach notification
deletion/return on termination
subprocessor controls
access control
data location/transfer terms where relevant
28. International data transfers
The DPDP framework does not mean that every piece of data must automatically remain in India. The final Rules contain a framework under which transfers outside India remain subject to restrictions specified by the Central Government.
PITHROS should nevertheless keep the following principle:
Use India-based processing/storage where practical for primary account, audit and security data, and document every cross-border vendor/data flow.
Do not claim "100% data stored in India" unless the actual infrastructure configuration proves that claim.
For security logs subject to CERT-In requirements, ensure the relevant required logs are maintained in the prescribed Indian jurisdiction.
29. Memorial subject privacy policy
This must be separate from the user's DPDP rights.
A memorial can contain:
name
photographs
biography
dates
family information
social links
life history
location information
third-party tributes
The memorial subject may be deceased, while contributors and family members are living people.
PITHROS therefore needs a Memorial Privacy & Takedown Policy with processes for:
authorized steward requests
family disputes
impersonation reports
false/misleading memorial reports
privacy concerns
copyrighted media claims
unlawful-content reports
death-certificate disputes
requests to remove specific personal information about living people
court/law-enforcement orders
The service should not automatically equate "family member" with legal ownership. Where ownership/authority is disputed, preserve evidence and escalate through the appropriate process.
30. IT Act / Intermediary controls
Whether PITHROS qualifies as an "intermediary" under the Information Technology Act depends on how the final service operates.
Because PITHROS hosts user-generated memorials, photos, videos and tributes, the product should be engineered to support intermediary-grade controls unless counsel determines a different classification.
Use the current MeitY Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 as the operational reference.
Implement:
Terms/Rules of Use
Privacy Policy
content restrictions
abuse/report function
grievance channel
contact details
complaint tracking
moderation status
takedown workflow
evidence preservation
repeat-abuse controls
copyright/identity dispute intake
Do not market the platform as "government verified" or "legally certified" based solely on PITHROS's own verification process.
The current repository's verification subsystem explicitly distinguishes verification workflow from legal certification; preserve that distinction.
31. Verification and premium separation
Document verification must remain independent from pricing.
Do not implement:
paid plan → verification badge free plan → cannot be truthful
Instead:
verification workflow ↓ review ↓ verification outcome
Subscription controls may determine access to convenience/features around the memorial, but not whether a memorial is factually verified.
The existing project already contains explicit verification states and human-review history. Keep that architecture and add configurable evidence-retention rules.
32. Account deletion versus subscription expiration — hard separation
The backend must treat these as unrelated state machines.
Payment state machine
payment created ↓ payment succeeded/failed ↓ subscription active/past_due/grace/expired
Data lifecycle state machine
ACTIVE ↓ DELETION_REQUESTED ↓ VERIFIED ↓ SCHEDULED ↓ EXECUTING ↓ COMPLETED
A payment failure must never enter the data lifecycle automatically.
A data-deletion request must automatically cancel future recurring billing but should not create payment debt or charge a deleted user.
33. Data retention policy registry
Create a machine-readable retention configuration instead of scattered constants.
Example:
retention_policies ------------------ code data_class purpose retention_days legal_hold_allowed auto_delete active
Initial internal policy examples:
Data class
Proposed V1 policy
Account profile
Until account deletion, then erase/anonymize subject to legal retention
Active memorial
Until steward/user deletion request or lawful disposition
Memorial media
Until memorial/content deletion or lawful disposition
Verification evidence
90 days after final decision unless appeal/legal hold/law requires longer
Payment transaction reference
Retain as necessary for tax/accounting/dispute/legal obligations
Security/audit records
Per legal/security requirements and documented policy
Backups
Operational retention; deletion tombstones prevent reactivation
Marketing consent
Until withdrawal, plus limited evidence of consent/withdrawal
These internal retention periods are not represented as statutory deadlines.
34. Privacy request workflow
All privacy requests must become trackable objects.
data_rights_requests
id user_id request_type status submitted_at verified_at due_at completed_at rejection_reason legal_hold_id nullable operator_id nullable
Request types:
ACCESS CORRECTION ERASURE CONSENT_WITHDRAWAL NOMINATION GRIEVANCE
The service should target 30 calendar days for normal rights handling as an internal operational SLA, unless a shorter legally applicable deadline or a formally justified extension applies.
Do not misrepresent the 30-day target as a statutory DPDP deadline.
35. Nominee capability
DPDP section 14 provides a right for a Data Principal to nominate another individual to exercise rights in the event of death or incapacity, subject to the Act.
The Rules/sections come into operation according to the Government's phased commencement notification.
PITHROS should nevertheless add:
data_nominees
id user_id nominee_name nominee_email nominee_phone status verification_state nominated_at confirmed_at revoked_at
Important:
A DPDP data nominee is not automatically the owner of a memorial.
Keep:
Data Rights Nominee
separate from:
Memorial Steward
They may eventually be the same person, but the system must not assume this.
36. APIs required
Billing
GET /api/v1/billing/plans GET /api/v1/billing/subscription POST /api/v1/billing/checkout POST /api/v1/billing/sponsorship-links GET /api/v1/billing/invoices POST /api/v1/billing/cancel POST /api/v1/billing/renew
Gateway
POST /api/v1/webhooks/cashfree
Webhook endpoint must bypass ordinary user-auth middleware while using strict gateway signature validation and request-size controls.
Refund/admin
POST /api/v1/admin/billing/{payment_id}/refund GET /api/v1/admin/billing/failed-renewals GET /api/v1/admin/billing/reconciliation
Data rights
GET /api/v1/me/privacy GET /api/v1/me/export POST /api/v1/me/deletion-request GET /api/v1/me/deletion-request POST /api/v1/me/deletion-request/cancel POST /api/v1/me/consents/withdraw POST /api/v1/me/nominees GET /api/v1/me/rights-requests POST /api/v1/grievances
Memorial disposition
POST /api/v1/memorials/{id}/transfer-stewardship POST /api/v1/memorials/{id}/deletion-request DELETE /api/v1/memorials/{id} GET /api/v1/memorials/{id}/deletion-status
37. Authorization rules
Use backend authorization for every billing/data-right operation.
Payment
Only the billing account owner or authorized payer may:
subscribe
change billing cycle
cancel renewal
view invoices
request refund where policy permits
Memorial
Existing memorial permissions remain authoritative for:
edit
media management
contributor management
privacy
publish
archive
export
transfer
delete
Account deletion
Only the authenticated account owner can request account deletion.
Admin support cannot delete a user merely because an email request arrives; they must follow identity-verification and support procedures.
38. Payment UI states
The frontend must display server truth:
Loading Payment required Payment processing Payment successful Payment pending Payment failed Payment cancelled Renewal due Payment recovery Grace period Expired — memorial retained
Do not display "Success" because the browser returned from Cashfree.
Show success only when the backend has confirmed the entitlement.
Pending state
If the gateway response is delayed:
Payment verification is still in progress.
Your memorial is safe. We are checking the payment status.
Provide:
Refresh payment status
Do not create a second order automatically every time the user refreshes.
39. Subscription dashboard
The account billing screen must show:
Memorial Care ₹999/year Status: Active Renews: 30 Oct 2027 Auto-renew: ON [Manage renewal] [View invoice] [Cancel renewal]
If failed:
Memorial Care Status: Payment recovery Your memorial remains safe. Payment attempt: Failed Next recovery attempt: <date> Grace period ends: <date> [Renew now] [Update payment]
If expired:
Memorial Care Status: Read-only / Free access Your memorial and existing memories remain available. Premium editing and new premium additions are paused. [Renew Memorial Care] [Export available data]
40. Entitlement enforcement
Do not enforce premium access only in React.
Every write operation must check the server entitlement.
Examples:
POST /memorials/{id}/media → check media entitlement POST /memorials/{id}/voice → check voice entitlement POST /memorials/{id}/video → check video entitlement POST /memorials/{id}/archive-export → check archive entitlement POST /memorials/{id}/contributors → check contributor entitlement POST /memorials → check memorial-slot entitlement
The API must return a machine-readable reason such as:
{ "code": "ENTITLEMENT_REQUIRED", "plan": "MEMORIAL_CARE", "feature": "VOICE_MEMORIES" }
The frontend converts that into the appropriate feature-specific paywall.
41. Free downgrade rules
When a premium subscription expires:
Retain
memorial URL
memorial identity
biography
timeline
tributes
privacy setting
existing media metadata
existing uploaded media unless separately deleted/lawfully removed
family contributor history
verification history
audit records
payment/invoice records subject to retention rules
Restrict
new premium-only media uploads
premium-only feature edits
additional memorial creation
premium notification jobs
premium theme customization
other paid entitlements
The user should be clearly shown which operations are restricted and why.
42. Data deletion must survive subscription changes
Example:
User subscribed ↓ created memorial ↓ subscription expired ↓ memorial remains ↓ user deletes account ↓ account deletion workflow ↓ user personal data erased/anonymized ↓ memorial disposition applied
The system must never infer:
subscription expired → user wants data deleted
These are separate user decisions.
43. Email/notification requirements
The audit identified email as an operational gap. Payment subscriptions require a working transactional notification layer.
Minimum notifications:
Transactional
checkout created
payment success
payment failed
invoice generated
refund completed
renewal reminder
renewal success
renewal failure
grace period started
subscription expired/read-only
account deletion requested
account deletion completed
data export ready
grievance received
memorial stewardship transfer requested/accepted
Privacy
Marketing must not be required to receive transactional payment/security notices.
Marketing consent must be separately controlled.
44. Observability
At minimum track:
Funnel metrics
memorial_created pricing_viewed premium_feature_attempted paywall_shown checkout_started cashfree_session_created payment_success payment_failed subscription_activated subscription_renewed subscription_cancelled subscription_expired
Revenue metrics
MRR ARR-equivalent run rate new subscription revenue renewal revenue ARPU plan mix family-plan share refund rate payment-failure rate renewal-success rate
Privacy metrics
data_export_requests access_requests correction_requests erasure_requests completed_deletions legal_holds average rights-request handling time
Never put raw memorial content or personal data into analytics events unless essential and explicitly designed.
45. Recommended KPI definitions
Free → paid conversion
paid_new_accounts / eligible_new_free_accounts
Annual-plan share
annual_new_subscriptions / total_new_paid_subscriptions
Renewal rate
renewed_subscriptions_due_for_renewal ------------------------------------- subscriptions_eligible_for_renewal
Exclude cancelled-for-cause accounts and legal-hold cases according to a documented cohort rule.
Payment recovery rate
failed_renewals_recovered_before_expiry --------------------------------------- all_failed_renewals
Memorial retention
Track the percentage of memorials still accessible after a subscription lapse.
A high memorial-retention percentage is expected by design; retention of subscription is the commercial KPI.
46. Pricing experiments after launch
Do not change the base pricing every week.
For the first controlled pricing period:
CONTROL ₹999/year
Test only one variable at a time:
annual headline language
annual vs monthly default visual treatment
feature-specific paywall wording
family sponsorship CTA
annual savings presentation
checkout layout
Do not simultaneously change:
price features checkout brand copy
or the experiment becomes uninterpretable.
The pricing record in the database must support future versions without rewriting historical subscriptions.
47. Pricing psychology guardrails
Allowed
annual discount from arithmetic
showing effective monthly equivalent
emphasizing annual as best value
feature-specific value explanations
payment flexibility
family sponsorship
clear comparisons
reminders before renewal
personalized explanations based on actual user actions
Prohibited
fake scarcity
fake countdowns
fake testimonials
fake popularity
invented crossed-out prices
hidden recurring authorization
surprise renewal
deleting memorials because payment failed
hiding cancellation
creating friction specifically to prevent account deletion
threats involving the deceased
misleading claims that PITHROS is permanent/guaranteed forever
paid verification of factual death information
48. Legal documents required before production payment launch
At minimum:
Terms of Service Privacy Policy Refund/Cancellation Policy Payment/Subscription Terms Memorial Content Rules Memorial Privacy & Takedown Policy Grievance / Complaints Policy Verification Disclaimer Cookie/Tracking Policy where applicable
The payment checkout should link directly to:
Terms
Privacy
Refund/Cancellation
subscription/auto-renew explanation
Do not hide the renewal terms in a footer that requires leaving the checkout.
49. Privacy Policy content requirements
Explain:
who operates PITHROS;
categories of personal data collected;
why each category is processed;
what happens to uploaded memorial content;
how verification documents are handled;
payment processor involvement;
storage providers/processors;
security controls;
rights/request process;
retention/deletion;
grievance route;
international transfer information where applicable;
children's-data treatment where relevant;
contact information.
Use plain language and provide the required routes to exercise rights once the relevant DPDP rules apply.
50. Children's data
PITHROS may incidentally receive information about deceased or living minors in memorial content.
Do not assume memorial context makes children's-data requirements disappear.
For any feature intentionally aimed at, or knowingly processing, a living child's personal data, the implementation must incorporate the applicable verifiable-parental-consent and child-data restrictions when the relevant DPDP provisions are in force.
The product should minimize collection of unnecessary child personal data.
51. Admin console requirements
Billing
Overview Subscriptions Payments Failed renewals Refunds Invoices Reconciliation
Privacy
Data rights requests Deletion queue Exports Consent records Grievances Legal holds Retention jobs
Memorial integrity
Verification queue Moderation queue Takedown requests Stewardship transfer Content disputes
Audit
Payment events Security events Data-rights events Admin events
Finance staff should not automatically receive access to death certificates.
Verification staff should not automatically receive access to payment secrets.
Use role separation.
52. Database migration plan
Create a new migration after the existing verification migration sequence.
Recommended logical migration sequence:
0004_billing_catalog_and_subscriptions 0005_payment_webhooks_and_invoices 0006_memorial_entitlements 0007_data_rights_and_consent 0008_retention_and_legal_holds 0009_deletion_workflows 0010_billing_audit_indexes
Exact Alembic numbering may be consolidated if the implementation team prefers fewer migrations.
Required constraints
Examples:
gateway + gateway_order_id UNIQUE gateway + gateway_payment_id UNIQUE gateway + event_id UNIQUE subscription price reference NOT NULL amount_minor >= 0 currency valid subscription period coherent memorial slot unique per billing account/subscription where active
Use database constraints for integrity wherever practical.
53. Cache and asynchronous-job rules
Redis and Celery may be used for:
email jobs
renewal reminders
deletion fan-out jobs
storage deletion
archive generation
verification processing
notification delivery
But Redis is not the source of truth.
PostgreSQL is authoritative for:
subscription state
payment state
entitlement state
data-rights state
deletion state
Every asynchronous operation must be retryable and idempotent.
A deletion job that runs twice must not cause an inconsistent state.
A payment webhook that runs twice must not activate two subscriptions.
54. Job safety for deleted users
Every queued job must verify object/user status before execution.
Example:
renewal-email job queued ↓ user deleted before job executes ↓ job checks user/subscription ↓ cancel job / suppress send
Likewise:
archive-export job queued ↓ account deletion starts ↓ job re-checks authorization ↓ abort or complete only if legally/technically permitted
Do not let stale Celery tasks resurrect deleted data.
55. Search/index deletion
If the memorial or user is deleted:
primary DB delete/anonymize ↓ search_index_enabled = false / remove index entry ↓ search purge job ↓ verify no public discoverability
A privacy deletion job is incomplete until the public discovery layer has been handled.
56. Public URL and caching rules
For deleted/unpublished memorials:
return the correct HTTP status;
invalidate CDN/cache layers;
revoke signed media links where possible;
remove sitemap/index references;
remove structured metadata that exposes the deleted memorial;
purge cached HTML/API responses.
Do not rely on the database being deleted while an old public cache remains accessible indefinitely.
57. Data export package
A user export should preferably be delivered as an encrypted archive or authenticated download with a limited-time link.
Include:
profile.json memorials/ media/ tributes.json stories.json timeline.json legacy-links.json billing/ consents.json
Do not put internal security secrets or private data belonging to other contributors into the export.
Export generation itself is an audited action.
58. Payment reconciliation
A daily reconciliation process must compare:
PITHROS orders vs Cashfree settlements/reports vs bank settlement records where applicable vs refunds vs invoices
Flag:
PITHROS payment success without gateway success
gateway success without PITHROS entitlement
amount mismatch
duplicate payment references
unexpected refunds
settlement mismatch
subscription charge without active local subscription
This is essential for a small business because manual reconciliation mistakes are more likely than a sophisticated distributed-systems failure.
59. Subscription price-change policy
If PITHROS changes:
₹999/year → ₹1,199/year
the next renewal must not silently use ₹1,199 under a mandate that the customer authorized for ₹999 without following the gateway and applicable consent/mandate rules.
The system must support:
existing subscription ↓ old price remains for current period ↓ price-change notice ↓ required authorization/update ↓ new price applies to new billing period
This is another reason historical plan_prices must be immutable.
60. Free plan funding model
The free tier is intentional.
Its economic purpose is:
free memorial ↓ family sharing ↓ organic discovery ↓ premium feature usage ↓ Memorial Care conversion
PITHROS should not assume every free user must become paid.
Free users can still create:
search/discovery traffic
family invitations
tribute activity
referrals
future conversion opportunities
The operational problem is therefore not "make every visitor pay." It is:
Create enough value in free to drive distribution while reserving high-value ongoing capabilities for paid Memorial Care.
61. Subscription economics guardrail
The finance dashboard must calculate contribution margin approximately as:
subscription revenue − payment gateway costs − tax obligations where applicable − infrastructure allocation − notification/email costs − storage/media cost allocation − support/moderation cost allocation − refunds/chargebacks = contribution margin
Do not treat gross subscription cash as profit.
The ₹999 annual price has to survive the actual cost structure, not just look cheap to a customer.
The largest long-run variable risk is expected to be rich media/storage and operational support, not the CPU cost of the old i5 application server.
62. Production launch checklist
Business
Cashfree merchant onboarding approved
Proprietorship/Udyam/business proof accepted by Cashfree
settlement bank account configured
business contact details published
legal pages published
refund/cancellation policy published
subscription terms published
Payment
production Cashfree credentials configured server-side
sandbox payment tests passed
webhook signature verification tested
duplicate webhook tests passed
amount tampering tests passed
payment retry tests passed
refund tests passed
recurring mandate tests passed
cancellation tests passed
payment reconciliation tested
Pricing
placeholder ₹2,499, ₹6,999 etc. removed from authoritative product data
legacy one-time wording removed
Free Memorial = ₹0
Memorial Care = ₹249/month
Memorial Care = ₹649/6 months
Memorial Care = ₹999/year
Family Archive = ₹2,999/year
Additional Memorial Slot = ₹499/year
tax is backend-configured
Data rights
Privacy & Data Rights page
export request
account deletion request
account deletion verification
account deletion pipeline
memorial transfer workflow
memorial deletion workflow
consent withdrawal
grievance workflow
nominee model/future-ready implementation
retention registry
legal hold mechanism
Security
no gateway secret in frontend
no payment truth in localStorage
no mock success path in production
no permissive signature checks
sensitive bucket protected
security logs centralized
incident response runbook
CERT-In reporting process assigned
backup restore tested
63. Acceptance criteria — payment
The implementation is accepted only if all are true:
User cannot modify the payable amount from the browser.
User cannot create premium entitlement without server-confirmed payment.
Duplicate Cashfree webhooks do not create duplicate entitlements.
Invalid Cashfree signatures are rejected.
Cashfree success for ₹999 cannot activate a ₹2,999 family plan.
A failed payment never deletes memorial data.
A subscription expiry never deletes memorial data.
A renewal failure enters recovery/grace state.
Manual renewal restores the existing entitlement instead of creating an unintended second subscription.
Cancellation stops future renewal.
Historical invoices retain the exact historical price.
Refunds are represented as real gateway refunds, not locally fabricated success objects.
The frontend cannot mark a payment as successful by itself.
64. Acceptance criteria — data rights
An authenticated user can request account deletion without contacting support as the only route.
Account deletion triggers future-renewal cancellation.
User personal data is erased/anonymized where no retention exception applies.
Shared memorials with other stewards remain intact after a contributor's account deletion.
Sole-steward accounts must receive a memorial disposition flow.
Memorial deletion is explicit and separate from subscription expiration.
Verification documents are handled under a separate sensitive retention rule.
Search/discovery entries are purged after memorial deletion/unpublication.
Deleted data cannot be resurrected by stale queued jobs.
Audit logs retain security integrity while minimizing personal data.
Privacy requests have status tracking and an internal SLA.
Export does not expose other users' private data.
65. Acceptance criteria — nonpayment
Scenario A — monthly ₹249 payment fails
Payment fails → PAST_DUE → recovery attempts → grace period → premium remains active during recovery → EXPIRED_READ_ONLY if unrecovered → memorial remains → media remains → no deletion
Scenario B — annual ₹999 renewal fails
Same lifecycle.
Scenario C — Family Archive ₹2,999 renewal fails
5 memorials remain → account becomes read-only after grace → no memorial is deleted → renewal restores all 5 slots
Scenario D — user explicitly deletes account
re-authenticate → cancel recurring billing → export offered → stewardship disposition → erase/anonymize personal data → delete/retain shared memorial according to disposition → deletion audit event
Scenario E — user deletes a memorial
authorize → deletion confirmation → grace window → public index removal → object cleanup → database cleanup → completion audit
66. Implementation order
Do not integrate Cashfree first.
Implement in this order:
1. Freeze product/pricing catalog ↓ 2. Build plan_prices + subscriptions + entitlements ↓ 3. Convert memorial payment relationship to slot-based entitlement ↓ 4. Implement free/premium server enforcement ↓ 5. Implement failed-payment state machine ↓ 6. Implement account deletion/data-rights models ↓ 7. Implement memorial transfer/disposition ↓ 8. Implement retention/deletion workers ↓ 9. Replace mock payment layer with real Cashfree API ↓ 10. Implement webhooks/idempotency/reconciliation ↓ 11. Replace checkout UI ↓ 12. Implement email/reminder operations ↓ 13. Security/compliance test suite ↓ 14. Sandbox Cashfree certification/testing ↓ 15. Production cutover
This order prevents the gateway integration from becoming entangled with an unfinished subscription/domain model.
67. Explicit V1 non-goals
Do not implement as part of this payment milestone:
funeral-service marketplace settlement
customer funds held by PITHROS
escrow
split payments to providers
PITHROS wallet
stored customer balance
cash-on-delivery for memorial subscriptions
concierge memorial writing service
paid death verification
paid condolence messages
artificial scarcity systems
complex coupon engine
ten consumer plans
Kubernetes
microservice decomposition
replacing PostgreSQL with another database
These are intentionally outside V1.
68. Final PITHROS commercial model
PITHROS │ ┌───────────────┴───────────────┐ │ │ ▼ ▼ FREE MEMORIAL MEMORIAL CARE ₹0 recurring premium │ │ │ ┌───────────┼───────────┐ │ │ │ │ │ ₹249 ₹649 ₹999 │ /month /6 months /year │ ▼ family sharing │ ▼ premium feature use │ ▼ conversion │ ▼ recurring revenue │ ├───────────────┐ │ │ ▼ ▼ FAMILY ARCHIVE EXTRA SLOT ₹2,999/year ₹499/year │ ▼ 5 memorials
69. Final payment/data principle
The core system invariant is:
Money controls entitlement. Money does not control existence of the person's data.
Therefore:
PAYMENT SUCCESS → premium entitlement PAYMENT FAILURE → recovery → grace → read-only premium downgrade PAYMENT EXPIRY → retain memorial/data USER DELETION REQUEST → independent data-rights workflow MEMORIAL DELETION → explicit memorial disposition workflow LEGAL RETENTION → minimum necessary restricted retention
This is the central architectural decision of the PITHROS payment system.
70. Current authoritative sources for implementation/legal review
Use primary sources wherever possible and re-check them immediately before production launch because laws, commencement dates, gateway pricing and gateway APIs can change.
Digital Personal Data Protection Act, 2023 — India Code
[https://www.indiacode.nic.in/bitstream/123456789/22037/2/a2023-22.pdf](https://www.indiacode.nic.in/bitstream/123456789/22037/2/a2023-22.pdf)
G.S.R. 843(E), 13 Nov 2025 — DPDP Act commencement notification, MeitY
[https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf)
Digital Personal Data Protection Rules, 2025 — MeitY
[https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025)
G.S.R. 846(E), 13 Nov 2025 — DPDP Rules commencement
[https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf)
Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 — MeitY
[https://www.meity.gov.in/documents/orders-and-notices/notifications-on-information-technology-act-2000-its-rules-AOzATOtQWa](https://www.meity.gov.in/documents/orders-and-notices/notifications-on-information-technology-act-2000-its-rules-AOzATOtQWa)
CERT-In Directions under section 70B, 28 Apr 2022
[https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf](https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf)
CERT-In MSME cyber-defense controls
[https://www.cert-in.org.in/PDF/Elemental_Cyber_Defense_Controls_for_MSME.pdf](https://www.cert-in.org.in/PDF/Elemental_Cyber_Defense_Controls_for_MSME.pdf)
RBI — Processing of e-mandates for recurring transactions, 22 Aug 2024
[https://www.rbi.org.in/scripts/bs_circularindexdisplay.aspx/Scripts/BS_CircularIndexDisplay.aspx?Id=12722](https://www.rbi.org.in/scripts/bs_circularindexdisplay.aspx/Scripts/BS_CircularIndexDisplay.aspx?Id=12722)
Cashfree recurring payments
[https://www.cashfree.com/recurring-payment/](https://www.cashfree.com/recurring-payment/)
Cashfree payment gateway pricing
[https://www.cashfree.com/payment-gateway-charges/](https://www.cashfree.com/payment-gateway-charges/)
71. Legal implementation note
This PRD is an engineering specification, not legal advice. PITHROS should have an Indian lawyer/CA review at least:
business/entity structure;
GST/tax treatment of subscriptions and digital services;
Terms and refund policy;
DPDP Data Fiduciary/processor analysis;
memorial/deceased-person privacy and takedown policy;
IT Rules intermediary classification and grievance obligations;
CERT-In applicability and incident process;
payment-gateway merchant-category/onboarding requirements;
recurring-payment terms and consent language.
Engineering should nevertheless build the system to the stricter standards defined in this document rather than waiting until a legal complaint forces a redesign.
72. FINAL FREEZE
Gateway
Cashfree Payments.
Consumer pricing
Free Memorial ₹0 Memorial Care ₹249/month Memorial Care ₹649/6 months Memorial Care ₹999/year Family Archive ₹2,999/year Additional Memorial Slot ₹499/year
Primary price
₹999/year.
Billing architecture
Billing Account → Subscription → Entitlements → Memorial Slots → Memorials.
Failed payment
Recovery → Grace → EXPIRED_READ_ONLY; never delete memorial/data.
Account deletion
User-controlled, re-authenticated, auditable, processor-aware, legally retained data minimized, shared memorials handled separately.
Memorial deletion
Explicit, authorization-controlled, cancellable during grace window, fully propagated to storage/search/cache/queues.
Privacy
Build to DPDP Act/Rules requirements now, while respecting the Government's staged commencement dates; keep current IT Rules and CERT-In operational controls in scope.
Payment integration timing
Do not integrate production Cashfree until the pricing catalog, subscription schema, entitlement system, failed-payment state machine and deletion workflow have passed tests.
End of PRD
Yes. I would freeze the architecture now and not touch Cashfree integration until this PRD is accepted.
I inspected the supplied project and the payment layer is still demo-oriented: the current Cashfree adapter fabricates order/session references, the signature checks are permissive, and the checkout derives authoritative pricing from frontend data.
I therefore added a final implementation PRD to the project. It explicitly replaces the repository's placeholder/lifetime pricing and defines the subscription, failed-payment, downgrade, deletion, retention, audit, Cashfree webhook, and India privacy/compliance architecture.
What is now frozen
Payment gateway: Cashfree Payments.
Consumer pricing:
Product
Price
Free Memorial
₹0
Memorial Care — monthly
₹249/month
Memorial Care — 6 months
₹649
Memorial Care — annual
₹999/year
Family Archive — annual
₹2,999/year
Additional Memorial Slot
₹499/year
The important architecture is:
Billing Account ↓ Subscription ↓ Entitlements ↓ Memorial Slots ↓ Memorials
not:
Payment → Memorial
Failed-payment rule
This is now an explicit hard invariant:
Payment succeeds ↓ premium entitlement Payment fails ↓ PAST_DUE ↓ retry/recovery ↓ GRACE ↓ EXPIRED_READ_ONLY
At no point does:
payment_failed ↓ delete memorial
or:
subscription_expired ↓ delete user's data
The memorial, photos, videos, biography, timeline, tributes and existing content remain retained. After the grace period, premium operations are restricted; the memorial is not destroyed.
Account deletion is a completely separate state machine
User requests deletion ↓ Re-authentication ↓ Deletion verified ↓ Cancel future recurring billing ↓ Export option ↓ Resolve memorial ownership/stewardship ↓ Erase/anonymize user's personal data ↓ Propagate deletion through DB/storage/cache/search/jobs ↓ Completed
If the user is a contributor, deleting their account does not destroy a memorial shared with other family members.
If the user is the sole steward, PITHROS provides:
Transfer stewardship OR Delete memorial OR Restricted/orphaned memorial
That prevents the bad design where a person cannot delete their own account simply because they once administered a family memorial.
DPDP treatment
This is important because the legal timeline is not as simple as "the DPDP Act is already fully active."
The Government's 13 November 2025 commencement notification phases the DPDP Act: many substantive provisions, including sections 3–17, are scheduled for 13 May 2027, while certain other provisions came into force earlier. ([MeitY](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf?utm_source=chatgpt.com))
The DPDP Rules 2025 are similarly phased; Rules 3 and 5–16, 22 and 23 are scheduled for 13 May 2027. ([MeitY](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf?utm_source=chatgpt.com))
So the PRD takes the correct engineering approach:
Implement the future DPDP rights/notice/deletion architecture now, rather than waiting until May 2027 and redesigning the database.
The official Act includes the rights to access, correction/erasure, grievance redressal and nomination, which is why the PRD includes a dedicated Privacy & Data Rights area. ([India Code](https://www.indiacode.nic.in/bitstream/123456789/22037/2/a2023-22.pdf?utm_source=chatgpt.com))
It also deliberately distinguishes:
Living user = Data Principal
from:
Deceased person = Memorial Subject
That prevents PITHROS from making the legally dangerous assumption that a deceased person's memorial is automatically governed in exactly the same way as the living account holder's personal data.
Cybersecurity
The PRD also incorporates the operational side of India's cyber regime. CERT-In's directions require covered entities to report specified cyber incidents within 6 hours, and CERT-In's current MSME security guidance explicitly includes incident-management and reporting controls. ([CERT-In](https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf?trk=public_post_comment-text&utm_source=chatgpt.com))
Recurring payments
Cashfree is a good fit for this model because its current subscription infrastructure supports UPI AutoPay, recurring cards and eNACH, including periodic mandates. ([Cashfree](https://www.cashfree.com/recurring-payment/?utm_source=chatgpt.com))
For recurring payments, PITHROS must also respect the RBI e-mandate framework; RBI's current circular retains the requirement for a pre-debit notification at least 24 hours before covered recurring debits. ([Reserve Bank of India](https://www.rbi.org.in/scripts/bs_circularindexdisplay.aspx/Scripts/BS_CircularIndexDisplay.aspx?Id=12722&utm_source=chatgpt.com))
Files
Download the final PITHROS Payment + Subscription + Compliance PRD
Download the updated PITHROS project ZIP with the PRD appended
The ZIP was rebuilt with the PRD added under:
Pithros-Rememberence-Project/ └── docs/ └── PITHROS_FINAL_PAYMENT_SUBSCRIPTION_COMPLIANCE_PRD.md
The next engineering phase should implement this PRD in order: pricing catalog → subscriptions → entitlements → failed-payment state machine → deletion/retention system → Cashfree → webhooks → reconciliation → UI.
That order is deliberate. Do not let the coding agent start by wiring the Cashfree button into the current checkout.


dont chnage the uia nd ux themes and fonts append these

<ADDITIONAL_METADATA>
The current local time is: 2026-09-30T10:51:49+05:30.
</ADDITIONAL_METADATA>

---

## 73. FREE VS PAID CALIBRATION & VOICE-FIRST COMMERCIAL STRATEGY

### 73.1 The Strategic Problem of the Earlier Free Tier
The initial 25-photo, 10-milestone, 3-contributor free tier satisfied the complete job-to-be-done for most bereaved families, eliminating the economic inflection point needed for a recurring subscription model. 

### 73.2 The Core Product Rule
- **Free** = *"Create a memorial."* Basic identity, portrait, story, 10 photos, 5 timeline milestones, 1 family contributor, unlimited tributes, and basic privacy/sharing.
- **Paid** = *"Keep building and preserving the memorial archive."* Voice memories, spoken histories, expanded photo vault (500+ photos), 100 milestones, 20 contributors, PDF keepsake export, raw archive download, digital legacy links, and automated anniversary reminders.

### 73.3 Calibrated Feature Matrix

| Capability | Free Memorial (₹0) | Memorial Care (₹249 / ₹649 / ₹999) | Family Archive (₹2,999/yr) |
| :--- | :--- | :--- | :--- |
| **Memorial Slots** | 1 | 1 | Up to 5 |
| **Portrait / Cover** | Included | Included | Included |
| **Biography / Story** | Included | Included | Included |
| **Photos** | **10 photos** | **500 photos** | **2,500 photos** |
| **Timeline Milestones** | **5 events** | **100 events** | **500 events** |
| **Visitor Tributes** | **Unlimited** | **Unlimited** | **Unlimited** |
| **Family Contributors** | **Owner + 1** | **Owner + 20** | **Owner + 100** |
| **Voice Memories & Audio** | Gated | **Included (2 GB)** | **Included (10 GB)** |
| **Video Memories** | *Roadmap* | *Roadmap* | *Roadmap* |
| **PDF Keepsake Export** | Gated | Included | Included |
| **Raw Media Vault ZIP** | Gated | Included | Included |
| **Digital Legacy Links** | Gated | Included | Included |
| **Anniversary Reminders** | Gated | Included | Included |
| **Advanced Privacy / Roles**| Gated | Included | Included |

### 73.4 Voice Memory as the Flagship Commercial Feature
PITHROS possesses a dedicated audio player, waveform visualizer, transcripts, and voice memory UI. Voice preservation is an intensely emotional differentiator—families are preserving the sound of their loved one's actual voice. This is the centerpiece of Memorial Care.

### 73.5 Video Memory Truth
While the backend validator accepts `.mp4`, `.mov`, and `.webm`, video is not yet an end-to-end user-facing memorial workflow. It must not be marketed or sold in V1 until the full transcoding, poster generation, and player experience is fully implemented.

### 73.6 Natural Paywall Moments
1. **Photo 11**: *"Your memorial is growing. Free Memorial includes 10 photos. Memorial Care lets your family continue preserving the full photo collection."*
2. **Voice Memories**: *"Preserve their voice. Memorial Care includes voice memories, speeches, and spoken histories."*
3. **Archive Export**: *"Download complete keepsake. High-resolution PDF book and raw archive vault are included with Memorial Care."*
4. **Digital Legacy**: *"Connect their digital legacy across YouTube, professional records, and web archives."*
5. **Anniversary Reminders**: *"Automated milestone and remembrance reminders for family members."*
6. **Additional Contributors**: *"Invite extended family, archivists, and biographers to collaborate."*
