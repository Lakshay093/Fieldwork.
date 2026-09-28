# Deployment readiness

Reviewed on September 28, 2026 against the original application prompt and the later account/footer changes.

## Result

The app is deployed on Vercel and Render with the existing Atlas database. Live verification passed on September 28, 2026.

| Component | Live address                                                          | Source                          |
| --------- | --------------------------------------------------------------------- | ------------------------------- |
| Frontend  | [fieldwork-sigma.vercel.app](https://fieldwork-sigma.vercel.app)      | `Lakshay093/fieldworkk`, `main` |
| API       | [Health endpoint](https://fieldwork-api-gqm9.onrender.com/api/health) | `Lakshay093/Fieldwork.`, `main` |

The application and deployment files in both repositories matched at deployment. Keep future changes synchronized. Vercel's public API URL is `https://fieldwork-api-gqm9.onrender.com/api`; Render's allowed frontend origin is `https://fieldwork-sigma.vercel.app`.

## Original requirements

| Requirement                             | Result and evidence                                                                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requested stack and monorepo            | Node 24, Express, Mongoose, Zod, JWT, bcrypt; React/Vite/Router/plain CSS; `server/`, `client/`, and root README.                                                                                 |
| Models and indexes                      | User and leave fields present, unique lowercase email, UTC midnight dates, overlap and pending-list indexes. `server/test/models.test.js`.                                                        |
| Employee application, history, balances | Server computes days and strips client-controlled status, employee ID, and day count. History is restricted to the signed-in account. `server/test/api.test.js`.                                  |
| Manager queue and recent decisions      | Direct reports only, current balances, decision metadata, approval/rejection dialogs, required rejection comment. API tests and `client/src/pages/Manager.test.jsx`.                              |
| Inclusive overlap across leave types    | Pending/approved overlaps return 409 with conflicting dates; approval checks again. API tests.                                                                                                    |
| Reservations and insufficient balance   | Pending days reduce same-type availability; requested/available message; rejection releases the reservation. API tests.                                                                           |
| Atomic approval and rollback            | Transaction, guarded deduction, pending-status condition, rollback when deduction fails, races between decisions. API tests.                                                                      |
| Weekend and holiday rules               | One pure configurable calculation; zero-day range rejected; weekend endpoints allowed. All specified examples covered in `server/test/dates.test.js` and API tests.                               |
| Input boundaries                        | Reversed/past/cross-year dates, malformed dates/types, trimmed 5–500 character reason, field errors. API tests.                                                                                   |
| Ownership and roles                     | Own-manager decisions and non-report decisions return 403; protected routes enforce roles. API tests and client route guards.                                                                     |
| Cancellation and refunds                | Own pending cancellation, future approved refund once, same-day/past approved cancellation blocked, concurrent approval/cancellation safety. API tests.                                           |
| Duplicate submissions                   | In-flight buttons disabled, client guard, concurrent backend duplicate requests rejected safely. API and form tests.                                                                              |
| Preview                                 | Debounced preview, weekend/holiday counts, available/after balances, conflicts and blocking errors; stale responses ignored. API and form tests.                                                  |
| REST API and security middleware        | Required endpoints plus recent decisions and health; Helmet, exact-origin CORS, login limiter, central error shape, service layer. API tests.                                                     |
| Session handling                        | JWT in memory and sessionStorage, restored profile, logout on authenticated 401, role-based routes. Client tests and previous browser checks.                                                     |
| UI states and accessibility             | Loading/empty/error views, inline messages, real labels, native date controls, focus styles, keyboard dialog, responsive tables. Source review, form tests, and browser checks.                   |
| Balance cards on mobile                 | Total allowance, used, pending, available now remain visible at 390px. Browser check found no horizontal page overflow.                                                                           |
| Design                                  | Warm neutrals, green accent, subtle borders, single web font with fallbacks, inline SVGs, no UI kit, gradients, glass effects, or alert dialogs. Personalized heart footer retained as requested. |
| Seed and credentials                    | One manager, four reports, repeatable seeding without resetting existing data. Primary account emails/password match the later request. Seed tests.                                               |
| Documentation and staged work           | Required first-person README sections, approved AI contribution summary, development report, DEVLOG corrections, conventional stage commits, environment examples and deployment files.           |

## Verification performed

- All **82 automated tests** passed, including approval, rejection, refund, and concurrency checks. They use a temporary replica set, not Atlas.
- ESLint, Prettier, and the production frontend build passed.
- The production dependency audit reported **zero known vulnerabilities**.
- A clean source export installed Render's exact production dependency set with `npm ci --omit=dev --workspace server --include-workspace-root=false`.
- That API started in production mode on a supplied port, connected to Atlas, returned a healthy response, accepted an exact production-origin CORS preflight, and rejected an unrelated origin and unauthenticated request. These checks did not change leave records.
- A second clean export completed Vercel's install and build. The built client contained the configured HTTPS API URL. A missing API URL correctly stopped the Vercel build.
- Tracked files, all nine pre-review commits, and the built client were checked against the current database/JWT secrets and common credential patterns. No matches were found. Environment files, credential exports, test artifacts, and Vercel project metadata are ignored.
- The mobile allowance fix was inspected at 390px. The earlier browser approval click remains skipped at the user's request; the automated decision/refund tests passed.

The clean install/start checks ran locally on Windows with Node 24. Subsequent live checks confirmed successful Render and Vercel builds, HTTPS access, API health, both role logins, existing request lists, session restoration, and direct route refresh. `/login`, `/leave`, and `/team` return HTTP 200 with the SPA and its content security policy. The production CORS preflight returns 204 with the exact Vercel origin; unauthenticated `/api/auth/me` returns 401.

## GitHub preparation

- [x] Source, lockfile, environment examples, README, DEVLOG, and deployment configs are present.
- [x] Real `.env` files, database credentials, dependencies, generated builds, and local artifacts are excluded.
- [x] The checked Git history contains no matches for the current private secrets or common credential patterns.
- [x] Connect the GitHub repository and push the committed code to `main`.
- [x] Replace the initial AI-tools fields with the approved contribution summary and link the development report.
- [x] List Claude Code and Codex as the AI agents used, with the author's reported Claude Code contribution and the recorded Codex work.

The README intentionally publishes demo app logins. Anyone reading it can access those demo accounts once hosted; use synthetic data in that database.

## Hosting settings

### Render API

Use a web service linked to the repository, with **Root Directory left blank**. The `render.yaml` Blueprint supplies the build/start commands and health path.

| Setting         | Value                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| Runtime         | Node 24                                                                  |
| Build command   | `npm ci --omit=dev --workspace server --include-workspace-root=false`    |
| Start command   | `npm start`                                                              |
| Health check    | `/api/health`                                                            |
| `NODE_ENV`      | `production`                                                             |
| `NODE_VERSION`  | `24`                                                                     |
| `MONGODB_URI`   | Private Atlas URI selecting the `fieldwork` database; set in Render only |
| `JWT_SECRET`    | New random secret of at least 32 characters; Blueprint generates one     |
| `CLIENT_ORIGIN` | Exact final Vercel origin, without a trailing slash or `/api`            |
| `TRUST_PROXY`   | `1` for this Render setup                                                |
| `PORT`          | Supplied by Render                                                       |

### Vercel client

Use **Root Directory `.`**, framework **Vite**, and Node **24.x**. Keep the root `vercel.json` settings: its install command disables the test database's postinstall download, its build command is `npm run build`, and its output directory is `client/dist`.

Set **`VITE_API_URL=https://<actual-render-service>.onrender.com/api`** for Production before building. Only this public API URL belongs in the browser environment. Keep `MONGODB_URI` and `JWT_SECRET` on Render. Set Preview environments separately if needed; each preview origin must be explicitly allowed by the API.

The SPA rewrite supports direct visits to `/login`, `/leave`, and `/team`. [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite)

## Completed launch steps

1. Reused the existing `fieldwork-api` Free service in Render's `lakshay` workspace. Its initial build succeeded but startup failed because Atlas only allowed the local computer's address.
2. With explicit approval, added Render's listed outbound ranges, `74.220.48.0/24` and `74.220.56.0/24`, to the Atlas project IP access list. Both became active. Keep this list aligned with the service's **Connect → Outbound** details if its region changes. [Render outbound IPs](https://render.com/docs/outbound-ip-addresses)
3. Redeployed the API successfully and verified `{"status":"ok"}` from `/api/health`.
4. Created the `fieldwork` Vercel project from the verified `fieldworkk` repository. Used the repository root and its `vercel.json` build settings, with the public Render API URL set before the build.
5. Set Render's `CLIENT_ORIGIN` to the assigned Vercel production domain and deployed that environment change.
6. Verified both role logins, existing balances and request lists, session restoration, direct routes, response headers, and production CORS. No leave requests were created, approved, rejected, or cancelled during deployment verification.

Existing Atlas database credentials were retained. Password rotation and replacing the Atlas Admin database role with a dedicated `readWrite` role on `fieldwork` remain operational follow-up work. [Atlas database users](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)

Render's free service sleeps after 15 minutes without inbound traffic and may take about a minute to wake. The README documents this cold start. [Render free-service behavior](https://render.com/docs/free)

## Documented operational limits

The requested application is a small demo with one provisioned balance per leave type. Annual rollover, account provisioning/password reset, backups, monitoring, and a shared rate-limit store for multiple API instances remain operational work before using it for a real workforce. These are already described in the README.
