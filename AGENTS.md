# V.A.U.L.T — independent application

This project uses React/Vite, Supabase Auth/Postgres and Supabase Edge Functions.
Read README.md and docs/SETUP.md before changing backend configuration.

- No Base44 SDK, proxy or hosted runtime is used. docs/legacy-schema is historical documentation only.
- Never add service-role keys, provider secrets or financial data to frontend environment variables or commits.
- Preserve row-level security and explicit owner checks on every data path.
- User data must not cross accounts through query caches, local preferences or assistant state.
- AI requests require a signed-in user. Sending account records to Gemini requires explicit, revocable opt-in saved separately per user/browser. Re-check that permission before every request; never pre-enable it or include it in backups. The server still requires shareAccount=true for each account-data request.
- The AI may propose supported bookkeeping actions; only a separate explicit user confirmation applies them. Preserve audit history, undo conflict checks and RLS. Never execute bank payments or invent market indicators.
- Run npm run lint, npm test, npm run build:pages and npm run typecheck. Record existing type issues honestly.
- Web hosting is GitHub Pages. Read deployment documentation before merging or publishing.
- Do not publish or alter the legacy production app.
