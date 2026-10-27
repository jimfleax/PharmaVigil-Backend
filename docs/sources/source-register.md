# Source Register

Research captured **2026-10-27**. Recheck before implementation. Authority of a source does not imply permission to reuse its data in a product.

| ID | Source | Finding | Caveat |
|---|---|---|---|
| S1 | WHO, Medication Without Harm policy brief, 7 Mar 2024 — https://www.who.int/publications/i/item/9789240062764/ | Medication safety is a global patient-safety priority; focus includes high-risk situations, polypharmacy, transitions. | Background, not product validation or market evidence. |
| S2 | WHO, Medication safety in high-risk situations, 5 Jun 2019 — https://www.who.int/initiatives/medication-without-harm/medication-safety-in-high-risk-situations | Describes medication, provider/patient, and system factors. | Not a rule dataset. |
| S3 | IPC, Release of NFI 2026 — https://www.ipc.gov.in/mandates/nfi/release-of-national-formulary-of-india-2026.html | NFI 2026 released 21 Sep 2026; listed prices for digital, print, bundle. | Not proof of free API or bulk reuse rights. |
| S4 | IPC, About NFI — https://ipc.gov.in/mandates/nfi/about-nfi.html | Describes NFI as guide for prescribing, dispensing, administering. | Check terms before copying data/text. |
| S5 | PIB, DPDP Rules 2025 notified — https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190655&lang=2&reg=48 | Rules notified 14 Nov 2025. | Check Gazette and counsel for exact obligations. |
| S6 | MeitY Gazette, G.S.R. 843(E), 13 Nov 2025 — https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf | Commencement is phased; different provisions have different dates. | Legal review before real deployment. |
| S7 | Hono Vercel deployment docs — https://hono.dev/docs/getting-started/vercel | Documents Hono deployment path. | Verify current template/runtime. |
| S8 | MongoDB Atlas Free Cluster limits — https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/ | Includes 0.5 GB storage and possible idle deactivation. | Recheck current plan, region, quotas, persistence. |
| S9 | Vercel Hobby plan — https://vercel.com/docs/plans/hobby | Documents usage allowances and restrictions. | Check intended-use eligibility and limits. |
| S10 | Vercel limits — https://vercel.com/docs/limits | Platform usage limits. | Recheck before deployment. |
| S11 | Next.js authentication guide — https://nextjs.org/docs/app/guides/authentication | Server actions and route handlers need authorization checks. | Frontend checks do not replace backend authorization. |
| S12 | OWASP Session Management Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html | Secure cookie, entropy, server-side expiry, renewal guidance. | Test actual deployment topology. |
| S13 | OpenAPI Initiative FAQ — https://www.openapis.org/faq | Retrieved page identifies OpenAPI 3.1.1 as published 24 Oct 2024. | Pin compatible spec/validator version. |

## Not yet verified
- ABDM Drug Registry API access, license, terms, endpoint availability, and interaction-rule coverage. Official starting points: https://drugregistry.abdm.gov.in and https://drugregistrysbx.abdm.gov.in/dr/v3. Do not assume interaction data exists.
- Commercial drug-interaction data license; none selected.
- Competitor set, pricing, market size, customer demand, and differentiation.
- OCR library and license.
- Legal applicability for a real pilot.

## Research integrity rules
Record source URL and access date. Distinguish guidance from data reuse permission. Never import commercial datasets without verified license. Never claim clinical approval based solely on a citation.
