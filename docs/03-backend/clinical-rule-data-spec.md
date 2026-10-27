# Clinical Rule Data Specification

## Purpose
A small curated **illustrative** ruleset for software demonstration only. It is not a clinical reference database and must not be represented as validated clinical decision support.

## Conceptual rule record
```json
{
  "ruleId": "ILLUSTRATIVE-DDI-001",
  "ruleVersion": 1,
  "category": "DRUG_DRUG",
  "status": "ILLUSTRATIVE_NOT_VALIDATED",
  "trigger": {"ingredientIds": ["ingredient-a"], "requiresAll": false},
  "otherTrigger": {"ingredientIds": ["ingredient-b"], "requiresAll": false},
  "conditions": [],
  "requiredContext": [],
  "severity": "MODERATE",
  "rationale": "Illustrative explanation; not clinical guidance.",
  "recommendedNextAction": "Doctor review required.",
  "evidenceReferences": [{
    "sourceId": "SRC-EXAMPLE",
    "title": "Source title",
    "publisher": "Publisher",
    "url": "https://example.invalid/source",
    "locator": "section/page/entry",
    "accessedAt": "2026-10-27",
    "licenseStatus": "UNVERIFIED",
    "evidenceStrength": "NOT_ASSESSED"
  }],
  "limitations": ["Illustrative only", "Not independently clinically validated"],
  "review": {"reviewerId": null, "reviewedAt": null, "approvalStatus": "NOT_REVIEWED"}
}
```
This is schema illustration only; `example.invalid` is not a source and must never ship as an actual evidence reference.

## Required metadata
Stable rule ID/version; category; canonical ingredient IDs and matching semantics; typed conditions and required context; severity/rationale/next action; source publisher/URL/locator/access date/license status; evidence strength; limitations; governance status; reviewer identity/approval time; publication time; ruleset version.

## Matching
- Normalize aliases only through explicit catalogue mappings.
- Brand is not ingredient.
- Expand combination products into explicitly mapped ingredients.
- Unknown composition => `UNSUPPORTED` or `INCOMPLETE`.
- Do not infer class equivalence or clinical cross-reactivity without explicit reviewed mapping.
- Deduplicate identical ingredients for pair evaluation but retain product traceability.
- OCR confidence, medicine-match confidence, and evidence strength are separate.

## Context
Each rule declares required context. Missing/unknown required input is not false; return `INCOMPLETE` unless the rule explicitly documents why the input is unnecessary.

## Coverage
For each category return `EVALUATED_WITH_MATCHES`, `NO_MATCHING_SEEDED_RULE`, `INCOMPLETE`, `UNSUPPORTED`, `NOT_EVALUATED`, or `FAILED`, plus limitations and rule-set version. Do not show percentages unless a defensible denominator exists.

## Governance
Draft → review → approval → publish → retire. Published rule sets are immutable. Corrections create new versions; previous check results preserve their old rule version and evidence snapshot. Retiring an incorrect rule must identify open cases that may need re-evaluation. Without qualified reviewer, status remains `ILLUSTRATIVE_NOT_VALIDATED`.

## Seed policy
Use only rules with verified reuse rights or original illustrative content authored for the prototype. Never scrape commercial databases. Every fixture has expected output and rationale. Engine is deterministic and has no hidden network dependency.
