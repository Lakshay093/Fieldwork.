# Development log

I record corrections here as they happen, including the cause and the check used after the fix.

## Stage 1 — models and calendar

- The machine's default Node is 21, which is not LTS. I am using the bundled Node runtime for verification and targeting Node 24 LTS in `.nvmrc`.
- The empty project initially inherited a parent repository from the Windows home directory. I initialized a repository inside this project so stage commits stay scoped to the application.

- Initial model tests used Mongoose's deprecated synchronous validator. I switched them to async validation after the first test run reported the warning. All 22 stage 1 tests pass.
