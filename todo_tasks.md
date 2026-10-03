# Remaining TODO

## Must fix before going live

- [ ] **1. Deploy to the Hostinger VPS** (templates and step-by-step commands are ready: see "Deploying to a VPS" in `README.md` and the `deploy/` folder). Items below are done on the server:
  - [ ] Confirm the Hostinger plan is a VPS with root SSH access, and point the domain's DNS A record at its IP.
  - [ ] Install PostgreSQL, create the `vet_app` user and database with a strong password; keep port 5432 closed in the firewall.
  - [ ] Create `/srv/vet/backend/.env` with `DATABASE_URL` (port 5432), a fixed `JWT_SECRET`, `ADMIN_PASSWORD`, `CORS_ORIGINS` and `APP_BASE_URL` (live domain), `GOOGLE_CLIENT_ID`, `SMTP_*`.
  - [ ] Start the backend with systemd (`deploy/vet-backend.service`); check `/api/health`.
  - [ ] Build the frontend with `VITE_SITE_URL`, `VITE_DOCTOR_WHATSAPP`, `VITE_GOOGLE_CLIENT_ID` set (covers the old item "build-time environment variables"); serve it with Nginx (`deploy/nginx.conf`: `/api` proxy and `index.html` fallback); enable HTTPS with certbot. Add the live domain to the allowed origins in Google Cloud Console.
  - [ ] Install the nightly backup (`deploy/backup-db.sh`), test a restore once, and copy dumps off the server now and then.
  - [ ] Final check: register, book, log into `/admin`, download Excel, refresh `/book` and `/admin`, reboot the server and confirm everything comes back.

## Should fix

- [ ] **2. Forgot-password emails don't send yet.** Gmail rejects the SMTP login (`535 Username and Password not accepted`). Values in `backend/.env` are correctly formatted, so the app password is the likely problem.
  - [ ] Confirm 2-Step Verification is on for `drsarkar.vet@gmail.com` and the address is exact.
  - [ ] Create a fresh app password at myaccount.google.com/apppasswords (16 letters, no spaces), set it as `SMTP_PASSWORD` in `backend/.env`, restart the backend.
  - [ ] Test `/forgot-password` with a registered email; check inbox and spam.
  - [ ] Before production: set the `SMTP_*` variables and `APP_BASE_URL` (live domain) in the host's environment. Consider Brevo/Resend/SES for better delivery than Gmail.
- [ ] **3. Rate-limit login and register endpoints** (e.g. `slowapi`) against password guessing and spam sign-ups. (Admin login and forgot-password already have in-memory limits.)
- [ ] **4. Add a privacy policy / terms page**, linked from the footer and booking form. The site collects phone numbers, addresses and pet medical details (India's DPDP Act 2023).
- [ ] **5. Confirm public claims with Dr. Sarkar.** The home page says "100+ clinical cases managed" and "fewer than 10 mortalities". Her CV (`details.docx`) says 200+, so check the lower figure is intended.

## After deploying

- [ ] Test the link preview: paste the live URL into WhatsApp. If it looks stale, re-share with `?v=2` appended or refresh it with Facebook's Sharing Debugger.

## Nice to have

- [ ] Add a 404 page (unknown URLs currently show a blank page).
- [ ] Avoid duplicate pet records: every booking creates a new pet, so returning owners get duplicates.
- [ ] Set up error monitoring (e.g. Sentry).
- [ ] Move the in-memory rate limits (admin login, forgot-password) to a shared store if the backend ever runs more than one instance.

## Open questions

- [ ] MVSc college wording: currently "College of Veterinary Science, AVFU, Khanapara" (BVSc says AAU). Add "(under AAU)" if wanted.
- [ ] The deletion of `Veterinary_Online_Consultation_Figma_Wireframe_Specification.pdf` is still uncommitted: commit it or `git restore` it.
