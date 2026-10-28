import { Link } from "react-router-dom";
import { PawIcon } from "./icons";
import { doctorWhatsAppLink } from "../lib/whatsapp";

const columns = [
  {
    title: "Practice",
    links: [
      { label: "About", href: "/#about" },
      { label: "Contact on WhatsApp", href: doctorWhatsAppLink() ?? "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-20">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
                <PawIcon className="h-5 w-5" />
              </span>
              Dr. Nituparna Sarkar
            </div>
            <p className="mt-4 text-sm text-muted">
              Trusted online veterinary consultations, whenever your pet needs care.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-ink">{col.title}</h4>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...(link.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                      className="text-sm text-muted hover:text-ink"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-border pt-6 text-sm text-muted">
          © {new Date().getFullYear()} Dr. Nituparna Sarkar. All rights reserved.
          {" · "}
          <Link to="/privacy" className="hover:text-ink">
            Privacy &amp; Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
