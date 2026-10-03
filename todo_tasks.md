# Pre-deployment TODO

## Must fix before going live

- [x] **1. Protect the admin dashboard and API.** (Done: shared `ADMIN_PASSWORD` login, separate admin token, all `/api/admin/*` routes except `/login` protected, 5 failed attempts lock out an IP for 10 min. Set `ADMIN_PASSWORD` in the production environment.)
  - Original problem: `backend/app/routers/admin.py` has no login, so anyone can open `/admin` or call `/api/admin/*` and see every owner's name, email, phone, address and pet medical details, download the Excel export, and change statuses.
  - Add a doctor login (e.g. `is_admin` flag on users, or an admin password in `.env`).
  - Require it on every `/api/admin/*` route and send `/admin` to a login page.
- [ ] **2. Make the backend hostable.** `db_setup.py` starts a local Postgres with `--auth=trust` from `db/`.
  - Use a managed Postgres via `DATABASE_URL` (Neon, Supabase, Render, Railway).
  - Set `JWT_SECRET` in the host's environment (otherwise it is regenerated on each deploy and everyone is logged out).
  - Set `CORS_ORIGINS` and `APP_BASE_URL` to the real domain (they default to `localhost:5173`).
- [ ] **3. Make the built frontend reach the API.** `/api` is only proxied by the Vite dev server (`vite.config.ts`).
  - Either serve frontend and backend on one domain behind a reverse proxy, or add a `VITE_API_URL` base URL used in `src/lib/api.ts`.
  - Configure the host to fall back to `index.html` for unknown paths, so refreshing `/book` or `/admin` doesn't 404.
- [ ] **4. Set build-time environment variables on the host.** `.env.local` is gitignored.
  - `VITE_DOCTOR_WHATSAPP` (without it the WhatsApp buttons disappear).
  - `VITE_GOOGLE_CLIENT_ID`, and add the live domain to the allowed origins in Google Cloud Console.

## Should fix

- [ ] **5. Compress the photos.** `nitu_profile1.png` (2.0 MB) and `nitu_profile2.png` (1.7 MB). Convert to WebP at ~1200px wide (target ~100-200 KB each).
- [ ] **6. "Forgot password?" goes nowhere** (`src/pages/Login.tsx:87`, `href="#"`). Build a password reset (needs an email service) or remove the link.
- [ ] **7. Rate-limit login and register endpoints** (e.g. `slowapi`) against password guessing and spam sign-ups.
- [ ] **8. Add a privacy policy / terms page**, linked from the footer and booking form. The site collects phone numbers, addresses and pet medical details (India's DPDP Act 2023).
- [ ] **9. Review public claims on the home page.**
  - The 5.0 star rating is hard-coded in `Home.tsx`; remove it until there are real reviews.
  - Confirm Dr. Sarkar is comfortable publishing "fewer than 10 mortalities across 200+ cases".

## Nice to have

- [ ] Add a meta description and Open Graph tags in `index.html` (link previews on WhatsApp).
- [ ] Add a 404 page (unknown URLs currently show a blank page).
- [ ] Avoid duplicate pet records: every booking creates a new pet, so returning owners get duplicates.
- [ ] Set up error monitoring (e.g. Sentry) and database backups.

## Open questions

- [ ] Confirm the MVSc college name wording (currently "College of Veterinary Science, AVFU, Khanapara"; BVSc says AAU). Add "(under AAU)" if wanted.
- [ ] Decide on the uncommitted deletion of `Veterinary_Online_Consultation_Figma_Wireframe_Specification.pdf` (commit it or `git restore` it).

## Suggested hosting

Frontend on Vercel or Netlify, FastAPI backend on Render or Railway, Postgres on Neon (or the same host as the backend).
