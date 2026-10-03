import { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { ChatIcon, PawIcon } from "../components/icons";
import * as api from "../lib/api";
import { ApiError } from "../lib/api";
import { buildWhatsAppLink } from "../lib/whatsapp";
import { SEX_LABELS, formatAge, petLabel } from "../lib/pet";

const STATUS_FILTERS: { label: string; value: api.AppointmentStatus | "ALL" }[] = [
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "All", value: "ALL" },
];

const STATUS_BADGE_CLASSES: Record<api.AppointmentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-primary-50 text-primary-700",
  CANCELLED: "bg-danger-50 text-danger-600",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminDashboard() {
  const [authed, setAuthed] = useState(() => api.getAdminToken() !== null);

  function endSession() {
    api.clearAdminToken();
    setAuthed(false);
  }

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />;
  return <AppointmentsView onSessionExpired={endSession} />;
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.adminLogin(password);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Header />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px] rounded-2xl border border-border bg-white p-10">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white">
              <PawIcon className="h-6 w-6" />
            </span>
            <h1 className="mt-5 text-2xl font-bold text-ink">Doctor login</h1>
            <p className="mt-2 text-sm text-muted">Enter the admin password to view consultation requests.</p>
          </div>
          <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit}>
            {error && <p className="rounded-lg bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600">{error}</p>}
            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting ? "Logging in…" : "Login"}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function AppointmentsView({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [filter, setFilter] = useState<api.AppointmentStatus | "ALL">("PENDING");
  const [appointments, setAppointments] = useState<api.AppointmentAdmin[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function loadAppointments() {
    setListLoading(true);
    setListError(null);
    api
      .listAdminAppointments(filter === "ALL" ? undefined : filter)
      .then(setAppointments)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) return onSessionExpired();
        setListError(err instanceof ApiError ? err.message : "Couldn't load appointments.");
      })
      .finally(() => setListLoading(false));
  }

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleStatusChange(appointmentId: string, status: api.AppointmentStatus) {
    setActionError(null);
    setPendingActionId(appointmentId);
    try {
      const updated = await api.updateAppointmentStatus(appointmentId, { status });
      setAppointments((prev) =>
        filter === "ALL" || filter === status
          ? prev.map((a) => (a.id === appointmentId ? updated : a))
          : prev.filter((a) => a.id !== appointmentId)
      );
      setCancellingId(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSessionExpired();
      setActionError(err instanceof ApiError ? err.message : "Couldn't update the appointment. Please try again.");
      loadAppointments();
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-12 lg:px-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <PawIcon className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-ink">Appointments</h1>
              <p className="text-sm text-muted">Consultations happen over WhatsApp video — update status here after each call.</p>
            </div>
            <div className="ml-auto flex shrink-0 gap-2">
              <button
                onClick={() =>
                  api.downloadAppointmentsExport().catch((err) => {
                    if (err instanceof ApiError && err.status === 401) return onSessionExpired();
                    setActionError("Couldn't download the Excel file. Please try again.");
                  })
                }
                className="inline-flex h-10 items-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-ink hover:border-ink"
              >
                Download Excel
              </button>
              <button
                onClick={onSessionExpired}
                className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-body hover:bg-gray-100"
              >
                Log out
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  filter === f.value ? "border-ink bg-ink text-white" : "border-border bg-white text-body hover:border-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {actionError && (
            <p className="mt-4 rounded-lg bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600">{actionError}</p>
          )}

          <div className="mt-6 flex flex-col gap-4">
            {listLoading && <p className="text-sm text-muted">Loading appointments…</p>}
            {listError && <p className="text-sm font-medium text-danger-600">{listError}</p>}
            {!listLoading && !listError && appointments.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-muted">
                No appointments in this view.
              </p>
            )}

            {appointments.map((appointment) => {
              const isPending = pendingActionId === appointment.id;
              const canConfirm = appointment.status === "PENDING";
              const canComplete = appointment.status === "PENDING" || appointment.status === "CONFIRMED";
              const canCancel = appointment.status === "PENDING" || appointment.status === "CONFIRMED";

              return (
                <div key={appointment.id} className="rounded-2xl border border-border bg-white p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-ink">
                          {petLabel(appointment.pet)} <span className="font-normal text-muted">({appointment.pet.species})</span>
                        </h2>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[appointment.status]}`}>
                          {appointment.status}
                        </span>
                        {appointment.home_visit_required && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            Home visit
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-body">
                        {appointment.owner_name} · {appointment.owner_phone ?? "no phone on file"}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        Requested {formatDateTime(appointment.created_at)}
                      </p>
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
                      <PetHealthDetail label="Medical history" value={appointment.pet.medical_history} />
                      <PetHealthDetail label="Medications" value={appointment.pet.current_medications} />
                      <PetHealthDetail label="Allergies" value={appointment.pet.allergies} />
                      {appointment.home_visit_required && (
                        <PetHealthDetail
                          label="Home visit address"
                          value={appointment.home_visit_address ?? "Not given; check WhatsApp for a shared location"}
                        />
                      )}
                    </div>

                    {appointment.owner_phone && (
                      <a
                        href={buildWhatsAppLink(appointment.owner_phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink hover:border-ink"
                      >
                        <ChatIcon className="h-4 w-4" />
                        WhatsApp
                      </a>
                    )}
                  </div>

                  {cancellingId === appointment.id ? (
                    <div className="mt-4 flex flex-col gap-3 rounded-xl bg-bg p-4 sm:flex-row sm:items-center">
                      <p className="flex-1 text-sm font-medium text-ink">Cancel this request? This can't be undone.</p>
                      <div className="flex gap-2">
                        <Button
                          variant="danger"
                          disabled={isPending}
                          onClick={() => handleStatusChange(appointment.id, "CANCELLED")}
                        >
                          {isPending ? "Cancelling…" : "Confirm cancel"}
                        </Button>
                        <Button variant="text" onClick={() => setCancellingId(null)}>
                          Back
                        </Button>
                      </div>
                    </div>
                  ) : (
                    (canConfirm || canComplete || canCancel) && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {canConfirm && (
                          <Button variant="secondary" disabled={isPending} onClick={() => handleStatusChange(appointment.id, "CONFIRMED")}>
                            Confirm
                          </Button>
                        )}
                        {canComplete && (
                          <Button variant="primary" disabled={isPending} onClick={() => handleStatusChange(appointment.id, "COMPLETED")}>
                            Mark completed
                          </Button>
                        )}
                        {canCancel && (
                          <Button variant="danger" disabled={isPending} onClick={() => setCancellingId(appointment.id)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function PetHealthDetail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <p className="mt-1 text-sm text-body">
      <span className="font-semibold text-ink">{label}:</span> {value}
    </p>
  );
}
