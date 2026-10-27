# PharmaVigil — Backend API

Authoritative backend service for the **PharmaVigil** (VentureForge) Medication Safety Platform.

PharmaVigil provides deterministic clinical decision support, prescription capture & revision tracking, medicine matching, clinical alert workflows, doctor disposition tracking, hospital tenant isolation, and pharmacist dispensing authorization.

---

## 🛠 Tech Stack

- **Framework:** [Hono](https://hono.dev/) (`@hono/node-server`, `hono`)
- **Runtime:** Node.js (v20+ / v22+)
- **Language:** TypeScript 5.x (Strict mode)
- **Database:** [MongoDB](https://www.mongodb.com/) (Official `mongodb` Node driver with tenant-scoped repository patterns)
- **Validation:** [Zod](https://zod.dev/) (`zod`, `@hono/zod-validator`)
- **Security:** `bcryptjs` password hashing, crypto-secure session verification tokens, HttpOnly same-site cookies, CSRF defenses
- **Testing:** [Vitest](https://vitest.dev/) (`vitest`, `@vitest/coverage-v8`)
- **Developer Tooling:** `tsx`, `eslint`, `prettier`

---

## 📂 Project Directory Structure

```text
PharmaVigil/
├── docs/                                  # Full PRD and documentation pack
│   ├── 01-shared/                         # Product vision, scope, hazard analysis, glossary
│   ├── 02-frontend/                       # Frontend PRD & route inventory (for consumer context)
│   ├── 03-backend/                        # Backend PRD, data model, rules data spec, endpoint inventory
│   ├── 04-contracts/                      # Canonical OpenAPI 3.0 specification & integration contract
│   ├── 05-quality/                        # Test strategy & traceability release checklist
│   ├── 06-operations/                     # Deployment guide, limitations, implementation plan
│   ├── sources/                           # Research source register
│   ├── package-manifest.json
│   ├── project-manifest.json
│   ├── README.md
│   └── REPO-HANDOFF.md
├── src/
│   ├── index.ts                           # Server entrypoint (@hono/node-server)
│   ├── app.ts                             # Hono application factory, global middleware, & route mounting
│   ├── config/                            # Environment & database connection setup
│   │   ├── env.ts                         # Zod-validated fail-fast environment variables
│   │   └── db.ts                          # MongoDB client connection pool & health checks
│   ├── middleware/                        # Cross-cutting HTTP middleware
│   │   ├── request-id.ts                  # Request correlation ID middleware (x-request-id)
│   │   ├── session.ts                     # Session token validation & tenant scoping
│   │   ├── require-auth.ts                # Authentication guard
│   │   ├── require-membership.ts          # Active hospital membership guard
│   │   ├── require-role.ts                # Role-based access control guard (RBAC)
│   │   ├── csrf.ts                        # CSRF / Origin verification
│   │   ├── rate-limit.ts                  # Sensitive endpoint rate limiter
│   │   └── error-handler.ts               # Standard error envelope & safe logging
│   ├── routes/                            # Route controllers (thin HTTP adapters)
│   │   ├── health.routes.ts               # /health/live and /health/ready
│   │   ├── auth.routes.ts                 # /auth/register, /auth/login, /auth/me, /auth/logout
│   │   ├── hospitals.routes.ts            # /hospitals/current
│   │   ├── memberships.routes.ts          # /memberships (list, request, approve, reject, suspend)
│   │   ├── users.routes.ts                # /users
│   │   ├── patients.routes.ts             # /patients (search, detail, confirm link, history, allergies)
│   │   ├── catalogue.routes.ts            # /medicine-catalogue (search, item detail)
│   │   ├── captures.routes.ts             # /prescription-captures (draft, read, patch, confirm)
│   │   ├── prescriptions.routes.ts        # /prescriptions (list, create, detail, revisions)
│   │   ├── checks.routes.ts               # /checks (evaluate, read, retry)
│   │   ├── alerts.routes.ts               # /alerts (queue, detail, acknowledge, disposition, resolve)
│   │   ├── dispensing.routes.ts           # /dispensing-authorizations
│   │   ├── orders.routes.ts               # /medication-orders (inpatient create, version, list)
│   │   ├── appointments.routes.ts         # /appointments (booking, list, cancel)
│   │   ├── notifications.routes.ts        # /notifications
│   │   ├── audit.routes.ts                # /audit query
│   │   └── demo.routes.ts                 # /demo/reset (scoped workspace reset)
│   ├── domain/                            # Pure deterministic domain rules (no HTTP or DB code)
│   │   ├── auth/                          # Identity & credential verification policies
│   │   ├── prescriptions/                 # Outpatient prescription workflow state machine
│   │   ├── medication-orders/             # Inpatient medication order aggregates
│   │   ├── medicine-matching/             # Raw OCR text & brand normalization to ingredients
│   │   ├── rule-engine/                   # Pure deterministic illustrative rule engine
│   │   ├── alerts/                        # Alert states & doctor disposition rules
│   │   ├── appointments/                  # Appointment slot validation & conflict prevention
│   │   └── audit/                         # Append-only audit entry schemas
│   ├── services/                          # Application use-case orchestrators
│   ├── repositories/                      # Tenant-filtered database access layer
│   ├── schemas/                           # Runtime Zod validation schemas
│   ├── types/                             # Shared TypeScript types & Hono context variables
│   ├── fixtures/                          # Synthetic seed datasets (patients, catalogue, rules)
│   └── openapi/
│       └── openapi.yaml                   # Canonical OpenAPI 3.0 contract
├── tests/
│   ├── unit/                              # Unit tests (rule engine, domain state machines, validation)
│   ├── integration/                       # Integration tests (Hono routes with MongoDB & fixtures)
│   ├── security/                          # Cross-hospital isolation & RBAC permission matrix
│   └── contract/                          # OpenAPI conformance testing
├── .env.example                           # Environment configuration template
├── .gitignore                             # Git ignore rules
├── package.json                           # Scripts and dependencies
├── tsconfig.json                          # Strict TypeScript compiler options
├── vitest.config.ts                       # Vitest test runner configuration
├── eslint.config.mjs                      # ESLint configuration
└── .prettierrc                            # Prettier formatting rules
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Ensure your MongoDB connection string in `.env` is configured properly (default: `mongodb://localhost:27017`).

### 3. Scripts
- `npm run dev`: Start development server with live reload (`tsx watch src/index.ts`)
- `npm run build`: Compile TypeScript to `dist/`
- `npm start`: Run compiled production server
- `npm run typecheck`: Run TypeScript compiler check without emitting files
- `npm test`: Run unit and integration tests with Vitest
- `npm run test:watch`: Run Vitest in watch mode
- `npm run test:coverage`: Run Vitest with V8 code coverage report
- `npm run lint`: Run ESLint checks
- `npm run format`: Format source files with Prettier

---

## 🔒 Non-Negotiable Safety Principles

1. **Synthetic Data Only:** Under no circumstances should real patient data, identifiable imaging, or proprietary clinical tables be ingested.
2. **Illustrative Rules:** Rules in this demo platform are illustrative and are not clinically validated unless independently certified by a medical expert.
3. **`NO_MATCHING_RULE` is not safety clearance:** An absence of triggered alerts must never be presented as safety or clinical clearance.
4. **Tenant Isolation:** Every repository method must enforce the server-derived `hospitalId`. Client-supplied tenant/role headers are never trusted.
5. **Server-Enforced State Transitions:** Workflows (outpatient revision progression, doctor dispositions, pharmacist dispensing authorizations) are strictly validated server-side.
