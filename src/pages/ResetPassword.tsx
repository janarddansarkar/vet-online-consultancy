import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { PawIcon } from "../components/icons";
import { ApiError, resetPassword } from "../lib/api";

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="animate-fade-up w-full max-w-[420px] rounded-2xl border border-border bg-white p-10">
          <div className="flex flex-col items-center text-center">
            <Link to="/" className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white">
              <PawIcon className="h-6 w-6" />
            </Link>
            <h1 className="mt-5 text-2xl font-bold text-ink">Reset password</h1>
            <p className="mt-2 text-sm text-muted">
              {done
                ? "Your password has been reset. Taking you to the login page…"
                : token
                  ? "Choose a new password for your account."
                  : "This reset link is incomplete. Please request a new one."}
            </p>
          </div>

          {!done && token && (
            <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
              {error && (
                <p className="rounded-lg bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600">{error}</p>
              )}
              <Input
                label="New password"
                type="password"
                name="new-password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Input
                label="Confirm new password"
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
                {submitting ? "Saving…" : "Reset password"}
              </Button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-muted">
            {!done && !token ? (
              <Link to="/forgot-password" className="font-semibold text-primary-600 hover:text-primary-700">
                Request a new link
              </Link>
            ) : (
              <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
                Back to login
              </Link>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
