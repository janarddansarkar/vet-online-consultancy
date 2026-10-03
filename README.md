# Vet Online Consultancy

Requires Node, Python 3.11+ and PostgreSQL installed.

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Runs at http://localhost:8000

## Frontend

In a second terminal, from the project root:

```bash
npm install
npm run dev
```

Runs at http://localhost:5173 (admin dashboard at http://localhost:5173/admin)

The admin dashboard asks for a password. On first run the backend generates one, saves it as `ADMIN_PASSWORD` in `backend/.env` and prints it once in the backend console. Set `ADMIN_PASSWORD` yourself in production.


Password reset emails need SMTP settings in `backend/.env` (see `backend/.env.example`). Without them, the reset link is printed in the backend console instead of emailed.
