# Development log

I record corrections here as they happen, including the cause and the check used after the fix.

## Stage 3 — demo seed

- The demo seed preserves existing accounts, passwords, balances, and requests on repeat runs. Samples use upcoming working days in the current year; near year end, I skip samples if there is not enough room for valid ranges.
- The first live demo database run used port 27017, which was already occupied by a standalone MongoDB instance on this machine. The replica-set handshake failed. I moved the demo to port 27018 and added an explicit port check; existing database processes were left untouched.

## Stage 1 — models and calendar

- The machine's default Node is 21, which is not LTS. I am using the bundled Node runtime for verification and targeting Node 24 LTS in `.nvmrc`.
- The empty project initially inherited a parent repository from the Windows home directory. I initialized a repository inside this project so stage commits stay scoped to the application.

- Initial model tests used Mongoose's deprecated synchronous validator. I switched them to async validation after the first test run reported the warning. All 22 stage 1 tests pass.

## Stage 2 — services and API

- The first API run passed all 72 tests but Mongoose 9 reported that the update option named new is deprecated. I replaced it with returnDocument: 'after' and reran the suite.
- Concurrent approvals honor other pending reservations. If an administrator reduces a balance below all reservations, neither request is approved until a reservation is released; the balance stays intact and both requests stay pending.
