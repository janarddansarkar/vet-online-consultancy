import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Button } from "../components/Button";
import { CheckCircleIcon, PawIcon, WhatsAppIcon } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import { ApiError } from "../lib/api";
import { SEX_LABELS, dateOfBirthFromAge, petLabel } from "../lib/pet";
import { doctorWhatsAppLink } from "../lib/whatsapp";

const SPECIES_SUGGESTIONS = ["Dog", "Cat", "Bird", "Rabbit", "Guinea pig", "Hamster", "Fish", "Turtle", "Cow", "Goat"];

const inputClass =
  "h-12 w-full rounded-lg border border-border bg-white px-4 text-base text-ink placeholder-placeholder outline-none focus:border-ink focus:ring-1 focus:ring-ink";
const textareaClass =
  "w-full resize-none rounded-lg border border-border bg-white px-4 py-3 text-base text-ink placeholder-placeholder outline-none focus:border-ink focus:ring-1 focus:ring-ink";

interface PetFormState {
  name: string;
  species: string;
  breed: string;
  gender: api.PetGender | "";
  ageYears: string;
  ageMonths: string;
  weightKg: string;
  medicalHistory: string;
  allergies: string;
  currentMedications: string;
}

const initialPetForm: PetFormState = {
  name: "",
  species: "",
  breed: "",
  gender: "",
  ageYears: "",
  ageMonths: "0",
  weightKg: "",
  medicalHistory: "",
  allergies: "",
  currentMedications: "",
};

export function Book() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [pet, setPet] = useState<PetFormState>(initialPetForm);
  const whatsAppHref = doctorWhatsAppLink();
  const locationHref = doctorWhatsAppLink("Hi Dr. Sarkar, sharing my location for the home visit.");

  const [symptoms, setSymptoms] = useState("");
  const [homeVisitRequired, setHomeVisitRequired] = useState<boolean | null>(null);
  const [homeVisitAddress, setHomeVisitAddress] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<api.Appointment | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setOwnerName((prev) => prev || user.full_name);
    setOwnerPhone((prev) => prev || user.phone || "");
  }, [user]);

  function updatePetField<K extends keyof PetFormState>(field: K, value: PetFormState[K]) {
    setPet((prev) => ({ ...prev, [field]: value }));
  }

  const ageYears = Number(pet.ageYears);
  const ageMonths = Number(pet.ageMonths);
  const ageValid = pet.ageYears !== "" && ageYears >= 0 && (ageYears > 0 || ageMonths > 0);

  const missingField = !ownerName.trim()
    ? "Please enter the owner's name."
    : ownerPhone.trim().length < 7
      ? "Please enter a valid contact number."
      : !pet.species.trim()
        ? "Please enter your pet's species."
        : !pet.breed.trim()
          ? "Please enter your pet's breed (or \"Mixed\" / \"Not sure\")."
          : !ageValid
            ? "Please enter your pet's age."
            : !pet.gender
              ? "Please select your pet's sex."
              : !symptoms.trim()
                ? "Please describe the main problem."
                : homeVisitRequired === null
                  ? "Please choose whether your pet needs a home visit."
                  : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (missingField || !pet.gender) {
      setError(missingField);
      return;
    }

    const token = api.getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    setSubmitting(true);
    try {
      const createdPet = await api.createPet(token, {
        name: pet.name.trim() || undefined,
        species: pet.species.trim(),
        breed: pet.breed.trim(),
        gender: pet.gender,
        date_of_birth: dateOfBirthFromAge(ageYears, ageMonths),
        weight_kg: pet.weightKg || undefined,
        medical_history: pet.medicalHistory.trim() || undefined,
        allergies: pet.allergies.trim() || undefined,
        current_medications: pet.currentMedications.trim() || undefined,
      });

      const appointment = await api.createAppointment(token, {
        pet_id: createdPet.id,
        symptoms: symptoms.trim(),
        home_visit_required: homeVisitRequired === true,
        home_visit_address: homeVisitRequired ? homeVisitAddress.trim() || undefined : undefined,
        contact_name: ownerName.trim(),
        contact_phone: ownerPhone.trim(),
      });

      setConfirmed(appointment);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted">Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (confirmed) {
    const shareHref = doctorWhatsAppLink(
      `Hi Dr. Sarkar, I just submitted a consultation request for ${petLabel(confirmed.pet)} (${confirmed.pet.species}). Sharing photos and videos here.`
    );
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center px-6 py-20">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-white p-10 text-center">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-primary-600" />
            <h1 className="mt-5 text-2xl font-bold text-ink">Consultation request sent</h1>
            <p className="mt-2 text-sm text-muted">
              We've booked {confirmed.pet.name ? `${confirmed.pet.name}'s` : "your pet's"} consultation request. Dr. Nituporna Sarkar will contact you
              on WhatsApp at {confirmed.contact_phone} to arrange the consultation.
            </p>
            <div className="mt-6 rounded-xl bg-bg p-5 text-left text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted">Pet</span>
                <span className="font-semibold text-ink">
                  {petLabel(confirmed.pet)} ({confirmed.pet.species})
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Status</span>
                <span className="font-semibold text-ink">Booked</span>
              </div>
            </div>
            {shareHref && (
              <a
                href={shareHref}
                target="_blank"
                rel="noreferrer"
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-sm font-semibold text-white hover:bg-[#1ebe5b]"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Send photos &amp; videos on WhatsApp
              </a>
            )}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" href="/my-bookings" className="flex-1">
                My bookings
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  setConfirmed(null);
                  setPet(initialPetForm);
                  setSymptoms("");
                  setHomeVisitRequired(null);
                  setHomeVisitAddress("");
                }}
              >
                Book another
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-12 lg:px-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <PawIcon className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-ink">Book a consultation</h1>
              <p className="text-sm text-muted">with Dr. Nituporna Sarkar</p>
            </div>
          </div>

          <form className="mt-8 flex flex-col gap-8" onSubmit={handleSubmit}>
            {error && <p className="rounded-lg bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600">{error}</p>}

            {/* Owner details */}
            <section className="rounded-2xl border border-border bg-white p-6">
              <h2 className="text-lg font-semibold text-ink">Owner details</h2>
              <p className="mt-1 text-sm text-muted">Dr. Sarkar will call this number on WhatsApp video.</p>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink">Owner name</span>
                  <input
                    className={inputClass}
                    placeholder="e.g. Priya Das"
                    autoComplete="name"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink">Contact number (WhatsApp)</span>
                  <input
                    type="tel"
                    className={inputClass}
                    placeholder="e.g. +91 98765 43210"
                    autoComplete="tel"
                    required
                    minLength={7}
                    maxLength={30}
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                  />
                </label>
              </div>
            </section>

            {/* Home visit */}
            <section className="rounded-2xl border border-border bg-white p-6">
              <h2 className="text-lg font-semibold text-ink">Home visit</h2>
              <p className="mt-1 text-sm text-muted">Choose Yes if you'd like Dr. Sarkar to visit your home.</p>

              <div className="mt-5 flex flex-col gap-5">
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-semibold text-ink">Does your pet need a home visit?</legend>
                  <div className="flex gap-3">
                    {[
                      { label: "No", value: false },
                      { label: "Yes", value: true },
                    ].map((option) => (
                      <label
                        key={option.label}
                        className={`flex h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border text-base font-medium sm:flex-none sm:px-8 ${
                          homeVisitRequired === option.value ? "border-ink bg-ink text-white" : "border-border bg-white text-ink hover:border-ink"
                        }`}
                      >
                        <input
                          type="radio"
                          name="home-visit"
                          className="sr-only"
                          checked={homeVisitRequired === option.value}
                          onChange={() => setHomeVisitRequired(option.value)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {homeVisitRequired && (
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-ink">Address for the home visit (optional)</span>
                    <textarea
                      rows={3}
                      className={textareaClass}
                      placeholder="House / flat, street, area, landmark, city, PIN code"
                      value={homeVisitAddress}
                      onChange={(e) => setHomeVisitAddress(e.target.value)}
                    />
                    {locationHref && (
                      <span className="text-sm text-muted">
                        Or{" "}
                        <a
                          href={locationHref}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[#128C7E] hover:underline"
                        >
                          share your location with Dr. Sarkar on WhatsApp
                        </a>
                        .
                      </span>
                    )}
                  </label>
                )}
              </div>
            </section>

            {/* Pet details */}
            <section className="rounded-2xl border border-border bg-white p-6">
              <h2 className="text-lg font-semibold text-ink">Pet details</h2>
              <p className="mt-1 text-sm text-muted">Tell us about the pet you'd like Dr. Sarkar to see.</p>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink">Pet name (optional)</span>
                  <input
                    className={inputClass}
                    placeholder="e.g. Bruno"
                    value={pet.name}
                    onChange={(e) => updatePetField("name", e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink">Species</span>
                  <input
                    className={inputClass}
                    placeholder="e.g. Dog, Cat"
                    list="species-suggestions"
                    required
                    value={pet.species}
                    onChange={(e) => updatePetField("species", e.target.value)}
                  />
                  <datalist id="species-suggestions">
                    {SPECIES_SUGGESTIONS.map((species) => (
                      <option key={species} value={species} />
                    ))}
                  </datalist>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink">Breed</span>
                  <input
                    className={inputClass}
                    placeholder="e.g. Labrador, or Mixed / Not sure"
                    required
                    value={pet.breed}
                    onChange={(e) => updatePetField("breed", e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink">Sex</span>
                  <select
                    className="h-12 w-full rounded-lg border border-border bg-white px-4 text-base text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                    required
                    value={pet.gender}
                    onChange={(e) => updatePetField("gender", e.target.value as api.PetGender | "")}
                  >
                    <option value="" disabled>
                      Select sex
                    </option>
                    {(["MALE", "FEMALE", "UNKNOWN"] as const).map((gender) => (
                      <option key={gender} value={gender}>
                        {SEX_LABELS[gender]}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-semibold text-ink">Age</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="relative">
                      <span className="sr-only">Years</span>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="1"
                        className={`${inputClass} pr-14`}
                        placeholder="0"
                        required
                        value={pet.ageYears}
                        onChange={(e) => updatePetField("ageYears", e.target.value)}
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">
                        years
                      </span>
                    </label>
                    <label>
                      <span className="sr-only">Months</span>
                      <select
                        className="h-12 w-full rounded-lg border border-border bg-white px-4 text-base text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                        value={pet.ageMonths}
                        onChange={(e) => updatePetField("ageMonths", e.target.value)}
                      >
                        {Array.from({ length: 12 }, (_, m) => (
                          <option key={m} value={String(m)}>
                            {m} {m === 1 ? "month" : "months"}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </fieldset>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink">Weight in kg (optional)</span>
                  <input
                    type="number"
                    min="0.1"
                    max="9999"
                    step="0.1"
                    className={inputClass}
                    placeholder="e.g. 12.5"
                    value={pet.weightKg}
                    onChange={(e) => updatePetField("weightKg", e.target.value)}
                  />
                </label>
              </div>
            </section>

            {/* Health */}
            <section className="rounded-2xl border border-border bg-white p-6">
              <h2 className="text-lg font-semibold text-ink">Health information</h2>
              <p className="mt-1 text-sm text-muted">The more Dr. Sarkar knows beforehand, the more useful the call.</p>
              {whatsAppHref && (
                <p className="mt-1 text-sm text-muted">
                  Photos or videos of the problem?{" "}
                  <a
                    href={whatsAppHref}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[#128C7E] hover:underline"
                  >
                    Send them to Dr. Sarkar on WhatsApp
                  </a>
                  .
                </p>
              )}

              <div className="mt-5 flex flex-col gap-5">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink">Main problem</span>
                  <textarea
                    rows={3}
                    className={textareaClass}
                    placeholder="What's wrong, since when, and any changes in eating, drinking, or behaviour…"
                    required
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink">Medical history (optional)</span>
                  <textarea
                    rows={3}
                    className={textareaClass}
                    placeholder="Past illnesses, surgeries, vaccinations, deworming, neutering…"
                    value={pet.medicalHistory}
                    onChange={(e) => updatePetField("medicalHistory", e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink">Current medications (optional)</span>
                  <textarea
                    rows={2}
                    className={textareaClass}
                    value={pet.currentMedications}
                    onChange={(e) => updatePetField("currentMedications", e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-ink">Allergies (optional)</span>
                  <textarea
                    rows={2}
                    className={textareaClass}
                    value={pet.allergies}
                    onChange={(e) => updatePetField("allergies", e.target.value)}
                  />
                </label>
              </div>
            </section>

            <p className="text-center text-xs text-muted">
              By continuing you agree to our{" "}
              <Link to="/privacy" className="underline">
                Privacy Policy &amp; Terms
              </Link>
              .
            </p>

            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit consultation request"}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

