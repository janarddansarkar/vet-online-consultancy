# Remaining TODO (in deployment order)

Deployment guide: "Deploying to a VPS" in `README.md`; config templates in `deploy/`.

## A. Before you start (can be done now, on your laptop)

- [ ] **Confirm the Hostinger plan is a VPS** with root SSH access (shared web hosting can't run this). Note the server's IP and Ubuntu version.
- [ ] **Choose and register the domain**, then point its DNS A record (and `www`) at the VPS IP. HTTPS, Google sign-in and link previews all need the domain.
- [ ] **Fix the Gmail app password for reset emails.** Gmail still rejects the login (`535 Username and Password not accepted`); the values in `backend/.env` are correctly formatted, so the app password is the likely problem.
  - [ ] Confirm 2-Step Verification is on for `drsarkar.vet@gmail.com`, create a fresh app password at myaccount.google.com/apppasswords (16 letters, no spaces), put it in `backend/.env`, restart, test `/forgot-password`.
  - [ ] Or use Brevo/Resend/SES for better delivery than Gmail (needs a verified sending domain).
- [ ] **Confirm public claims with Dr. Sarkar.** The home page says "100+ clinical cases managed" and "fewer than 10 mortalities"; her CV (`details.docx`) says 200+, so check the lower figure is intended.
- [ ] **Add a privacy policy / terms page** (footer + booking form). The site collects phone numbers, addresses and pet medical details (India's DPDP Act 2023).
- [ ] **Decide the open questions below** (they change page text).

## B. On the server (follow the README, in this order)

- [ ] Secure the server first: SSH keys only (disable password login), firewall allowing only SSH/80/443 (port 5432 stays closed), automatic security updates.
- [ ] Install PostgreSQL; create the `vet_app` user and `vet_online_consultancy` database with a strong password.
- [ ] Create `/srv/vet/backend/.env`: `DATABASE_URL` (port 5432), a fixed `JWT_SECRET`, `ADMIN_PASSWORD`, `CORS_ORIGINS` and `APP_BASE_URL` (live domain), `GOOGLE_CLIENT_ID`, `SMTP_*`. Set `chmod 600`.
- [ ] Start the backend with systemd (`deploy/vet-backend.service`); check `curl http://127.0.0.1:8000/api/health`.
- [ ] Build the frontend with `VITE_SITE_URL`, `VITE_DOCTOR_WHATSAPP`, `VITE_GOOGLE_CLIENT_ID` set (baked in at build time).
- [ ] Set up Nginx (`deploy/nginx.conf`), then HTTPS with certbot.
- [ ] Add the live domain to the allowed JavaScript origins for the Google sign-in client in Google Cloud Console.
- [ ] Install the nightly backup (`deploy/backup-db.sh`); test a restore once; arrange an off-server copy and turn on Hostinger snapshots.
- [ ] Check the server can send mail: outbound port 587 must be open (some VPS providers block SMTP).
- [ ] Rate-limit login and register at the server (Nginx `limit_req` on `/api/auth/`) or in the app (`slowapi`), against password guessing and spam sign-ups. Admin login and forgot-password already have in-memory limits.

## C. Final checks after deploying

- [ ] Register, log in, book a consultation, log into `/admin`, see it, download the Excel file.
- [ ] Refresh `/book`, `/admin` and `/reset-password` directly (no 404).
- [ ] Google sign-in works; forgot-password email arrives (check spam).
- [ ] Wrong admin password 5 times locks only that visitor out (confirms real IPs reach the backend).
- [ ] Reboot the server: PostgreSQL, the backend service and Nginx come back on their own.
- [ ] Paste the live URL into WhatsApp to check the link preview. If it looks stale, re-share with `?v=2` appended or refresh it with Facebook's Sharing Debugger.
- [ ] Change the admin password if it was ever shared, and keep `backend/.env` out of chats and git.

## D. Later / nice to have

- [ ] Add a 404 page (unknown URLs currently show a blank page).
- [ ] Avoid duplicate pet records: every booking creates a new pet, so returning owners get duplicates.
- [ ] Set up error monitoring (e.g. Sentry) and uptime monitoring (e.g. UptimeRobot).
- [ ] If the backend ever runs more than one instance, move the in-memory rate limits to a shared store and run migrations as a separate deploy step.

## Open questions

- [ ] MVSc college wording: currently "College of Veterinary Science, AVFU, Khanapara" (BVSc says AAU). Add "(under AAU)" if wanted.
- [ ] The deletion of `Veterinary_Online_Consultation_Figma_Wireframe_Specification.pdf` is still uncommitted: commit it or `git restore` it.
