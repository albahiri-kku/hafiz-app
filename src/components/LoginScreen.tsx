/**
 * LoginScreen — unified login + register screen.
 *
 * Supports three audience tiers (Charter rule #2):
 *   - Individual (personal account): email + password only, no tenant
 *   - Institutional: tenant slug + email + password
 *   - Halqah: tenant slug (same form as institutional)
 *
 * Tabs:
 *   - تسجيل الدخول (login)
 *   - إنشاء حساب فردي (register — only when VITE_ALLOW_REGISTRATION=1
 *     AND the backend flag HAFIZ_INSTITUTIONAL_ALLOW_REGISTRATION=1)
 *
 * Styling: Tailwind. Replace classes to match your design system.
 * Palette reference (matches hafiz-app design):
 *   primary:   #1F5C42 (emerald-800 equivalent)
 *   accent:    #C9A961 (gold)
 *   bg-dark:   #0F1A14
 *   text-body: #1F2937
 */

import { useCallback, useState } from "react";
import { useAuth } from "../hooks/useAuth";

const ALLOW_REGISTRATION =
  (import.meta.env?.VITE_ALLOW_REGISTRATION as string | undefined) === "1";

type TabMode = "login" | "register";

export interface LoginScreenProps {
  /** Called after successful auth. Redirect target is caller's responsibility. */
  onAuthenticated?: () => void;
  /** Optional: called when user clicks "back to home" link. */
  onBack?: () => void;
  /** Label shown at top. Defaults to "حافظ — المنصة المؤسسية". */
  title?: string;
}

export function LoginScreen({
  onAuthenticated,
  onBack,
  title = "حافظ — المنصة المؤسسية",
}: LoginScreenProps) {
  const { login, register, error, clearError } = useAuth();

  const [mode, setMode] = useState<TabMode>("login");
  const [institutionSlug, setInstitutionSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (busy) return;
      clearError();
      setBusy(true);
      try {
        if (mode === "login") {
          await login({
            institution_slug: institutionSlug.trim() || undefined,
            email,
            password,
          });
        } else {
          await register({
            email,
            password,
            full_name_ar: fullName.trim() || undefined,
          });
        }
        onAuthenticated?.();
      } catch {
        // error is surfaced via useAuth().error
      } finally {
        setBusy(false);
      }
    },
    [busy, mode, institutionSlug, email, password, fullName, login, register, clearError, onAuthenticated],
  );

  const switchMode = useCallback(
    (next: TabMode) => {
      clearError();
      setMode(next);
    },
    [clearError],
  );

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
          <h1 className="text-2xl font-bold text-emerald-800">{title}</h1>
          <p className="text-sm text-slate-500">
            {mode === "login"
              ? "سجّل دخولك للوصول إلى خطط الحفظ والتقييمات"
              : "أنشئ حساباً فردياً لبدء رحلة الحفظ"}
          </p>
        </header>

        {/* Tab switcher */}
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

        {mode === "login" && (
          <div>
            <label
              htmlFor="institution_slug"
              className="block text-sm text-slate-700 mb-1"
            >
              اسم المؤسسة
              <span className="text-slate-400 text-xs mx-2">
                (اتركه فارغاً لحساب فردي)
              </span>
            </label>
            <input
              id="institution_slug"
              type="text"
              autoComplete="organization"
              value={institutionSlug}
              onChange={(e) => setInstitutionSlug(e.target.value)}
              placeholder="مثال: hafiz-demo"
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
