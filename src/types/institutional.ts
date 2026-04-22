/**
 * Shared TypeScript types for the institutional layer API responses.
 * Aligned with src/hafiz/institutional/routes_*.py on the backend.
 */

export type AccountType = "personal" | "institutional" | "halqah";

export type RoleSlug =
  | "super_admin"
  | "institution_admin"
  | "teacher"
  | "student"
  | "parent"
  | "observer";

// ---------- Auth ----------

export interface LoginRequest {
  /** Optional — when omitted, login is by global email (personal account). */
  institution_slug?: string;
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name_ar?: string;
  preferred_lang?: "ar" | "en";
  birth_year?: number;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user_id: number;
  institution_id: number;
  roles: RoleSlug[];
  full_name_ar: string | null;
  account_type: AccountType;
}

export interface MeResponse {
  user_id: number;
  institution_id: number;
  roles: RoleSlug[];
  issued_at: number;
  expires_at: number;
}

// ---------- Cohorts ----------

export type CohortKind = "class" | "halqah" | "private";

export interface Cohort {
  id: number;
  institution_id: number;
  name_ar: string;
  kind: CohortKind;
  qiraah: string;
  teacher_id: number | null;
  term_code: string | null;
  status: "active" | "paused" | "archived";
}

export interface CohortStudent {
  id: number;
  email: string | null;
  full_name_ar: string | null;
}

export interface CohortStudentsOut {
  cohort_id: number;
  students: CohortStudent[];
}

// ---------- Memorization ----------

export type MemorizationState =
  | "new"
  | "learning"
  | "reviewing"
  | "mastered";

export interface MemorizationPlan {
  id: number;
  student_id: number;
  cohort_id: number | null;
  name_ar: string;
  scope_start_ayah: string;
  scope_end_ayah: string;
  daily_target_ayahs: number;
  review_policy: "spaced" | "fixed" | "none";
  start_date: string;
  target_date: string | null;
  status: "active" | "paused" | "archived";
}

export interface PlanCreateRequest {
  name_ar: string;
  scope_start_ayah: string;
  scope_end_ayah: string;
  daily_target_ayahs?: number;
  review_policy?: "spaced" | "fixed" | "none";
  target_date?: string;
  cohort_id?: number;
  student_id?: number;
}

export interface PlanProgress {
  plan_id: number;
  new: number;
  learning: number;
  reviewing: number;
  mastered: number;
  total: number;
}

export interface PlanStateRow {
  ayah_code: string;
  state: MemorizationState;
  attempts: number;
  last_accuracy: number | null;
  interval_days: number;
  ease_factor: number;
  next_review_at: string | null;
  mastered_at: string | null;
}

export interface PlanDueOut {
  plan_id: number;
  as_of: string;
  states: PlanStateRow[];
}

// ---------- API Error ----------

export class InstitutionalApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "InstitutionalApiError";
  }
}
