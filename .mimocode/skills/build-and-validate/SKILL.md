---
name: build-and-validate
description: Validate code changes by running build and lint checks. Use after making code modifications to ensure no regressions.
---

# Build & Validate Skill

Systematically validate code changes through build and lint checks to catch errors early.

## When to Use

- After completing a code change or feature implementation
- Before committing changes
- When debugging unexpected behavior after edits
- As a final check before reporting task completion

## Procedure

### Phase 1: Build Check
1. Run the project's build command with error capture:
   ```bash
   npm run build 2>&1
   ```
2. If build fails:
   - Parse error output for file paths and line numbers
   - Fix the errors
   - Re-run build until successful
3. Record build result (success/failure + any warnings)

### Phase 2: Lint Check
1. Run the project's lint command:
   ```bash
   npm run lint 2>&1
   ```
2. If lint fails:
   - Categorize errors (syntax, style, unused imports, etc.)
   - Fix critical errors
   - Decide on style warnings based on project conventions
3. Record lint result (success/failure + warning count)

### Phase 3: Verification
1. If both build and lint pass, confirm the changes are valid
2. If either fails, report the specific issues found
3. Provide a summary of what was checked and results

## Decision Points

- **Build errors**: Always fix before proceeding
- **Lint errors**: Fix all errors; warnings are optional based on project rules
- **Warnings**: Log but don't block unless they indicate potential issues

## Output Format

```
## Validation Results
- Build: ✅ PASS / ❌ FAIL (with error count)
- Lint: ✅ PASS / ❌ FAIL (with error count)
- Warnings: X (optional)
- Status: Ready to commit / Issues found
```

## Common Patterns

### Vite Projects
```bash
npm run build 2>&1
npm run lint 2>&1
```

### TypeScript Projects
```bash
npx tsc --noEmit 2>&1
npm run build 2>&1
```

### Python Projects
```bash
python -m py_compile <file>
python -m flake8 <directory>
```

## Notes

- Always capture stderr (2>&1) to get full error output
- Build should be run before lint as build errors prevent linting
- For large projects, consider running lint only on changed files first
