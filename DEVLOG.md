# Development log

I record corrections here as they happen, including the cause and the check used after the fix.

## Stage 1 — models and calendar

- The machine's default Node is 21, which is not LTS. I am using the bundled Node runtime for verification and targeting Node 24 LTS in `.nvmrc`.
- The empty project initially inherited a parent repository from the Windows home directory. I initialized a repository inside this project so stage commits stay scoped to the application.

- Initial model tests used Mongoose's deprecated synchronous validator. I switched them to async validation after the first test run reported the warning. All 22 stage 1 tests pass.

## Stage 2 — services and API

- The first API run passed all 72 tests but Mongoose 9 reported that the update option named new is deprecated. I replaced it with returnDocument: 'after' and reran the suite.
- Concurrent approvals honor other pending reservations. If an administrator reduces a balance below all reservations, neither request is approved until a reservation is released; the balance stays intact and both requests stay pending.

## Stage 3 — demo seed

- The demo seed preserves existing accounts, passwords, balances, and requests on repeat runs. Samples use upcoming working days in the current year; near year end, I skip samples if there is not enough room for valid ranges.
- The first live demo database run used port 27017, which was already occupied by a standalone MongoDB instance on this machine. The replica-set handshake failed. I moved the demo to port 27018 and added an explicit port check; existing database processes were left untouched.

## Stage 4 — client

- Desktop visual review showed secondary text was too small and too pale. I increased the small type sizes and darkened muted text to make table dates, form labels, and status details easier to read.
- At 390px, the visually hidden Actions heading escaped its scrollable table because its absolute position used the page as its containing block. It widened the document. I made the table scroller positioned so the heading stays contained while the table scrolls independently.

- The first lint run caught synchronous loading-state updates inside two data-loading effects. I separated initial fetching from user-triggered refreshes and added abort handling to session restoration. The initial loading state is set once, and only completed requests update it.
- Preview results are tied to the exact type and date inputs. Changing a date immediately disables submission, and aborted responses cannot overwrite the newer preview.
- The hooks lint rule also flagged the remaining updates after awaited network I/O. I kept a narrow, explained suppression at the two effect calls; synchronous refresh updates remain outside the effects.
- The first frontend test launch assumed the React Vite plugin was hoisted to the root. npm installed it under the client workspace, so I reused the client Vite configuration from the test configuration. A preview launch also used the wrong relative path to the Vite executable; I corrected it to the root installation.

- Verification: all 82 automated tests, ESLint, and the production build passed. Browser checks confirmed employee login, weekend preview, successful application, session restoration, manager login, queue display, and the approval dialog.
- The browser approval click was paused by automatic approval review because it changes persisted state and deducts demo balance. I asked for specific permission; the automated approval, refund, and concurrency tests already passed.

- The user chose to skip the browser approval check. The synthetic request remains pending; no approval was submitted. Desktop and 390px mobile layout checks are complete, with no horizontal document overflow on either dashboard.

## Final review

- The guarded-deduction failure originally reused an insufficient-balance message based on an earlier snapshot. That could misleadingly report enough balance even though the update failed. I changed it to a specific BALANCE_CHANGED error saying the request remains pending, and tightened the rollback test to check that explanation.

## Stage 5 — documentation and deployment

- I added the first-person README, root Vercel SPA configuration with response headers, and a Render API blueprint. The AI-tools section remains blank fields for the user.
- I checked the deployment guidance against the official MongoDB, Render, and Vercel documentation. No cloud deployment was performed.
- Final verification passed: 82 automated tests in the full run; the affected rollback test passed again after the final error-message correction; lint; formatting; production client build; production dependency audit (zero known vulnerabilities); npm start in production mode; and HTTP 200 from both the API health check and local client.
- The local ignored server environment file now has a generated random JWT secret. No environment files or credentials were added to Git.

- The browser's full-page screenshot stitched the recent-decisions table twice, although the DOM contained one table. I replaced that artifact with a single-viewport capture.

## Atlas connection

- I imported the user-supplied Atlas connection into the ignored server environment file. Its URI did not select a database, so I selected `fieldwork` explicitly and kept `authSource=admin`. I verified the connection and replica-set support before switching the API.
- The selected database was empty. I initialized the five demo accounts and five sample requests with the existing seed script; no existing collections or data were deleted. The previous local environment file is preserved in an ignored backup.
- I extended the ignore rules to cover credential downloads named `*.env`, in addition to the existing `.env` patterns.

- Verification passed against Atlas: API health, both role logins, current-user lookup, two employee requests, three pending team requests, two recent decisions, balance summaries, the weekend preview, and the leave-query indexes. I matched the API employee ID to the stored Atlas record to confirm the running process uses the new database. No browser approval test was performed.

## Footer personalization

- At the user's request, I replaced the dashboard footer text with “Made by Lakshay Dhiman with ♥”. The heart has an accessible “love” label, and both dashboards share the updated footer.
