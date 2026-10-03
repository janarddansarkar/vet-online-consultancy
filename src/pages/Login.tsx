import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { GoogleButton } from "../components/GoogleButton";
import { PawIcon } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

export function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleCredential(credential: string) {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle(credential);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px] rounded-2xl border border-border bg-white p-10">
          <div className="flex flex-col items-center text-center">
            <Link to="/" className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white">
              <PawIcon className="h-6 w-6" />
            </Link>
            <h1 className="mt-5 text-2xl font-bold text-ink">Welcome Back</h1>
            <p className="mt-2 text-sm text-muted">
              Log in to manage your pets and appointments with Dr. Nituparna Sarkar.
            </p>
          </div>

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

            <div className="flex flex-col gap-2">
              <Input
                label="Password"
                type="password"
                name="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting ? "Logging in…" : "Login"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase text-placeholder">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <GoogleButton onCredential={handleGoogleCredential} text="signin_with" />

          <p className="mt-8 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
