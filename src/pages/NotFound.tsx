import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { PawIcon } from "../components/icons";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="animate-fade-up w-full max-w-[420px] rounded-2xl border border-border bg-white p-10 text-center">
          <Link to="/" className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white">
            <PawIcon className="h-6 w-6" />
          </Link>
          <h1 className="mt-5 text-2xl font-bold text-ink">Page not found</h1>
          <p className="mt-2 text-sm text-muted">The page you're looking for doesn't exist or has moved.</p>
          <Button href="/" variant="primary" className="mt-8 w-full">
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}
