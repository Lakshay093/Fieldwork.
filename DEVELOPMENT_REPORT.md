# Fieldwork — Development Report

**Project author:** Lakshay Dhiman

**Application:** Employee Leave Management System

**Report date:** September 28, 2026

## Project overview

Fieldwork is a full-stack application for submitting, reviewing, and tracking employee leave requests. It includes role-based access, leave balances, approval workflows, and safeguards against overlapping requests and inconsistent balance updates.

Employees can preview working days and available balance before submitting a request. Managers review requests from their direct reports. Approval deducts the balance in a transaction, while eligible cancellation refunds approved days atomically.

## Development approach and contributions

**AI agents used: Claude Code and Codex.**

The project combined AI-assisted implementation with developer review and technical ownership.

| Contributor    | Contribution                                                                                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Claude Code    | Frontend development and interface styling, as reported by the project author.                                                                                                                                                                                           |
| Codex          | Backend implementation assistance, authentication, validation, leave-management rules, database transactions, automated tests, and deployment review. Codex also contributed frontend corrections, API integration, and Atlas configuration during the recorded session. |
| Lakshay Dhiman | Project requirements, design and configuration decisions, provision of the Atlas environment, review of application behavior, and final acceptance of changes. API and database setup included Codex assistance.                                                         |

Claude Code's frontend contribution is recorded from the project author's account. Codex's contributions are documented in the development log. Specific model versions and additional independent testing have not been asserted without a supporting record.

AI-generated changes were reviewed through automated tests, application checks, and iterative corrections. Project ownership includes deciding what the application should do and accepting changes; the implementation record also credits the tools that assisted with the work.

## Technical implementation

### Frontend

The client uses React, Vite, React Router, and plain CSS. It provides separate employee and manager dashboards, role-based navigation, native date controls, live leave previews, inline feedback, and confirmation dialogs.

The design uses warm neutral colors, a green accent, subtle borders, and responsive tables. Balance cards display total allowance, used days, pending days, and available days. Authentication state is held in memory and sessionStorage, and an authenticated 401 ends the session.

### Backend and API

The server uses Node 24, Express, Mongoose, Zod, JWT, and bcrypt. Business rules are implemented in a service layer, with validation and consistent error responses at the API boundary.

The API checks overlapping date ranges, pending reservations, available balances, ownership, and manager reporting relationships. MongoDB transactions and conditional updates protect approvals, cancellations, and refunds during concurrent requests. Helmet, restricted CORS, and login rate limiting provide the requested HTTP protections.

### Database and integration

MongoDB Atlas stores users and leave requests in the `fieldwork` database. Dates are normalized to UTC midnight. Indexes support overlap checks and the manager queue.

Lakshay supplied the Atlas environment and directed the configuration changes. Codex assisted with importing the private connection configuration, selecting the database, connecting the API, updating the requested demo accounts, and verifying integration. Connection credentials are kept out of Git and must be supplied privately to the API host when deploying.

## Issues identified and corrected

| Issue                                                                                                | Correction                                                                                                 | Verification                                                                    |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Mobile balance cards hid the total leave allowance.                                                  | Updated the responsive layout to display total allowance alongside used, pending, and available days.      | Browser review at 390px; no horizontal page overflow.                           |
| The frontend could build without its production API URL.                                             | Added a Vercel build check that reports missing or invalid API configuration.                              | Verified an expected failure without the URL and a successful configured build. |
| The Node.js version range could allow an untested future major release.                              | Pinned the project to Node 24 and synchronized the lockfile.                                               | Clean dependency installations and production builds passed.                    |
| The initial local connection used a standalone MongoDB instance that could not support transactions. | Configured a replica-set development database on a separate port, then connected the application to Atlas. | Verified replica-set support, database readiness, and API responses.            |
| A failed balance deduction could display a misleading error.                                         | Added a specific balance-change message while preserving the pending request.                              | Automated tests verified transaction rollback and unchanged balance.            |

These issues are recorded as implementation and configuration corrections. They are not attributed to a particular AI tool unless the development record supports that attribution. [DEVLOG.md](DEVLOG.md) contains the detailed history.

## Verification

The latest recorded review on September 28, 2026 included:

- **82 passing automated tests**, covering date calculations, validation, authorization, overlap, balance reservations, approvals, refunds, concurrency, preview behavior, and session handling.
- Successful lint, formatting, and production build checks.
- Clean dependency installation checks for Render and Vercel using separate local source exports.
- Production-mode API startup, Atlas connectivity, health checks, and CORS verification.
- Desktop and mobile layout review, including the corrected mobile balance cards.
- A production dependency audit reporting zero known vulnerabilities at the time of review.
- Checks of tracked files, the pre-review Git history, and the built client for the current private credentials and common secret patterns, with no matches found.

Automated tests use a temporary replica set and do not modify the Atlas data. The final browser approval click was skipped at Lakshay's request; automated approval, rejection, refund, and concurrency tests passed. These results describe checks performed during the Codex-assisted session and do not claim separate independent testing by the project author.

## Deployment status

The application is prepared for a demonstration deployment. Publishing still requires the GitHub repository connection, hosting environment variables, Atlas network access, and verification on the public URLs.

The deployment configuration uses Vercel for the client, Render for the API, and Atlas for persistence. The clean deployment checks ran locally on Windows with Node 24. Actual hosting behavior, public TLS, assigned domains, production CORS, and direct-route refresh must be verified after deployment.

The Atlas password shown in the earlier setup screenshots should be replaced before public deployment. The public demo credentials are intended for synthetic demonstration data. Annual balance rollover, account provisioning, password reset, backups, and monitoring remain operational responsibilities before use with a real workforce.

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for the required settings and launch checks, and [README.md](README.md) for setup, credentials, business rules, and API usage.
