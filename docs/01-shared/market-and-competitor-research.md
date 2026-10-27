# Market and Competitor Research — Preliminary Research Brief

**Evidence status:** Preliminary desk research, not a market-size study and not proof of demand.

## Problem context
WHO’s Medication Without Harm work identifies medication safety as a global patient-safety priority and emphasizes high-risk situations, polypharmacy, and transitions of care [S1, S2]. This supports investigating the problem area; it does not validate this product or commercial opportunity.

## India-specific reference landscape

### National Formulary of India 2026
The Indian Pharmacopoeia Commission says NFI 2026 was released on 21 September 2026 in print and digital versions and describes it as an authoritative guide for prescribing, dispensing, and administering medicines [S3, S4]. IPC lists digital at ₹660 + GST, print at ₹800, and combined print/digital at ₹1,000 + GST [S3]. This is a reference resource, not evidence of a machine-readable interaction API. Check access and reuse terms before incorporating content.

### ABDM Drug Registry
The ABDM Drug Registry is a research lead for medicine identity/catalogue normalization. Verify API access, identifiers, sandbox availability, terms, rate limits, versioning, and reuse directly from the official registry. A catalogue is not necessarily a drug–drug or food–drug interaction knowledge base. No production integration is included in the one-day prototype. Starting points: https://drugregistry.abdm.gov.in and https://drugregistrysbx.abdm.gov.in/dr/v3.

### Privacy regulation
India notified the Digital Personal Data Protection Rules, 2025 in November 2025 [S5]. The Act’s commencement notification uses phased dates [S6]. Do not say all provisions apply on the same date; verify the exact provision and date with counsel before any real pilot. This prototype uses synthetic data and is not a legal compliance determination.

## Competitor research approach
Do not invent a competitor list, market size, market share, pricing, or superiority claims without evidence. Conduct a separate structured review of:
- Hospital information systems and EHR medication modules.
- Pharmacy dispensing systems with interaction checking.
- Drug reference and clinical decision-support products available in India.
- Medication reconciliation and e-prescribing products.
- Public-sector digital health infrastructure and drug registries.

For each candidate record vendor/product, geography, buyer, care setting, drug coverage, evidence provenance, integration, deployment, human review/override, data terms, pricing source, access date, confidence, and unknowns.

## Customer discovery hypotheses
1. Pharmacists may need a traceable way to confirm prescription text and route concerns.
2. Hospitals may value explicit incomplete/unsupported states over binary pass/fail.
3. Clinical governance and data licensing may be harder than OCR.
4. Existing hospital/pharmacy systems may already provide relevant features; differentiation must be validated.
5. Outpatient and inpatient workflows may differ substantially.

## Validation questions
- What system owns the medication list?
- How are interactions/allergies checked today?
- Who may resolve each alert class?
- What is the manual escalation rate and time?
- Which alerts are actionable and what is the false-positive burden?
- Which integrations/audit evidence are mandatory?
- Who is buyer, user, and accountable clinical owner?
- Which data sources are licensed for software use?

## Conclusion
There is a credible problem area to investigate, but product-market fit, competitor differentiation, willingness to pay, and source-data feasibility remain unvalidated. Do not state TAM/SAM/SOM until a sourced bottom-up model is built.
