import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { doctorWhatsAppLink } from "../lib/whatsapp";

const sections = [
  {
    title: "What we collect",
    body: [
      "Account details: your name, email address and password (stored only as a salted hash). If you use Google sign-in, we receive your name and email from Google.",
      "Booking details: your phone number, address, your pet's details (name, species, breed, age, weight, medical history, allergies) and the concern you describe.",
    ],
  },
  {
    title: "How we use it",
    body: [
      "Only to provide your consultation: to review your request, contact you, advise on your pet's care and keep a record of the consultation. We send you email only for account actions such as password reset.",
      "We do not sell your data or use it for advertising.",
    ],
  },
  {
    title: "Who can see it",
    body: [
      "Dr. Nituporna Sarkar and the administrator of this site. Data is stored on our own server. We use Google only for sign-in and an email provider only to deliver password-reset emails.",
    ],
  },
  {
    title: "Retention and your rights",
    body: [
      "We keep consultation records for as long as needed to provide care and meet professional record-keeping needs. Under India's Digital Personal Data Protection Act, 2023, you may ask us to access, correct or delete your personal data, or withdraw your consent, by contacting us below.",
    ],
  },
  {
    title: "Terms of use",
    body: [
      "Online consultations are advisory and are not a substitute for an in-person examination. In an emergency, take your pet to a nearby veterinary clinic immediately; do not wait for an online reply.",
      "Please give accurate information. Advice is based only on what you share with us.",
    ],
  },
];

export function Privacy() {
  const whatsapp = doctorWhatsAppLink();
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Header />
      <main className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-[720px] rounded-2xl border border-border bg-white p-8 sm:p-10">
          <h1 className="text-3xl font-bold text-ink">Privacy Policy &amp; Terms</h1>
          <p className="mt-2 text-sm text-muted">Last updated: October 2026</p>
          {sections.map((s) => (
            <section key={s.title} className="mt-8">
              <h2 className="text-lg font-semibold text-ink">{s.title}</h2>
              {s.body.map((p) => (
                <p key={p} className="mt-2 text-sm leading-relaxed text-muted">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Contact</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              For any request about your data, message Dr. Sarkar
              {whatsapp ? (
                <>
                  {" "}
                  on{" "}
                  <a href={whatsapp} target="_blank" rel="noreferrer" className="text-primary-600 underline">
                    WhatsApp
                  </a>
                </>
              ) : null}
              {" "}or email{" "}
              <a href="mailto:drsarkar.vet@gmail.com" className="text-primary-600 underline">
                drsarkar.vet@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
