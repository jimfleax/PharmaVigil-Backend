# Research Findings and Open Questions

Research captured 2026-10-27. Recheck sources before implementation or real pilot.

## Findings from authoritative pages
1. **WHO medication safety:** WHO’s Medication Without Harm work emphasizes high-risk situations, polypharmacy, and transitions of care [S1/S2]. This is background context, not proof of product effectiveness.
2. **NFI 2026:** IPC says the seventh edition was released 21 September 2026 in print and digital formats and lists prices. IPC describes NFI as guidance for prescribing, dispensing, and administering medicines [S3/S4]. This does not establish a free machine-readable interaction API or reuse rights.
3. **DPDP Rules:** Rules were notified in November 2025; the Act’s commencement schedule is phased [S5/S6]. Exact legal obligations need current review.
4. **Hosting candidates:** Hono documents Vercel deployment; Vercel Hobby has usage/eligibility limits; MongoDB Atlas free clusters have storage and idle-cluster limitations [S7–S10]. These are candidates requiring validation.
5. **Session/auth guidance:** Next.js recommends authorization checks for server actions/route handlers; OWASP documents secure server-side session practices [S11/S12].
6. **API contract:** OpenAPI is the chosen contract-first format; pin a compatible specification and validator version [S13].

## Medication knowledge sources
NFI is not proven by this research to be a licensed machine-readable interaction engine. The ABDM Drug Registry may help normalize medicine identities, but access terms, API behavior, and interaction coverage remain unverified. Do not conflate a medicine catalogue with an interaction knowledge base.

For a one-day prototype, use a small, explicitly illustrative ruleset authored for the demo unless reuse rights for a source are verified. Keep rules labelled not clinically validated unless a qualified reviewer reviews and approves them.

## Research questions before a real pilot
- Does the source permit commercial use, transformation, storage, caching, and redistribution?
- Is coverage complete for Indian brands, strengths, dosage forms, and combinations?
- Does it provide interaction rules or only monographs/catalogue entries?
- What reviewer credentials, update cadence, and correction process are needed?
- Which Indian health data/software regulatory obligations apply to intended deployment and claims?
- What are current host limits, regions, inactivity behavior, cookie topology, and database constraints?
