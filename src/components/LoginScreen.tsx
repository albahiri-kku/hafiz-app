/**
 * LoginScreen — unified login + register screen.
 *
 * Supports three audience tiers (Charter rule #2):
 *   - Individual (personal account): email + password only, no tenant
 *   - Institutional: tenant slug + email + password
 *   - Halqah: tenant slug (same form as institutional)
 *
 * UI:
 *   - Account-type selector (radio cards) above the form chooses how the
 *     login payload is shaped: individual → institution_slug undefined;
 *     institution / halaqa → reveals the slug input.
 *   - Tabs: تسجيل الدخول (login) | إنشاء حساب — the inline tab is gated
 *     by VITE_ALLOW_REGISTRATION; the three register entry-points at the
 *     bottom are always visible.
 *
 * Styling: Tailwind + inline brand colors.
 *   primary:   #1F5C42 (emerald-800 equivalent)
 *   accent:    #C9A84C (hafiz gold)
 *   bg-dark:   #0F1A14
 *   text-body: #1F2937
 */

import { useCallback, useState, type ComponentType, type SVGProps } from "react";
import { useAuth } from "../hooks/useAuth";
import { isTotpRequiredError } from "../api/institutionalApi";
import TotpChallenge from "./TotpChallenge";
import type { LoginResponse } from "../types/institutional";

const ALLOW_REGISTRATION =
  (import.meta.env?.VITE_ALLOW_REGISTRATION as string | undefined) === "1";

const HAFIZ_GOLD = "#C9A84C";
const HAFIZ_GOLD_SOFT = "#FBF3DD";
const HAFIZ_GREEN = "#1F5C42";

type TabMode = "login" | "register";
type AccountType = "individual" | "institution" | "halaqa";

function IndividualIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

function InstitutionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 11h.01M12 11h.01M15 11h.01" />
    </svg>
  );
}

function HalaqaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="9" r="3.2" />
      <circle cx="17" cy="10" r="2.6" />
      <path d="M3 19c0-3 2.7-5.4 6-5.4s6 2.4 6 5.4" />
      <path d="M14.5 18c.4-2.2 2.3-3.8 4.5-3.8 1 0 1.9.3 2.6.8" />
    </svg>
  );
}

const ACCOUNT_OPTIONS: ReadonlyArray<{
  id: AccountType;
  label: string;
  subtitle: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}> = [
  { id: "individual",  label: "فرد",            subtitle: "للحفظ والتلاوة الشخصية", Icon: IndividualIcon  },
  { id: "institution", label: "مؤسسة تعليمية",  subtitle: "للوصول المؤسسي وAPI",    Icon: InstitutionIcon },
  { id: "halaqa",      label: "حلقة تحفيظ",     subtitle: "للمشرفين والمعلمين",     Icon: HalaqaIcon      },
];

export interface LoginScreenProps {
  /** Called after a full-scope login. */
  onAuthenticated?: (response?: LoginResponse) => void;
  /** Called after a login that returns scope=enrollment_required. The
   *  parent should switch to the TOTP enrollment wizard. If not provided,
   *  enrollment-required logins fall through to onAuthenticated (which
   *  preserves backward compatibility for callers unaware of the flow). */
  onEnrollmentRequired?: (response: LoginResponse) => void;
  /** Optional: called when user clicks "back to home" link. */
  onBack?: () => void;
  /** Label shown at top. Defaults to "بوابة الدخول — حافِظ". */
  title?: string;
}

export function LoginScreen({
  onAuthenticated,
  onEnrollmentRequired,
  onBack,
  title = "بوابة الدخول — حافِظ",
}: LoginScreenProps) {
  const { login, register, error, clearError } = useAuth();

  const [mode, setMode] = useState<TabMode>("login");
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [institutionSlug, setInstitutionSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingTotp, setPendingTotp] = useState<{
    institution_slug?: string;
    email: string;
    password: string;
  } | null>(null);

  const handleAuthResult = useCallback(
    (result: LoginResponse) => {
      if (result.scope === "enrollment_required") {
        if (onEnrollmentRequired) {
          onEnrollmentRequired(result);
          return;
        }
        // Fallback for callers that don't know about the new flow.
      }
      onAuthenticated?.(result);
    },
    [onAuthenticated, onEnrollmentRequired],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (busy) return;
      clearError();
      setBusy(true);
      try {
        if (mode === "login") {
          // accountType controls how institution_slug is derived; the API
          // contract itself is unchanged.
          const slug =
            accountType === "individual"
              ? undefined
              : institutionSlug.trim() || undefined;
          const credentials = { institution_slug: slug, email, password };
          try {
            const result = await login(credentials);
            handleAuthResult(result);
          } catch (err) {
            if (isTotpRequiredError(err)) {
              setPendingTotp(credentials);
              return;
            }
            throw err;
          }
        } else {
          const result = await register({
            email,
            password,
            full_name_ar: fullName.trim() || undefined,
          });
          handleAuthResult(result);
        }
      } catch {
        // error is surfaced via useAuth().error
      } finally {
        setBusy(false);
      }
    },
    [busy, mode, accountType, institutionSlug, email, password, fullName, login, register, clearError, handleAuthResult],
  );

  const switchMode = useCallback(
    (next: TabMode) => {
      clearError();
      setMode(next);
    },
    [clearError],
  );

  const goRegister = useCallback(
    (type: AccountType) => {
      setAccountType(type);
      switchMode("register");
    },
    [switchMode],
  );

  const slugLabel = accountType === "halaqa" ? "اسم الحلقة" : "اسم المؤسسة";
  const slugPlaceholder = accountType === "halaqa" ? "مثال: halaqa-rabigh" : "مثال: hafiz-demo";

  // Second-factor step: takes over the screen entirely until resolved.
  if (pendingTotp) {
    return (
      <TotpChallenge
        baseCredentials={pendingTotp}
        loginWith={(factor) =>
          login({
            ...pendingTotp,
            ...factor,
          })
        }
        onAuthenticated={(result) => {
          setPendingTotp(null);
          handleAuthResult(result);
        }}
        onBack={() => setPendingTotp(null)}
      />
    );
  }

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-5"
        noValidate
      >
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-bold" style={{ color: HAFIZ_GREEN }}>{title}</h1>
          <p className="text-sm text-slate-500">
            {mode === "login"
              ? "اختر نوع الحساب وسجّل دخولك"
              : "أنشئ حساباً فردياً لبدء رحلة الحفظ"}
          </p>
        </header>

        {/* Account-type selector — login mode only */}
        {mode === "login" && (
          <div role="radiogroup" aria-label="نوع الحساب" className="grid grid-cols-3 gap-2">
            {ACCOUNT_OPTIONS.map(({ id, label, subtitle, Icon }) => {
              const selected = accountType === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setAccountType(id)}
                  className="text-center p-3 rounded-lg transition-colors flex flex-col items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={{
                    border: `2px solid ${selected ? HAFIZ_GOLD : "#e2e8f0"}`,
                    backgroundColor: selected ? HAFIZ_GOLD_SOFT : "#ffffff",
                  }}
                >
                  <Icon width={22} height={22} style={{ color: selected ? HAFIZ_GOLD : HAFIZ_GREEN }} />
                  <span
                    className="text-sm font-semibold leading-tight"
                    style={{ color: selected ? "#5b4a16" : "#334155" }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-[10px] leading-snug px-0.5"
                    style={{ color: selected ? "#7a6824" : "#64748b" }}
                  >
                    {subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Inline tab switcher — gated by feature flag (legacy entry-point) */}
        {ALLOW_REGISTRATION && (
          <div
            role="tablist"
            className="grid grid-cols-2 gap-1 bg-slate-100 rounded-lg p-1 text-sm"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => switchMode("login")}
              className={
                "py-2 rounded-md transition " +
                (mode === "login"
                  ? "bg-white shadow text-emerald-800 font-medium"
                  : "text-slate-600 hover:text-slate-800")
              }
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              onClick={() => switchMode("register")}
              className={
                "py-2 rounded-md transition " +
                (mode === "register"
                  ? "bg-white shadow text-emerald-800 font-medium"
                  : "text-slate-600 hover:text-slate-800")
              }
            >
              إنشاء حساب
            </button>
          </div>
        )}

        {mode === "login" && accountType !== "individual" && (
          <div>
            <label
              htmlFor="institution_slug"
              className="block text-sm text-slate-700 mb-1"
            >
              {slugLabel}
            </label>
            <input
              id="institution_slug"
              type="text"
              autoComplete="organization"
              value={institutionSlug}
              onChange={(e) => setInstitutionSlug(e.target.value)}
              placeholder={slugPlaceholder}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm text-slate-700 mb-1">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm text-slate-700 mb-1"
          >
            كلمة السر
            {mode === "register" && (
              <span className="text-slate-400 text-xs mx-2">
                (8 أحرف على الأقل)
              </span>
            )}
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={mode === "register" ? 8 : 1}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {mode === "register" && (
          <div>
            <label
              htmlFor="full_name_ar"
              className="block text-sm text-slate-700 mb-1"
            >
              الاسم الكامل
              <span className="text-slate-400 text-xs mx-2">(اختياري)</span>
            </label>
            <input
              id="full_name_ar"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition"
        >
          {busy
            ? "جارٍ..."
            : mode === "login"
            ? "دخول"
            : "إنشاء الحساب"}
        </button>

        <p className="text-center text-xs text-slate-500">
          بالمتابعة فإنك توافق على شروط الاستخدام وسياسة الخصوصية.
        </p>

        {/* Register entry-points — visible in login mode regardless of flag */}
        {mode === "login" && (
          <div className="pt-4 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-500 mb-2">ليس لديك حساب؟</p>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm">
              <button
                type="button"
                onClick={() => goRegister("individual")}
                className="font-medium hover:underline"
                style={{ color: HAFIZ_GREEN }}
              >
                تسجيل كفرد
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => goRegister("institution")}
                className="font-medium hover:underline"
                style={{ color: HAFIZ_GREEN }}
              >
                تسجيل جهة تعليمية
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => goRegister("halaqa")}
                className="font-medium hover:underline"
                style={{ color: HAFIZ_GREEN }}
              >
                تسجيل حلقة
              </button>
            </div>
          </div>
        )}

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-full text-xs text-slate-500 hover:text-slate-700 pt-1"
          >
            ← العودة للصفحة الرئيسية
          </button>
        )}
      </form>
    </div>
  );
}

export default LoginScreen;
