# Fieldwork

## What it is

I built a small leave-request app for employees and their managers. Employees can check balances, preview a date range, request leave, and cancel eligible requests. Managers review their direct reports' requests and see recent decisions.

### Demo credentials

After `npm run seed`, every account below uses **`FieldworkDemo!26`**, unless I set a different `SEED_PASSWORD` before the first seed.

| Role     | Name            | Email                               |
| -------- | --------------- | ----------------------------------- |
| Manager  | Meera Kapoor    | `meera.kapoor@fieldwork.example`    |
| Employee | Aisha Khan      | `aisha.khan@fieldwork.example`      |
| Employee | Rohan Mehta     | `rohan.mehta@fieldwork.example`     |
| Employee | Sofia Fernandes | `sofia.fernandes@fieldwork.example` |
| Employee | Arjun Nair      | `arjun.nair@fieldwork.example`      |

All four employees report to Meera. The starting allowances are 12 casual days and 10 sick days. The seed includes five example requests when enough working days remain in the year. It preserves existing accounts, passwords, balances, and requests on repeat runs. It refuses to run with `NODE_ENV=production`.

## Tech stack

I use Node 24 LTS, Express 5, MongoDB with Mongoose, Zod, JWT, and bcrypt on the server. The client uses React, Vite, React Router, plain CSS variables, and one web font with a system fallback. Tests use Vitest, Supertest, a real temporary MongoDB replica set from `mongodb-memory-server`, and React Testing Library.

```text
server/
  src/config/       environment and working calendar
  src/models/       User and LeaveRequest
  src/services/     auth, leave rules, and demo seed
  src/routes/       HTTP endpoints
  src/utils/        date-only handling, validation, errors
  scripts/          temporary local database runner
  test/             calendar, model, and API tests
client/
  src/api/          HTTP client, auth state, data loading
  src/components/   forms, dialogs, balances, shared UI
  src/pages/        login, employee, manager
  src/styles.css    responsive styles
```

## How to run locally

### Prerequisites

- Node **24 LTS** and npm. `.nvmrc` records the version. Node 21 is not supported.
- MongoDB with replica-set support, or the included temporary demo runner. A standalone MongoDB server cannot execute the balance transactions. [MongoDB transaction requirements](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/)
- Internet access for npm packages and the first download of the test/demo MongoDB binary.

From the repository root:

```sh
npm ci
```

Copy `server/.env.example` to `server/.env`. On PowerShell:

```powershell
Copy-Item server/.env.example server/.env
```

On macOS or Linux, use `cp server/.env.example server/.env`. Generate a secret and paste it into `JWT_SECRET`:

```sh
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

| Server variable | Local value / purpose                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| `MONGODB_URI`   | `mongodb://127.0.0.1:27018/fieldwork?replicaSet=rs0` for the demo runner, or an Atlas URI                   |
| `JWT_SECRET`    | Random secret, at least 32 characters                                                                       |
| `CLIENT_ORIGIN` | Exact allowed origins, comma-separated; defaults in the example cover `localhost:5173` and `127.0.0.1:5173` |
| `PORT`          | `4000`                                                                                                      |
| `NODE_ENV`      | `development` locally; `production` on the API host                                                         |
| `TRUST_PROXY`   | `0` locally; the verified number of trusted proxy hops on the host                                          |
| `SEED_PASSWORD` | Optional demo password, at least 12 characters and at most 72 UTF-8 bytes                                   |

Start the temporary database in terminal 1:

```sh
npm run db:demo -w server
```

I use port 27018 to avoid a normal MongoDB installation on 27017. Keep this terminal running. **This demo database is temporary; stopping it discards its data.** For persistent data, use Atlas or a persistent local replica set and change `MONGODB_URI`.

In terminal 2:

```sh
npm run seed
npm run dev
```

Open [the client](http://127.0.0.1:5173). The API runs on port 4000. Vite proxies `/api`, so no client environment file is required locally. I can also run the processes separately with `npm run dev -w server` and `npm run dev -w client`.

### Verification

```sh
npm test
npm run lint
npm run format:check
npm run build
```

The tests create their own database and do not read the development `.env` or change demo data. The completed suite has **82 tests**. To check the API is connected, open [the health endpoint](http://127.0.0.1:4000/api/health).

| Stage                   | Verification command                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------ |
| 1 — models and calendar | `npm test -- server/test/dates.test.js server/test/models.test.js`                   |
| 2 — services and routes | `npm test -- server/test/api.test.js`                                                |
| 3 — seed                | `npm run seed` twice; existing data should remain intact                             |
| 4 — client              | `npm test -- client`, `npm run lint`, `npm run build`                                |
| 5 — deployment files    | `npm run format:check`, `npm run build`, then `npm start` with a configured database |

## Assumptions and design decisions

- **Calendar:** I configure weekends and optional public holidays in `server/src/config/calendar.js`. Saturday and Sunday do not count. The example holidays are January 1, August 15, October 2, and December 25, 2026; they are examples to replace with the team's calendar. A holiday on a weekend is skipped once. Weekend endpoints are allowed; a range with no working days is rejected. `countWorkingDays` is the one pure calculation function.
- **Dates:** API dates are strict `YYYY-MM-DD` values. MongoDB stores them at UTC midnight, and the client formats them in UTC. I use the current UTC date for the past-date and cancellation boundaries. Employee applications cannot start in the past; this is not a restriction on administrative seed data. Managers do not have an application endpoint.
- **Annual balances:** A request cannot cross December 31; the error asks the employee to split it. The supplied model has one provisioned balance per type, with no automatic yearly reset or carryover. Future requests within a single year use those same provisioned balances. A deployment spanning multiple allowance years needs a per-year ledger or an explicit rollover migration; I have not silently invented a reset policy.
- **Reservations:** `available = remaining balance - pending days of the same type`. Pending requests reserve days without deducting them. The cards show total, used, pending, and available. I derive total from remaining balance plus approved days recorded in this dataset.
- **Overlap:** Any shared calendar date conflicts, including a shared weekend. Pending and approved requests block new requests regardless of leave type. Rejected and cancelled requests do not. I check again during approval, excluding the request being approved.
- **Concurrency:** Every mutation first updates the employee's internal `leaveRevision` in a MongoDB transaction. Concurrent mutations on that employee conflict and retry with fresh data. Approval uses both a conditional `status: pending` update and a `$gte` / `$inc` balance deduction in the same transaction. Refunds and status changes also commit together. Failed checks roll everything back. No process-local mutex is involved.
- **Approval:** Other pending reservations still count. If an administrator reduces the remaining balance below existing reservations, requests stay pending until the shortage is resolved. A manager can act only on direct reports and never on their own request. Rejection requires a trimmed comment.
- **Cancellation:** Employees can cancel their own pending request, even if its start date has passed. Approved requests can be cancelled only while the start date is strictly after today; this refunds the original computed days once. Approved leave starting today or earlier cannot be cancelled.
- **Preview and submission:** Preview is advisory. The server repeats every check on submission. The client debounces preview by 350ms, aborts stale requests, and disables invalid or in-flight submissions. Reasons are trimmed and must contain 5–500 characters. Extra client fields, including `workingDays`, are ignored.
- **Session and UI:** Tokens expire after eight hours and live in memory plus `sessionStorage`, as requested. An authenticated 401 ends the session. I use native date controls and modal dialogs, visible keyboard focus, inline dismissible errors, and scrollable tables at mobile widths. Recent manager decisions include the latest 50 approved or rejected requests from current direct reports.

## Edge cases handled

I keep the checks next to the test layer that exercises them:

- `server/test/dates.test.js`: weekday ranges, two weekends, single days, weekend endpoints, holidays, configurable weekends, leap days, malformed dates, and timezone normalization.
- `server/test/models.test.js`: email normalization, nonnegative balances, UTC-midnight dates, and query indexes.
- `server/test/api.test.js`: all validation rules, inclusive and cross-type overlap, preview, reservations, approval rechecks, failed deduction rollback, ownership and roles, rejection comments, closed requests, refunds, concurrent applications/decisions/cancellations, login, rate limiting, CORS, and repeatable seeding.
- `client/src/components/forms.test.jsx`: preview validity, stale responses, inline errors, double submits, and required rejection comments.
- `client/src/api/client.test.js` and `client/src/pages/Manager.test.jsx`: 401 handling and refresh after a competing decision.

I also checked both dashboards at desktop and 390px mobile widths. The browser run covered sign-in, preview, application, session restoration, manager queue, and the approval dialog. The final browser approval click was skipped at the user's request; the automated approval and refund tests passed. Corrections and verification notes are in `DEVLOG.md`.

## API summary

All protected endpoints expect `Authorization: Bearer <token>`. Leave types use lowercase `casual` or `sick` in JSON.

| Method  | Endpoint                                                          | Purpose                                                                                                |
| ------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET`   | `/api/health`                                                     | Database readiness; 200 or 503                                                                         |
| `POST`  | `/api/auth/login`                                                 | `{ email, password }` → `{ token, user }`                                                              |
| `GET`   | `/api/auth/me`                                                    | Current authenticated user                                                                             |
| `POST`  | `/api/leaves`                                                     | Employee application: `{ type, startDate, endDate, reason }`                                           |
| `GET`   | `/api/leaves/mine`                                                | Own requests and per-type balance summaries                                                            |
| `GET`   | `/api/leaves/preview?type=casual&start=2026-10-17&end=2026-10-20` | Working days, weekends/holidays skipped, available balance, balance after, conflict and blocking error |
| `PATCH` | `/api/leaves/:id/cancel`                                          | Cancel own eligible request                                                                            |
| `GET`   | `/api/leaves/pending`                                             | Manager's direct reports' pending requests and current balances                                        |
| `GET`   | `/api/leaves/decisions`                                           | Manager's recent decisions view                                                                        |
| `PATCH` | `/api/leaves/:id/approve`                                         | Approve, with optional `{ comment }`                                                                   |
| `PATCH` | `/api/leaves/:id/reject`                                          | Reject, with required `{ comment }`                                                                    |

Successful creation returns 201. Validation uses 400, missing/expired authentication 401, forbidden access 403, missing records 404, conflicts 409, oversized bodies 413, and login throttling 429. Valid preview queries return 200 with a `blockingError` for overlap or shortage; invalid dates/ranges return 400.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the highlighted fields.",
    "fields": { "reason": ["Use at least 5 characters."] }
  }
}
```

`fields` is optional. I do not return stack traces or password hashes.

## Deployment notes

### API: Render

I included `render.yaml` for a Node web service. Use the repository root, build with `npm ci --omit=dev --workspace server --include-workspace-root=false`, and start with `npm start`. The health check is `/api/health`. Configure `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `NODE_ENV=production`, and the correct `TRUST_PROXY`; Render supplies `PORT`. The blueprint generates a JWT secret and uses one proxy hop. [Render's Express guide](https://render.com/docs/deploy-node-express-app)

Render's free web services spin down when idle, so the first request may take longer while the API starts. I would use a paid always-on service for a real team that needs predictable response times. [Free service behavior](https://render.com/docs/free)

### Client: Vercel

Use the **repository root** as the Vercel project root. The root `vercel.json` installs dependencies, runs `npm run build`, serves `client/dist`, and rewrites client routes to `index.html`. Set `VITE_API_URL=https://YOUR-API-HOST/api` before building. Changing it requires rebuilding the client. [Vite SPA routing on Vercel](https://vercel.com/docs/frameworks/frontend/vite)

Set the API's `CLIENT_ORIGIN` to the exact client origin, such as `https://YOUR-CLIENT.vercel.app`, without a trailing slash or path. For more than one deployment, list exact origins separated by commas. I do not use wildcard CORS. The development Vite proxy is not part of the production build.

### Database and operational limits

I use a MongoDB Atlas Free cluster for a persistent demo. Create a database user, allow the API host's outbound addresses, and keep the connection URI only on the API host. Atlas provides the replica-set capability needed here. Check the current [Atlas Free limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/) before relying on it for a team.

For a hosted demonstration, seed a separate demo database from a development environment before starting the production API. I would provision real accounts separately and remove demo credentials before handling real employee data. The app has no signup, password reset, account administration, or annual rollover UI.

The login limiter is in memory and suits one API instance; multiple instances need a shared rate-limit store. `sessionStorage` tokens are accessible to page JavaScript, so the Vercel configuration includes a restrictive script policy. Persistent backups, monitoring, account provisioning, and an annual balance migration remain deployment responsibilities. No live cloud deployment was performed as part of this build.

## AI tools used

**Fields for me to fill in before submitting or publishing:**

- Tool(s) and model(s): **[fill in]**
- Tasks I used them for: **[fill in]**
- What I reviewed or changed myself: **[fill in]**
- What went wrong and how I fixed it: **[fill in; consult DEVLOG.md]**
- What I tested independently: **[fill in]**
