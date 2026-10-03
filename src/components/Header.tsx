import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "./Button";
import { PawIcon } from "./icons";
import { useAuth } from "../context/AuthContext";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/#about" },
];

function greetingName(fullName: string): string {
  const words = fullName.split(" ");
  return words[0].endsWith(".") ? words.slice(0, 2).join(" ") : words[0];
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6 lg:px-20">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
            <PawIcon className="h-5 w-5" />
          </span>
          Dr. Nituparna Sarkar
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.label}
              to={link.href}
              className="text-sm font-medium text-body transition-colors hover:text-ink"
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <span className="text-sm font-medium text-body">Hi, {greetingName(user.full_name)}</span>
              <Button variant="primary" href="/book">
                Book Now
              </Button>
              <Button variant="text" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="text" href="/login">
                Login
              </Button>
              <Button variant="primary" href="/login">
                Book Now
              </Button>
            </>
          )}
        </div>

        <button
          aria-label="Toggle menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <div className="flex flex-col gap-1">
            <span className="h-0.5 w-5 bg-ink" />
            <span className="h-0.5 w-5 bg-ink" />
            <span className="h-0.5 w-5 bg-ink" />
          </div>
        </button>
      </div>

      {menuOpen && (
        <div className="animate-fade-up flex flex-col gap-1 border-t border-border bg-white px-6 py-4 lg:hidden">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="rounded-lg px-3 py-2 text-sm font-medium text-body hover:bg-gray-50">
              {link.label}
            </a>
          ))}
          <div className="mt-2 flex flex-wrap gap-3 px-3">
            {user ? (
              <>
                <Button variant="primary" href="/book" className="flex-1">
                  Book Now
                </Button>
                <Button variant="secondary" onClick={handleLogout} className="flex-1">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" href="/login" className="flex-1">
                  Login
                </Button>
                <Button variant="primary" href="/login" className="flex-1">
                  Book Now
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
