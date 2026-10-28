import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Button } from "../components/Button";
import { PawIcon } from "../components/icons";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";
import { ApiError } from "../lib/api";
import { SEX_LABELS, formatAge, petLabel } from "../lib/pet";

const STATUS_LABELS: Record<api.AppointmentStatus, string> = { BOOKED: "Booked", COMPLETED: "Completed" };

const STATUS_BADGE_CLASSES: Record<api.AppointmentStatus, string> = {
  BOOKED: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-primary-50 text-primary-700",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export function MyBookings() {
  const { user, loading } = useAuth();
  const [appointments, setAppointments] = useState<api.Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = api.getToken();
    if (!user || !token) return;
    api
      .listMyAppointments(token)
      .then(setAppointments)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your bookings."));
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

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
              <h1 className="text-2xl font-bold text-ink">My bookings</h1>
              <p className="text-sm text-muted">Dr. Sarkar marks a booking as completed after your consultation.</p>
            </div>
            <Button variant="primary" href="/book" className="ml-auto">
              Book a consultation
            </Button>
          </div>

          {error && <p className="mt-6 rounded-lg bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600">{error}</p>}
          {!error && appointments === null && <p className="mt-8 text-sm text-muted">Loading…</p>}
          {appointments !== null && appointments.length === 0 && (
            <p className="mt-8 rounded-2xl border border-border bg-white p-8 text-center text-sm text-muted">
              You haven't booked a consultation yet.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-4">
            {appointments?.map((appointment) => (
              <div key={appointment.id} className="rounded-2xl border border-border bg-white p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-ink">
                    {petLabel(appointment.pet)} <span className="font-normal text-muted">({appointment.pet.species})</span>
                  </h2>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[appointment.status]}`}>
                    {STATUS_LABELS[appointment.status]}
                  </span>
                  {appointment.home_visit_required && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Home visit</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">Booked on {formatDate(appointment.created_at)}</p>
                <p className="mt-1 text-sm text-muted">
                  {[
                    appointment.pet.breed,
                    SEX_LABELS[appointment.pet.gender],
                    formatAge(appointment.pet.date_of_birth),
                    appointment.pet.weight_kg && `${Number(appointment.pet.weight_kg)} kg`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {appointment.symptoms && (
                  <p className="mt-2 text-sm text-body">
                    <span className="font-semibold text-ink">Main problem:</span> {appointment.symptoms}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
