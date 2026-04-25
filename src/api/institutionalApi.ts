/**
 * Institutional API client — /api/v1/institutional/*
 *
 * Features:
 *   - Token persistence in localStorage under key "hafiz:token"
 *   - Automatic Authorization header injection
 *   - Typed error surface (InstitutionalApiError with status + detail)
 *   - Account hydration from localStorage on page load
 *
 * Gated on the backend by HAFIZ_INSTITUTIONAL=1. When the flag is off,
 * /api/v1/institutional/* returns 404 — consumers must handle that.
 */

import type {
  Cohort,
  CohortStudentsOut,
  LoginRequest,
  LoginResponse,
  MeResponse,
  MemorizationPlan,
  PlanCreateRequest,
  PlanDueOut,
  PlanProgress,
  RegisterRequest,
  TotpDisableRequest,
  TotpEnrollBeginResponse,
  TotpEnrollConfirmResponse,
} from "../types/institutional";
import { InstitutionalApiError } from "../types/institutional";

const API_URL: string =
  (import.meta.env?.VITE_API_URL as string | undefined) ||
  "https://albahiri--hafiz-api-hafizapi-api.modal.run";

// localStorage keys — mirror across the app for consistency
export const TOKEN_KEY = "hafiz:token";
export const ACCOUNT_KEY = "hafiz:account";

// ---------------------------------------------------------------------------
// Token storage helpers
// ---------------------------------------------------------------------------

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredAccount(): LoginResponse | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LoginResponse;
  } catch {
    return null;
  }
}

export function setStoredAuth(data: LoginResponse): void {
  try {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable — silently ignore */
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Low-level JSON fetch with auth + typed errors
// ---------------------------------------------------------------------------

interface JsonFetchInit extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuth?: boolean;
}

async function jsonFetch<T>(path: string, init: JsonFetchInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!init.skipAuth) {
    const token = getStoredToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      body:
        init.body === undefined
          ? undefined
          : typeof init.body === "string"
          ? init.body
          : JSON.stringify(init.body),
    });
  } catch (networkErr) {
    throw new InstitutionalApiError(
      0,
      "تعذّر الاتصال بالخادم. تحقّق من الإنترنت.",
      networkErr,
    );
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const detail =
      (data && typeof data === "object" && "detail" in (data as object)
        ? (data as { detail: unknown }).detail
        : data) ?? res.statusText;

    const friendly = humanizeError(res.status, detail);
    throw new InstitutionalApiError(res.status, friendly, detail);
  }

  return data as T;
}

function humanizeError(status: number, detail: unknown): string {
  if (status === 401) {
    // Distinguish "needs second factor" from "creds wrong" — both are 401
    // but the frontend reacts very differently. The backend marks the
    // first case with detail === "totp_required".
    if (detail === "totp_required") return "أدخل رمز التحقّق الثاني.";
    return "بيانات الدخول غير صحيحة.";
  }
  if (status === 403) return "ليست لديك صلاحية لهذا الإجراء.";
  if (status === 404) return "المورد غير موجود.";
  if (status === 409) return "الحساب موجود بالفعل.";
  if (status === 422) {
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object") {
      const first = detail[0] as { msg?: string };
      return first.msg || "بيانات غير صالحة.";
    }
    return "بيانات غير صالحة.";
  }
  if (status === 429) return "محاولات كثيرة. حاول بعد ١٠ دقائق.";
  if (status === 503) return "الخدمة غير متاحة مؤقتاً.";
  if (status >= 500) return "حدث خطأ في الخادم. حاول لاحقاً.";
  return typeof detail === "string" ? detail : "حدث خطأ غير متوقع.";
}

/** True iff the error is a 401 whose body indicates `totp_required`.
 *  Useful for the LoginScreen to switch to the TOTP challenge UI. */
export function isTotpRequiredError(e: unknown): boolean {
  return (
    e instanceof InstitutionalApiError &&
    e.status === 401 &&
    e.detail === "totp_required"
  );
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const payload: LoginRequest = {
    email: body.email.trim().toLowerCase(),
    password: body.password,
  };
  if (body.institution_slug?.trim()) {
    payload.institution_slug = body.institution_slug.trim();
  }
  if (body.totp_code?.trim()) payload.totp_code = body.totp_code.trim();
  if (body.recovery_code?.trim()) payload.recovery_code = body.recovery_code.trim();
  const data = await jsonFetch<LoginResponse>(
    "/api/v1/institutional/auth/login",
    { method: "POST", body: payload, skipAuth: true },
  );
  setStoredAuth(data);
  return data;
}

export async function register(body: RegisterRequest): Promise<LoginResponse> {
  const payload: RegisterRequest = {
    email: body.email.trim().toLowerCase(),
    password: body.password,
    preferred_lang: body.preferred_lang ?? "ar",
  };
  if (body.full_name_ar?.trim()) payload.full_name_ar = body.full_name_ar.trim();
  if (body.birth_year) payload.birth_year = body.birth_year;
  const data = await jsonFetch<LoginResponse>(
    "/api/v1/institutional/auth/register",
    { method: "POST", body: payload, skipAuth: true },
  );
  setStoredAuth(data);
  return data;
}

export async function me(): Promise<MeResponse> {
  return jsonFetch<MeResponse>("/api/v1/institutional/auth/me");
}

export async function logout(): Promise<void> {
  try {
    await jsonFetch<void>("/api/v1/institutional/auth/logout", {
      method: "POST",
    });
  } catch {
    /* even if logout fails server-side, clear local */
  } finally {
    clearStoredAuth();
  }
}

// ---------------------------------------------------------------------------
// TOTP MFA
// ---------------------------------------------------------------------------

export async function totpEnrollBegin(): Promise<TotpEnrollBeginResponse> {
  return jsonFetch<TotpEnrollBeginResponse>(
    "/api/v1/institutional/auth/totp/enroll/begin",
    { method: "POST", body: {} },
  );
}

export async function totpEnrollConfirm(
  code: string,
): Promise<TotpEnrollConfirmResponse> {
  return jsonFetch<TotpEnrollConfirmResponse>(
    "/api/v1/institutional/auth/totp/enroll/confirm",
    { method: "POST", body: { code: code.trim() } },
  );
}

export async function totpDisable(body: TotpDisableRequest): Promise<void> {
  const payload: TotpDisableRequest = {};
  if (body.code?.trim()) payload.code = body.code.trim();
  if (body.recovery_code?.trim()) payload.recovery_code = body.recovery_code.trim();
  await jsonFetch<void>(
    "/api/v1/institutional/auth/totp/disable",
    { method: "POST", body: payload },
  );
}

// ---------------------------------------------------------------------------
// Cohorts — displayed in UI as "مجموعات"
// ---------------------------------------------------------------------------

export async function listCohorts(includeArchived = false): Promise<Cohort[]> {
  const q = includeArchived ? "?include_archived=true" : "";
  return jsonFetch<Cohort[]>(`/api/v1/institutional/cohorts${q}`);
}

export async function getCohort(cohortId: number): Promise<Cohort> {
  return jsonFetch<Cohort>(`/api/v1/institutional/cohorts/${cohortId}`);
}

export async function listCohortStudents(
  cohortId: number,
): Promise<CohortStudentsOut> {
  return jsonFetch<CohortStudentsOut>(
    `/api/v1/institutional/cohorts/${cohortId}/students`,
  );
}

/**
 * joinCohort — NOT YET SUPPORTED BY BACKEND.
 * The backend currently requires institution_admin or teacher role to
 * enroll students (POST /cohorts/{id}/enrollments). A "join by code"
 * flow for students needs a new endpoint on the backend. For now, UI
 * should hide this feature or show "coming soon".
 */
export async function joinCohort(_code: string): Promise<never> {
  throw new InstitutionalApiError(
    501,
    "ميزة الانضمام برمز قيد التطوير. اطلب من المعلم تسجيلك في المجموعة.",
  );
}

// ---------------------------------------------------------------------------
// Memorization Plans
// ---------------------------------------------------------------------------

export async function listMemorizationPlans(options?: {
  student_id?: number;
  cohort_id?: number;
  include_archived?: boolean;
}): Promise<MemorizationPlan[]> {
  const params = new URLSearchParams();
  if (options?.student_id) params.set("student_id", String(options.student_id));
  if (options?.cohort_id) params.set("cohort_id", String(options.cohort_id));
  if (options?.include_archived) params.set("include_archived", "true");
  const q = params.toString() ? `?${params.toString()}` : "";
  return jsonFetch<MemorizationPlan[]>(
    `/api/v1/institutional/memorization/plans${q}`,
  );
}

export async function getPlan(planId: number): Promise<MemorizationPlan> {
  return jsonFetch<MemorizationPlan>(
    `/api/v1/institutional/memorization/plans/${planId}`,
  );
}

export async function createPlan(
  body: PlanCreateRequest,
): Promise<MemorizationPlan> {
  return jsonFetch<MemorizationPlan>(
    "/api/v1/institutional/memorization/plans",
    { method: "POST", body },
  );
}

export async function initializePlan(planId: number): Promise<{
  plan_id: number;
  ayahs_seeded: number;
  total_in_plan: number;
}> {
  return jsonFetch(
    `/api/v1/institutional/memorization/plans/${planId}/initialize`,
    { method: "POST" },
  );
}

export async function getPlanProgress(planId: number): Promise<PlanProgress> {
  return jsonFetch<PlanProgress>(
    `/api/v1/institutional/memorization/plans/${planId}/progress`,
  );
}

export async function getPlanDue(
  planId: number,
  limit = 50,
): Promise<PlanDueOut> {
  return jsonFetch<PlanDueOut>(
    `/api/v1/institutional/memorization/plans/${planId}/due?limit=${limit}`,
  );
}

// ---------------------------------------------------------------------------
// Aggregates for dashboard "Overview"
// ---------------------------------------------------------------------------

/**
 * getRecentEvaluations — NOT YET SUPPORTED BY BACKEND.
 *
 * The write-through hook stores evaluations in evaluation_records, but no
 * GET endpoint exists yet. Until a teacher-dashboard endpoint is added,
 * UI should show an informative placeholder.
 *
 * Planned endpoint: GET /api/v1/institutional/evaluations?student_id=&limit=
 */
export async function getRecentEvaluations(_options?: {
  limit?: number;
  student_id?: number;
}): Promise<never> {
  throw new InstitutionalApiError(
    501,
    "سجل التقييمات التفصيلي قيد التطوير في الخادم.",
  );
}
