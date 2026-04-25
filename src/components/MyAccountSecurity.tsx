/**
 * MyAccountSecurity — admin-only TOTP management view.
 *
 * Shown as an opt-in section inside MyAccount, but ONLY when the user
 * holds super_admin or institution_admin (Q3 of the plan: opt-in for
 * non-admins is deferred). For non-admins this component returns null.
 *
 * Provides:
 *   * Status indicator (enrolled vs. not)
 *   * "Re-enroll" button (when already active) — restarts the wizard
 *   * "Disable" button — prompts for current TOTP code, then clears
 *
 * The wizard itself is rendered by the parent when the user clicks
 * "Re-enroll" — this component just controls visibility.
 */

import { useCallback, useState, type FormEvent } from "react";
import { totpDisable } from "../api/institutionalApi";
import { InstitutionalApiError } from "../types/institutional";
import type { RoleSlug } from "../types/institutional";

const HAFIZ_GREEN = "#1F5C42";
const ADMIN_ROLES: RoleSlug[] = ["super_admin", "institution_admin"];

export interface MyAccountSecurityProps {
  /** Caller's roles — used to gate visibility. */
  roles: RoleSlug[];
  /** True iff the user has an active TOTP enrollment. The component does
   *  NOT fetch this itself; the parent passes it from `account` state. */
  totpEnrolled: boolean;
  /** Called when the user wants to (re-)enroll. Parent renders the wizard. */
  onStartEnroll: () => void;
  /** Called after a successful disable so the parent can refresh state. */
  onDisabled: () => void;
}

export default function MyAccountSecurity({
  roles,
  totpEnrolled,
  onStartEnroll,
  onDisabled,
}: MyAccountSecurityProps) {
  const isAdmin = roles.some((r) => ADMIN_ROLES.includes(r));
  if (!isAdmin) return null;

  return (
    <section
      dir="rtl"
      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4"
    >
      <header>
        <h2 className="text-lg font-semibold" style={{ color: HAFIZ_GREEN }}>
          الأمان — التحقّق بخطوتَين
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          إلزاميّ على حسابات الإدارة. عند تفعيل الإلزام على الخادم لا يمكن تعطيله بدون
          تنزيل دور الإدارة أوّلاً.
        </p>
      </header>

      {totpEnrolled ? (
        <EnrolledState onStartEnroll={onStartEnroll} onDisabled={onDisabled} />
      ) : (
        <UnenrolledState onStartEnroll={onStartEnroll} />
      )}
    </section>
  );
}

function UnenrolledState({ onStartEnroll }: { onStartEnroll: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-slate-700">غير مفعَّل</span>
      </div>
      <button
        type="button"
        onClick={onStartEnroll}
        className="text-white font-medium px-4 py-2 rounded-lg transition hover:opacity-90"
        style={{ backgroundColor: HAFIZ_GREEN }}
      >
        تفعيل الآن
      </button>
    </div>
  );
}

function EnrolledState({
  onStartEnroll,
  onDisabled,
}: {
  onStartEnroll: () => void;
  onDisabled: () => void;
}) {
  const [showDisable, setShowDisable] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitDisable = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (busy) return;
      setError(null);
      setBusy(true);
      try {
        await totpDisable({ code });
        onDisabled();
      } catch (err) {
        setError(
          err instanceof InstitutionalApiError ? err.message : "تعذّر التعطيل.",
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, code, onDisabled],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-slate-700">مفعَّل</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onStartEnroll}
          className="text-sm border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg"
        >
          إعادة الإعداد (جهاز جديد)
        </button>
        <button
          type="button"
          onClick={() => setShowDisable((v) => !v)}
          className="text-sm border border-red-300 text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg"
        >
          {showDisable ? "إخفاء" : "تعطيل"}
        </button>
      </div>

      {showDisable && (
        <form onSubmit={submitDisable} className="border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50">
          <p className="text-xs text-slate-600">
            أدخل الرمز الحاليّ من تطبيق المصادقة لتأكيد التعطيل.
          </p>
          <input
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
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 text-center text-lg tracking-widest font-mono"
          />
          {error && (
            <div role="alert" className="text-red-700 text-xs bg-red-50 border border-red-200 rounded px-2 py-1">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition"
          >
            {busy ? "جارٍ..." : "تعطيل"}
          </button>
        </form>
      )}
    </div>
  );
}
