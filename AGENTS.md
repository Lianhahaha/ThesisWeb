# Project workflow

- Commit and push every change to this repository after it is made and verified. Do not leave work uncommitted.
- Before committing, run `npm run lint` and `npx tsc --noEmit`; run `npm test` when logic changes.
- If `origin/main` has moved ahead, run `git pull --rebase origin main` first.
- Use the existing commit style: `feat(scope): ...`, `fix(scope): ...`, `chore(scope): ...`, `docs: ...`, `test(scope): ...`.
