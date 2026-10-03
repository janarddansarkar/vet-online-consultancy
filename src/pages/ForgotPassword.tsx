import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { PawIcon } from "../components/icons";
import { ApiError, forgotPassword } from "../lib/api";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
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
            <h1 className="mt-5 text-2xl font-bold text-ink">Forgot password?</h1>
            <p className="mt-2 text-sm text-muted">
              {sent
                ? "If an account exists for that email, we've sent a link to reset your password. It expires in 30 minutes."
                : "Enter your email and we'll send you a link to reset your password."}
            </p>
          </div>

          {!sent && (
            <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
              {error && (
                <p className="rounded-lg bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600">{error}</p>
              )}
              <Input
                label="Email"
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
                {submitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-muted">
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
