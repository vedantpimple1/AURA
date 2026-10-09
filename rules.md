# Engineering Rules and Constraints

## 1. General Coding Rules
- Write clean, maintainable, and explicitly defined code.
- Avoid premature optimization.
- Prefer simplicity over cleverness.

## 2. TypeScript Rules
- Strict mode must be enabled.
- Avoid `any`. Use precise types or `unknown` where necessary.

## 3. React Rules
- Use functional components and hooks.
- Keep components small and focused.

## 4. Next.js Rules
- Adhere to Next.js App Router conventions.
- Do not mix Pages Router and App Router patterns.

## 5. App Router Rules
- Use `page.tsx`, `layout.tsx`, and `route.ts` correctly.
- Leverage Server Components by default.

## 6. Server/Client Component Boundaries
- Explicitly mark client components with `"use client"`.
- Keep client boundaries as low in the tree as possible.

## 7. API Rules
- Use structured JSON responses.
- Enforce strict validation on all incoming data.

## 8. Backend Service-Layer Rules
- Do not put business logic directly inside UI components.
- Separate database calls into a dedicated layer.

## 9. Prisma/Database Rules
- Prisma version is locked to `7.10.0`.
- @prisma/client is locked to `7.10.0`.
- Do not casually upgrade Prisma.
- Do not downgrade Prisma merely to suppress an npm audit warning.
- Do not run `npm audit fix --force` without explicit dependency analysis.
- Database access should occur through appropriate server-side boundaries.

## 10. PostgreSQL Rules
- PostgreSQL is the primary database.
- Use least-privilege database credentials where applicable.

## 11. Validation Rules
- Validate all external input (URL parameters, request bodies, headers, cookies, uploaded files, AI output).
- Treat AI output as untrusted data.

## 12. Error Handling Rules
- Errors must be handled deliberately.
- Never silently swallow errors.
- Never use empty catch blocks.
- Never expose stack traces to users.
- Never expose database errors directly to clients.
- Never leak secrets.
- Never return inconsistent error formats.
- Separate errors into: User-facing, Developer diagnostic, Server log, Database error, External-service error.

## 13. Logging Rules
- Log critical actions and errors for debugging and auditing.

## 14. Security Rules
- Never commit: `.env`, API keys, database passwords, private keys, OAuth secrets, JWT secrets, service credentials.
- Do not place secrets in client-side code.
- Do not expose server-only environment variables to browser code (Never use `NEXT_PUBLIC_` for secrets).

## 15. Environment Variable Rules
- Maintain `.env.example` alongside `.env`.

## 16. Authentication Rules
- Validate user identity on all protected routes and server actions.

## 17. Authorization Rules
- Authorization must be enforced by application code (not AI, not client-side logic).

## 18. AI Integration Rules
- AI functionality must have explicit boundaries.
- AI may be used for text generation, summarization, classification, insights, recommendations, and natural-language interpretation.

## 19. AI Safety/Boundary Rules
- AI must NOT be treated as a source of truth for authorization, financial calculations, permissions, or database integrity.
- AI must NOT replace deterministic business rules or validation.
- Do not allow an LLM to directly execute arbitrary database operations.
- Do not expose raw system prompts, secrets, API keys, or internal context.
- Validate and sanitize AI-generated structured output before use.

## 20. Dependency Rules
- Use the smallest appropriate library set.
- Do not introduce a dependency merely because it is popular.
- Do not replace established project libraries without reason.

## 21. Library Selection Rules
Before adding a library ask:
1. Is it actually necessary?
2. Does the existing stack already solve this?
3. Is it compatible with the current Next.js version?
4. Is it compatible with React 19?
5. Is it compatible with Prisma 7?
6. Is it actively maintained?
7. Does it introduce unnecessary security or bundle risk?
8. Does it duplicate an existing capability?
- Avoid unnecessary libraries for state management, HTTP clients, form handling, validation, date manipulation, or utility functions if native capabilities suffice.

## 22. Testing Rules
- Ensure core business logic is testable.

## 23. Git Rules
- Use small meaningful commits.
- Commit messages should describe the change (e.g., `feat: ...`, `fix: ...`, `chore: ...`).
- Do not commit `.env`, credentials, temporary files, `node_modules`, generated secrets.
- Never rewrite historical project documentation merely to make history look clean.

## 24. Documentation Rules
- Every meaningful implementation iteration must update `memory.md` and applicable documents (`architecture.md`, `rules.md`, `phases.md`, `design.md`).
- Documentation must reflect actual repository state. Do not document imagined functionality.

## 25. Performance Rules
- Minimize client-side JavaScript.

## 26. Accessibility Rules
- Ensure components are accessible (ARIA labels, keyboard navigation).

## 27. Code Review Rules
- Ensure adherence to all rules in this document before merging.
