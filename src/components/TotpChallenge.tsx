/**
 * TotpChallenge — second-factor prompt shown after the password step
 * succeeds but the backend returns 401 totp_required.
 *
 * Two input modes:
 *   * 6-digit TOTP from an Authenticator app (default)
 *   * Single-use recovery code (toggle via "لا يمكنني الوصول للجهاز")
 *
 * Submits by re-attempting login with the original credentials plus the
 * second factor. Any failure surfaces inline; success calls
 * `onAuthenticated()` so the parent can transition phase.
 */

import { useCallback, useState, type FormEvent } from "react";
import { InstitutionalApiError } from "../types/institutional";
import type { LoginResponse } from "../types/institutional";

const HAFIZ_GOLD = "#C9A84C";
const HAFIZ_GREEN = "#1F5C42";

export interface TotpChallengeProps {
  /** Original login credentials — re-sent with the second factor. */
  baseCredentials: { institution_slug?: string; email: string; password: string };
  /** Caller-supplied login function — usually `useAuth().login`. Must throw
   *  on failure (so we can surface the message inline) and return the
   *  `LoginResponse` on success. */
  loginWith: (factor: { totp_code?: string; recovery_code?: string }) => Promise<LoginResponse>;
  /** Called after a full-scope login lands. */
  onAuthenticated: (response: LoginResponse) => void;
  /** Optional: back link to the password step. */
  onBack?: () => void;
}

export default function TotpChallenge({
  baseCredentials,
  loginWith,
  onAuthenticated,
  onBack,
}: TotpChallengeProps) {
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (busy) return;
      setError(null);
      setBusy(true);
      try {
        const factor =
          mode === "totp"
            ? { totp_code: code }
            : { recovery_code: recoveryCode };
        const result = await loginWith(factor);
        onAuthenticated(result);
      } catch (err) {
        if (err instanceof InstitutionalApiError) {
          setError(err.message);
        } else {
          setError("حدث خطأ غير متوقع.");
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, mode, code, recoveryCode, loginWith, onAuthenticated],
  );

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-5"
        noValidate
      >
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-bold" style={{ color: HAFIZ_GREEN }}>
            رمز التحقّق الثاني
          </h1>
          <p className="text-sm text-slate-500">
            تابع تسجيل الدخول كـ <span dir="ltr">{baseCredentials.email}</span>
          </p>
        </header>

        {mode === "totp" ? (
          <div>
            <label htmlFor="totp_code" className="block text-sm text-slate-700 mb-1">
              الرمز من تطبيق المصادقة (٦ أرقام)
            </label>
            <input
              id="totp_code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={6}
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="• • • • • •"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
          </div>
        ) : (
          <div>
            <label htmlFor="recovery_code" className="block text-sm text-slate-700 mb-1">
              رمز الاستعادة (مثال: <span dir="ltr">abcd-1234</span>)
            </label>
            <input
              id="recovery_code"
              type="text"
              required
              dir="ltr"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="abcd-1234"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              autoFocus
            />
          </div>
        )}

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition"
          style={{ backgroundColor: HAFIZ_GREEN }}
        >
          {busy ? "جارٍ التحقّق..." : "تأكيد"}
        </button>

        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "totp" ? "recovery" : "totp"));
              setError(null);
            }}
            className="hover:underline"
            style={{ color: HAFIZ_GOLD }}
          >
            {mode === "totp" ? "لا يمكنني الوصول للجهاز" : "العودة لاستخدام تطبيق المصادقة"}
          </button>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-slate-500 hover:text-slate-700"
            >
              ← العودة لإدخال كلمة السرّ
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
