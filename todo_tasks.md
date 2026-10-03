# Remaining TODO

## Must fix before going live

- [ ] **1. Make the backend hostable.** `db_setup.py` starts a local Postgres with `--auth=trust` from `db/`.
  - Use a managed Postgres via `DATABASE_URL` (Neon, Supabase, Render, Railway).
  - Set `JWT_SECRET` in the host's environment (otherwise it is regenerated on each deploy and everyone is logged out).
  - Set `ADMIN_PASSWORD` in the host's environment (otherwise a new one is generated into `.env` and printed in the console).
  - Set `CORS_ORIGINS` and `APP_BASE_URL` to the real domain (they default to `localhost:5173`).
- [ ] **2. Make the built frontend reach the API.** `/api` is only proxied by the Vite dev server (`vite.config.ts`).
  - Either serve frontend and backend on one domain behind a reverse proxy, or add a `VITE_API_URL` base URL used in `src/lib/api.ts`.
  - Configure the host to fall back to `index.html` for unknown paths, so refreshing `/book` or `/admin` doesn't 404.
- [ ] **3. Set build-time environment variables on the host.** `.env.local` is gitignored.
  - `VITE_DOCTOR_WHATSAPP` (without it the WhatsApp buttons disappear).
  - `VITE_GOOGLE_CLIENT_ID`, and add the live domain to the allowed origins in Google Cloud Console.
  - `VITE_SITE_URL` = the live address, e.g. `https://drsarkar.in` (no trailing slash). Needed for WhatsApp/Facebook link previews, which require absolute URLs; it defaults to `http://localhost:5173`.

## Should fix

- [ ] **4. Forgot-password emails don't send yet.** Gmail rejects the SMTP login (`535 Username and Password not accepted`). Values in `backend/.env` are correctly formatted, so the app password is the likely problem.
  - [ ] Confirm 2-Step Verification is on for `drsarkar.vet@gmail.com` and the address is exact.
  - [ ] Create a fresh app password at myaccount.google.com/apppasswords (16 letters, no spaces), set it as `SMTP_PASSWORD` in `backend/.env`, restart the backend.
  - [ ] Test `/forgot-password` with a registered email; check inbox and spam.
  - [ ] Before production: set the `SMTP_*` variables and `APP_BASE_URL` (live domain) in the host's environment. Consider Brevo/Resend/SES for better delivery than Gmail.
- [ ] **5. Rate-limit login and register endpoints** (e.g. `slowapi`) against password guessing and spam sign-ups. (Admin login and forgot-password already have in-memory limits.)
- [ ] **6. Add a privacy policy / terms page**, linked from the footer and booking form. The site collects phone numbers, addresses and pet medical details (India's DPDP Act 2023).
- [ ] **7. Confirm public claims with Dr. Sarkar.** The home page says "100+ clinical cases managed" and "fewer than 10 mortalities". Her CV (`details.docx`) says 200+, so check the lower figure is intended.

## After deploying

- [ ] Test the link preview: paste the live URL into WhatsApp. If it looks stale, re-share with `?v=2` appended or refresh it with Facebook's Sharing Debugger.

## Nice to have

- [ ] Add a 404 page (unknown URLs currently show a blank page).
- [ ] Avoid duplicate pet records: every booking creates a new pet, so returning owners get duplicates.
- [ ] Set up error monitoring (e.g. Sentry) and database backups.
- [ ] Move the in-memory rate limits (admin login, forgot-password) to a shared store if the backend ever runs more than one instance.

## Open questions

- [ ] MVSc college wording: currently "College of Veterinary Science, AVFU, Khanapara" (BVSc says AAU). Add "(under AAU)" if wanted.
- [ ] The deletion of `Veterinary_Online_Consultation_Figma_Wireframe_Specification.pdf` is still uncommitted: commit it or `git restore` it.

## Suggested hosting

Frontend on Vercel or Netlify, FastAPI backend on Render or Railway, Postgres on Neon (or the same host as the backend).
