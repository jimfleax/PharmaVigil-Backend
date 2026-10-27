import type { Db } from 'mongodb';
import type { MedicationCatalogItem } from '../domain/medicine-matching/types.js';
import type { ClinicalRuleSet } from '../domain/rule-engine/types.js';

export const SYNTHETIC_CATALOGUE_ITEMS: MedicationCatalogItem[] = [
  {
    _id: 'cat-metformin-500',
    canonicalIngredientIds: ['ing-metformin'],
    productType: 'SINGLE_INGREDIENT',
    brandNames: ['Glucophage', 'Fortamet'],
    synonyms: ['metformin hydrochloride', 'metformin HCl'],
    strengths: [{ value: 500, unit: 'mg' }],
    dosageForms: ['TABLET'],
    routes: ['ORAL'],
    ingredientCompositionStatus: 'VERIFIED_FOR_DEMO',
    sourceRefs: [
      {
        sourceId: 'SRC-DEMO-01',
        description: 'Illustrative catalogue presentation',
      },
    ],
    catalogueVersion: '2026-ILLUSTRATIVE-1.0',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    _id: 'cat-metformin-850',
    canonicalIngredientIds: ['ing-metformin'],
    productType: 'SINGLE_INGREDIENT',
    brandNames: ['Glucophage', 'Riomet'],
    synonyms: ['metformin hydrochloride', 'metformin HCl'],
    strengths: [{ value: 850, unit: 'mg' }],
    dosageForms: ['TABLET'],
    routes: ['ORAL'],
    ingredientCompositionStatus: 'VERIFIED_FOR_DEMO',
    sourceRefs: [
      {
        sourceId: 'SRC-DEMO-01',
        description: 'Illustrative catalogue presentation',
      },
    ],
    catalogueVersion: '2026-ILLUSTRATIVE-1.0',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    _id: 'cat-ramipril-2-5',
    canonicalIngredientIds: ['ing-ramipril'],
    productType: 'SINGLE_INGREDIENT',
    brandNames: ['Altace', 'Cardace'],
    synonyms: ['ramipril'],
    strengths: [{ value: 2.5, unit: 'mg' }],
    dosageForms: ['CAPSULE'],
    routes: ['ORAL'],
    ingredientCompositionStatus: 'VERIFIED_FOR_DEMO',
    sourceRefs: [
      {
        sourceId: 'SRC-DEMO-01',
        description: 'Illustrative catalogue presentation',
      },
    ],
    catalogueVersion: '2026-ILLUSTRATIVE-1.0',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    _id: 'cat-ramipril-5',
    canonicalIngredientIds: ['ing-ramipril'],
    productType: 'SINGLE_INGREDIENT',
    brandNames: ['Altace', 'Cardace'],
    synonyms: ['ramipril'],
    strengths: [{ value: 5, unit: 'mg' }],
    dosageForms: ['CAPSULE'],
    routes: ['ORAL'],
    ingredientCompositionStatus: 'VERIFIED_FOR_DEMO',
    sourceRefs: [
      {
        sourceId: 'SRC-DEMO-01',
        description: 'Illustrative catalogue presentation',
      },
    ],
    catalogueVersion: '2026-ILLUSTRATIVE-1.0',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    _id: 'cat-spironolactone-25',
    canonicalIngredientIds: ['ing-spironolactone'],
    productType: 'SINGLE_INGREDIENT',
    brandNames: ['Aldactone'],
    synonyms: ['spironolactone'],
    strengths: [{ value: 25, unit: 'mg' }],
    dosageForms: ['TABLET'],
    routes: ['ORAL'],
    ingredientCompositionStatus: 'VERIFIED_FOR_DEMO',
    sourceRefs: [
      {
        sourceId: 'SRC-DEMO-01',
        description: 'Illustrative catalogue presentation',
      },
    ],
    catalogueVersion: '2026-ILLUSTRATIVE-1.0',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    _id: 'cat-potassium-cl-600',
    canonicalIngredientIds: ['ing-potassium-chloride'],
    productType: 'SINGLE_INGREDIENT',
    brandNames: ['K-Lyte', 'Potklor'],
    synonyms: ['potassium chloride'],
    strengths: [{ value: 600, unit: 'mg' }],
    dosageForms: ['TABLET'],
    routes: ['ORAL'],
    ingredientCompositionStatus: 'VERIFIED_FOR_DEMO',
    sourceRefs: [
      {
        sourceId: 'SRC-DEMO-01',
        description: 'Illustrative catalogue presentation',
      },
    ],
    catalogueVersion: '2026-ILLUSTRATIVE-1.0',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    _id: 'cat-amoxicillin-500',
    canonicalIngredientIds: ['ing-amoxicillin'],
    productType: 'SINGLE_INGREDIENT',
    brandNames: ['Amoxil', 'Moxatag'],
    synonyms: ['amoxicillin trihydrate'],
    strengths: [{ value: 500, unit: 'mg' }],
    dosageForms: ['CAPSULE'],
    routes: ['ORAL'],
    ingredientCompositionStatus: 'VERIFIED_FOR_DEMO',
    sourceRefs: [
      {
        sourceId: 'SRC-DEMO-01',
        description: 'Illustrative catalogue presentation',
      },
    ],
    catalogueVersion: '2026-ILLUSTRATIVE-1.0',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    _id: 'cat-augmentin-625',
    canonicalIngredientIds: ['ing-amoxicillin', 'ing-clavulanic-acid'],
    productType: 'COMBINATION',
    brandNames: ['Augmentin'],
    synonyms: ['amoxicillin clavulanate'],
    strengths: [{ value: 625, unit: 'mg' }],
    dosageForms: ['TABLET'],
    routes: ['ORAL'],
    ingredientCompositionStatus: 'VERIFIED_FOR_DEMO',
    sourceRefs: [
      {
        sourceId: 'SRC-DEMO-01',
        description: 'Illustrative combination presentation',
      },
    ],
    catalogueVersion: '2026-ILLUSTRATIVE-1.0',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    _id: 'cat-warfarin-5',
    canonicalIngredientIds: ['ing-warfarin'],
    productType: 'SINGLE_INGREDIENT',
    brandNames: ['Coumadin', 'Jantoven'],
    synonyms: ['warfarin sodium'],
    strengths: [{ value: 5, unit: 'mg' }],
    dosageForms: ['TABLET'],
    routes: ['ORAL'],
    ingredientCompositionStatus: 'VERIFIED_FOR_DEMO',
    sourceRefs: [
      {
        sourceId: 'SRC-DEMO-01',
        description: 'Illustrative catalogue presentation',
      },
    ],
    catalogueVersion: '2026-ILLUSTRATIVE-1.0',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    _id: 'cat-aspirin-75',
    canonicalIngredientIds: ['ing-aspirin'],
    productType: 'SINGLE_INGREDIENT',
    brandNames: ['Disprin', 'Ecosprin'],
    synonyms: ['acetylsalicylic acid'],
    strengths: [{ value: 75, unit: 'mg' }],
    dosageForms: ['TABLET'],
    routes: ['ORAL'],
    ingredientCompositionStatus: 'VERIFIED_FOR_DEMO',
    sourceRefs: [
      {
        sourceId: 'SRC-DEMO-01',
        description: 'Illustrative catalogue presentation',
      },
    ],
    catalogueVersion: '2026-ILLUSTRATIVE-1.0',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    _id: 'cat-synthetic-broken-combo',
    canonicalIngredientIds: ['ing-pseudoephedrine'], // Broken combo: only 1 ingredient
    productType: 'COMBINATION',
    brandNames: ['SinusClear'],
    synonyms: ['sinus clear combination'],
    strengths: [{ value: 10, unit: 'mg' }],
    dosageForms: ['TABLET'],
    routes: ['ORAL'],
    ingredientCompositionStatus: 'UNKNOWN',
    sourceRefs: [],
    catalogueVersion: '2026-ILLUSTRATIVE-1.0',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
];

export const SEEDED_ILLUSTRATIVE_RULESET: ClinicalRuleSet = {
  ruleSetId: 'ruleset-illustrative-2026-v1',
  version: '2026-ILLUSTRATIVE-1.0',
  status: 'ILLUSTRATIVE_NOT_VALIDATED',
  publishedAt: '2026-10-27T00:00:00.000Z',
  rules: [
    // 1. Potassium Chloride + Spironolactone (Severe Hyperkalemia)
    {
      ruleId: 'ILLUSTRATIVE-DDI-001',
      ruleVersion: 1,
      category: 'DRUG_DRUG',
      status: 'ILLUSTRATIVE_NOT_VALIDATED',
      trigger: { ingredientIds: ['ing-potassium-chloride'], requiresAll: false },
      otherTrigger: { ingredientIds: ['ing-spironolactone'], requiresAll: false },
      requiredContext: ['MEDICATION_HISTORY_CONFIRMED'],
      severity: 'CRITICAL',
      rationale:
        'Concomitant administration of potassium supplements with potassium-sparing diuretics (spironolactone) significantly increases the risk of severe life-threatening hyperkalemia and cardiac arrhythmias.',
      recommendedNextAction:
        'Doctor review required immediately. Discontinue potassium supplement or consider non-potassium-sparing diuretic alternative. Monitor serum potassium.',
      evidenceReferences: [
        {
          sourceId: 'SRC-ILLUS-DDI-01',
          title:
            'Illustrative Guidance on Potassium-Sparing Diuretics and Potassium Supplementation',
          publisher: 'PharmaVigil Clinical Demonstration Protocol',
          url: 'https://pharmavigil.internal/rules/ddi-001',
          locator: 'Section 4.1',
          accessedAt: '2026-10-27',
          licenseStatus: 'ORIGINAL_ILLUSTRATIVE',
          evidenceStrength: 'HIGH',
        },
      ],
      limitations: [
        'Illustrative demonstration fixture only',
        'Not independently clinically validated',
      ],
    },

    // 2. Warfarin + Aspirin (Major Hemorrhage Risk)
    {
      ruleId: 'ILLUSTRATIVE-DDI-002',
      ruleVersion: 1,
      category: 'DRUG_DRUG',
      status: 'ILLUSTRATIVE_NOT_VALIDATED',
      trigger: { ingredientIds: ['ing-warfarin'], requiresAll: false },
      otherTrigger: { ingredientIds: ['ing-aspirin'], requiresAll: false },
      requiredContext: ['MEDICATION_HISTORY_CONFIRMED'],
      severity: 'HIGH',
      rationale:
        'Concurrent use of oral anticoagulants (warfarin) and antiplatelet agents (aspirin) substantially elevates the risk of major upper gastrointestinal and systemic bleeding.',
      recommendedNextAction:
        'Doctor review required. Confirm explicit clinical indication for dual antithrombotic therapy. Consider gastroprotection (PPI) and monitor INR closely.',
      evidenceReferences: [
        {
          sourceId: 'SRC-ILLUS-DDI-02',
          title: 'Illustrative Antithrombotic Safety Advisory',
          publisher: 'PharmaVigil Clinical Demonstration Protocol',
          url: 'https://pharmavigil.internal/rules/ddi-002',
          locator: 'Section 2.3',
          accessedAt: '2026-10-27',
          licenseStatus: 'ORIGINAL_ILLUSTRATIVE',
          evidenceStrength: 'HIGH',
        },
      ],
      limitations: [
        'Illustrative demonstration fixture only',
        'Not independently clinically validated',
      ],
    },

    // 3. Ramipril + Spironolactone (Hyperkalemia / Hypotension)
    {
      ruleId: 'ILLUSTRATIVE-DDI-003',
      ruleVersion: 1,
      category: 'DRUG_DRUG',
      status: 'ILLUSTRATIVE_NOT_VALIDATED',
      trigger: { ingredientIds: ['ing-ramipril'], requiresAll: false },
      otherTrigger: { ingredientIds: ['ing-spironolactone'], requiresAll: false },
      requiredContext: ['MEDICATION_HISTORY_CONFIRMED'],
      severity: 'MODERATE',
      rationale:
        'Combined ACE-inhibitor and aldosterone antagonist therapy may precipitate hyperkalemia and postural hypotension, especially in elderly patients or compromised renal function.',
      recommendedNextAction:
        'Doctor review required. Verify baseline eGFR and potassium prior to initiation. Recheck electrolytes within 1 week.',
      evidenceReferences: [
        {
          sourceId: 'SRC-ILLUS-DDI-03',
          title: 'Illustrative Dual Renin-Angiotensin System Guidelines',
          publisher: 'PharmaVigil Clinical Demonstration Protocol',
          url: 'https://pharmavigil.internal/rules/ddi-003',
          locator: 'Section 5.2',
          accessedAt: '2026-10-27',
          licenseStatus: 'ORIGINAL_ILLUSTRATIVE',
          evidenceStrength: 'MODERATE',
        },
      ],
      limitations: [
        'Illustrative demonstration fixture only',
        'Not independently clinically validated',
      ],
    },

    // 4. Amoxicillin in Penicillin-Allergic Patient (Anaphylaxis Risk)
    {
      ruleId: 'ILLUSTRATIVE-ALLERGY-001',
      ruleVersion: 1,
      category: 'ALLERGY',
      status: 'ILLUSTRATIVE_NOT_VALIDATED',
      trigger: { ingredientIds: ['ing-amoxicillin'], requiresAll: false },
      requiredContext: ['PATIENT_ALLERGY_PROFILE_RECORDED'],
      severity: 'CRITICAL',
      rationale:
        'Amoxicillin is an aminopenicillin beta-lactam antibiotic. Prescribing to a patient with documented penicillin allergy poses severe risk of IgE-mediated anaphylaxis or severe cutaneous adverse reactions.',
      recommendedNextAction:
        'Doctor review required immediately. Withhold dispensing. Select non-beta-lactam alternative antibiotic based on sensitivities (e.g. macrolide).',
      evidenceReferences: [
        {
          sourceId: 'SRC-ILLUS-ALLERGY-01',
          title: 'Illustrative Cross-Reactivity Protocol in Beta-Lactam Hypersensitivity',
          publisher: 'PharmaVigil Clinical Demonstration Protocol',
          url: 'https://pharmavigil.internal/rules/allergy-001',
          locator: 'Section 1.1',
          accessedAt: '2026-10-27',
          licenseStatus: 'ORIGINAL_ILLUSTRATIVE',
          evidenceStrength: 'HIGH',
        },
      ],
      limitations: [
        'Illustrative demonstration fixture only',
        'Not independently clinically validated',
      ],
    },

    // 5. Warfarin + Cranberry Juice / High Vitamin K (Food-Drug Interaction)
    {
      ruleId: 'ILLUSTRATIVE-FOOD-001',
      ruleVersion: 1,
      category: 'FOOD_DRINK',
      status: 'ILLUSTRATIVE_NOT_VALIDATED',
      trigger: { ingredientIds: ['ing-warfarin'], requiresAll: false },
      requiredContext: ['DIETARY_HABITS_RECORDED'],
      severity: 'MODERATE',
      rationale:
        'High intake of cranberry products or sudden fluctuations in dietary vitamin K (dark leafy greens) can significantly disrupt warfarin anticoagulation control.',
      recommendedNextAction:
        'Pharmacist / clinician counseling required. Advise consistent dietary intake and avoidance of concentrated cranberry extracts.',
      evidenceReferences: [
        {
          sourceId: 'SRC-ILLUS-FOOD-01',
          title: 'Illustrative Dietary Factors in Anticoagulation Management',
          publisher: 'PharmaVigil Clinical Demonstration Protocol',
          url: 'https://pharmavigil.internal/rules/food-001',
          locator: 'Section 3.4',
          accessedAt: '2026-10-27',
          licenseStatus: 'ORIGINAL_ILLUSTRATIVE',
          evidenceStrength: 'MODERATE',
        },
      ],
      limitations: [
        'Illustrative demonstration fixture only',
        'Not independently clinically validated',
      ],
    },

    // 6. Ramipril + High Potassium Salt Substitutes
    {
      ruleId: 'ILLUSTRATIVE-FOOD-002',
      ruleVersion: 1,
      category: 'FOOD_DRINK',
      status: 'ILLUSTRATIVE_NOT_VALIDATED',
      trigger: { ingredientIds: ['ing-ramipril'], requiresAll: false },
      requiredContext: ['DIETARY_POTASSIUM_ASSESSED'],
      severity: 'MODERATE',
      rationale:
        'Salt substitutes containing potassium chloride may lead to unexpected hyperkalemia when combined with ACE inhibitors.',
      recommendedNextAction:
        'Advise patient to avoid potassium-based salt substitutes while taking ramipril.',
      evidenceReferences: [
        {
          sourceId: 'SRC-ILLUS-FOOD-02',
          title: 'Illustrative Dietary Potassium Interactions in ACE Inhibitor Therapy',
          publisher: 'PharmaVigil Clinical Demonstration Protocol',
          url: 'https://pharmavigil.internal/rules/food-002',
          locator: 'Section 2.1',
          accessedAt: '2026-10-27',
          licenseStatus: 'ORIGINAL_ILLUSTRATIVE',
          evidenceStrength: 'MODERATE',
        },
      ],
      limitations: [
        'Illustrative demonstration fixture only',
        'Not independently clinically validated',
      ],
    },

    // 7. Ramipril + Prior ACE-Inhibitor Angioedema / Cough (Adverse Reaction History)
    {
      ruleId: 'ILLUSTRATIVE-ADV-001',
      ruleVersion: 1,
      category: 'ADVERSE_REACTION',
      status: 'ILLUSTRATIVE_NOT_VALIDATED',
      trigger: { ingredientIds: ['ing-ramipril'], requiresAll: false },
      requiredContext: ['MEDICATION_HISTORY_CONFIRMED'],
      severity: 'HIGH',
      rationale:
        'Patient history notes prior severe adverse reaction (angioedema or intractable dry cough) associated with ACE-inhibitor class.',
      recommendedNextAction:
        'Doctor review required. Contraindicated if prior angioedema. Consider ARB or calcium channel blocker alternative.',
      evidenceReferences: [
        {
          sourceId: 'SRC-ILLUS-ADV-01',
          title: 'Illustrative Class Adverse Reaction Advisory',
          publisher: 'PharmaVigil Clinical Demonstration Protocol',
          url: 'https://pharmavigil.internal/rules/adv-001',
          locator: 'Section 6.1',
          accessedAt: '2026-10-27',
          licenseStatus: 'ORIGINAL_ILLUSTRATIVE',
          evidenceStrength: 'HIGH',
        },
      ],
      limitations: [
        'Illustrative demonstration fixture only',
        'Not independently clinically validated',
      ],
    },
  ],
};

export async function seedCatalogueAndRules(db: Db): Promise<void> {
  const catalogueColl = db.collection<MedicationCatalogItem>('medication_catalog');
  for (const item of SYNTHETIC_CATALOGUE_ITEMS) {
    await catalogueColl.updateOne({ _id: item._id }, { $set: item }, { upsert: true });
  }

  // Also maintain backward compatibility for medication_catalogue if referenced
  const legacyColl = db.collection<MedicationCatalogItem>('medication_catalogue');
  for (const item of SYNTHETIC_CATALOGUE_ITEMS) {
    await legacyColl.updateOne({ _id: item._id }, { $set: item }, { upsert: true });
  }

  const rulesColl = db.collection<ClinicalRuleSet>('rule_sets');
  await rulesColl.updateOne(
    {
      ruleSetId: SEEDED_ILLUSTRATIVE_RULESET.ruleSetId,
      version: SEEDED_ILLUSTRATIVE_RULESET.version,
    },
    { $set: SEEDED_ILLUSTRATIVE_RULESET },
    { upsert: true },
  );
}
