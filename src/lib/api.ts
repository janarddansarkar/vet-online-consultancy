export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type PetGender = "MALE" | "FEMALE" | "UNKNOWN";

export interface Pet {
  id: string;
  name: string | null;
  species: string;
  breed: string | null;
  gender: PetGender;
  date_of_birth: string | null;
  weight_kg: string | null;
  allergies: string | null;
  current_medications: string | null;
  medical_history: string | null;
}

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface Appointment {
  id: string;
  pet: Pet;
  symptoms: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  home_visit_required: boolean;
  home_visit_address: string | null;
  status: AppointmentStatus;
  created_at: string;
}

export interface AppointmentAdmin extends Appointment {
  owner_name: string;
  owner_email: string;
  owner_phone: string | null;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const TOKEN_KEY = "vet_consult_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.detail ?? "Something went wrong. Please try again.";
    throw new ApiError(typeof message === "string" ? message : "Something went wrong. Please try again.", res.status);
  }

  return res.json() as Promise<T>;
}

export function registerMember(input: { full_name: string; email: string; phone: string; password: string }) {
  return request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) });
}

export function login(input: { email: string; password: string }) {
  return request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(input) });
}

export function googleAuth(credential: string) {
  return request<AuthResponse>("/auth/google", { method: "POST", body: JSON.stringify({ credential }) });
}

export function fetchMe(token: string) {
  return request<User>("/auth/me", { headers: authHeaders(token) });
}

export interface PetInput {
  name?: string;
  species: string;
  breed?: string;
  gender?: PetGender;
  date_of_birth?: string;
  weight_kg?: string;
  allergies?: string;
  current_medications?: string;
  medical_history?: string;
}

export function createPet(token: string, input: PetInput) {
  return request<Pet>("/pets", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
}

export interface AppointmentInput {
  pet_id: string;
  symptoms: string;
  contact_name: string;
  contact_phone: string;
  home_visit_required: boolean;
  home_visit_address?: string;
}

export function createAppointment(token: string, input: AppointmentInput) {
  return request<Appointment>("/appointments", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
}

// The admin session is separate from owner accounts: it has its own token.
const ADMIN_TOKEN_KEY = "vet_consult_admin_token";

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function adminHeaders(): HeadersInit {
  const token = getAdminToken();
  return token ? authHeaders(token) : {};
}

export async function adminLogin(password: string) {
  const res = await request<{ access_token: string }>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  localStorage.setItem(ADMIN_TOKEN_KEY, res.access_token);
}

export function listAdminAppointments(status?: AppointmentStatus) {
  const qs = status ? `?status=${status}` : "";
  return request<AppointmentAdmin[]>(`/admin/appointments${qs}`, { headers: adminHeaders() });
}

// A plain link can't send the auth header, so fetch the file and save it from a blob.
export async function downloadAppointmentsExport() {
  const res = await fetch("/api/admin/appointments/export", { headers: adminHeaders() });
  if (!res.ok) throw new ApiError("Couldn't download the export.", res.status);
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "consultation-requests.xlsx";
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function updateAppointmentStatus(
  appointmentId: string,
  input: { status: AppointmentStatus }
) {
  return request<AppointmentAdmin>(`/admin/appointments/${appointmentId}/status`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(input),
  });
}
