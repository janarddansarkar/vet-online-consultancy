import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { GoogleButton } from "../components/GoogleButton";
import { PawIcon } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

export function Register() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ fullName, email, phone, password });
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
    <div className="flex min-h-screen bg-bg">
      <div className="hidden flex-1 items-center justify-center bg-primary-50 p-16 lg:flex">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white">
            <PawIcon className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-ink">Care for your pet, from anywhere</h2>
          <p className="text-sm text-muted">
            Create an account to book video, audio, or chat consultations with Dr. Nituparna Sarkar and keep your
            pet's medical history in one place.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <Link to="/" className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white lg:hidden">
              <PawIcon className="h-6 w-6" />
            </Link>
            <h1 className="mt-5 text-2xl font-bold text-ink lg:mt-0">Create your account</h1>
            <p className="mt-2 text-sm text-muted">
              Sign up to manage your pets and book consultations with Dr. Nituparna Sarkar.
            </p>
          </div>

          <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
            {error && (
              <p className="rounded-lg bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600">{error}</p>
            )}

            <Input
              label="Full Name"
              type="text"
              name="fullName"
              placeholder="Jane Doe"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

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

            <Input
              label="Phone"
              type="tel"
              name="phone"
              placeholder="+1 555 123 4567"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              name="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <p className="text-center text-xs text-muted">
              By continuing you agree to our{" "}
              <Link to="/privacy" className="underline">
                Privacy Policy &amp; Terms
              </Link>
              .
            </p>

            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting ? "Creating account…" : "Create Account"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase text-placeholder">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <GoogleButton onCredential={handleGoogleCredential} text="signup_with" />

          <p className="mt-8 text-center text-sm text-muted lg:text-left">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
