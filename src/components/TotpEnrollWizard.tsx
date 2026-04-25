/**
 * TotpEnrollWizard — three-step TOTP enrollment.
 *
 *   1. Begin       — generate secret, render QR + manual base32 fallback
 *   2. Verify      — user enters the 6-digit code from their app
 *   3. Recovery    — show 10 single-use codes once, force acknowledgement
 *
 * Used in two contexts:
 *   * Forced enrollment (admin first-login): `forced=true` hides the back link
 *   * Voluntary re-enrollment from MyAccount > Security: `forced=false`
 *
 * QR is generated client-side via `qrcode` (npm) — backend never returns SVG.
 */

import { useCallback, useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { totpEnrollBegin, totpEnrollConfirm } from "../api/institutionalApi";
import { InstitutionalApiError } from "../types/institutional";

const HAFIZ_GOLD = "#C9A84C";
const HAFIZ_GREEN = "#1F5C42";

type Step = "begin" | "verify" | "recovery";

export interface TotpEnrollWizardProps {
  /** Called after the user acknowledges the recovery codes (final step). */
  onComplete: () => void;
  /** Called when the user bails out. In forced mode this should log out. */
  onCancel?: () => void;
  /** When true, hide the back/cancel link and show "إجباري" hint. */
  forced?: boolean;
}

export default function TotpEnrollWizard({
  onComplete,
  onCancel,
  forced = false,
}: TotpEnrollWizardProps) {
  const [step, setStep] = useState<Step>("begin");
  const [secretB32, setSecretB32] = useState("");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Step 1: kick off enrollment, render QR ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const r = await totpEnrollBegin();
        if (cancelled) return;
        setSecretB32(r.secret_b32);
        setOtpauthUri(r.otpauth_uri);
        const dataUrl = await QRCode.toDataURL(r.otpauth_uri, {
          margin: 1,
          width: 240,
          errorCorrectionLevel: "M",
        });
        if (cancelled) return;
        setQrDataUrl(dataUrl);
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof InstitutionalApiError
            ? e.message
            : "تعذّر بدء التسجيل.",
        );
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Step 2: verify ----
  const submitCode = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (busy) return;
      setError(null);
      setBusy(true);
      try {
        const r = await totpEnrollConfirm(code);
        setRecoveryCodes(r.recovery_codes);
        setStep("recovery");
      } catch (err) {
        setError(
          err instanceof InstitutionalApiError
            ? err.message
            : "رمز غير صحيح.",
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, code],
  );

  const copyAllCodes = useCallback(() => {
    const text = recoveryCodes.join("\n");
    navigator.clipboard?.writeText(text).catch(() => {});
  }, [recoveryCodes]);

  const downloadCodes = useCallback(() => {
    const blob = new Blob(
      [
        "حافِظ — رموز الاستعادة (احفظ هذا الملفّ في مكان آمن)\n\n",
        recoveryCodes.join("\n"),
        "\n",
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hafiz-recovery-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [recoveryCodes]);

  return (
    <div
      dir="rtl"
      lang="ar"
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 space-y-5">
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-bold" style={{ color: HAFIZ_GREEN }}>
            تفعيل التحقّق بخطوتَين
          </h1>
          <p className="text-sm text-slate-500">
            {forced
              ? "هذا الإجراء إلزاميّ لحسابات الإدارة قبل المتابعة."
              : "خطوة إضافيّة تحمي حسابك ولو سُرقت كلمة السرّ."}
          </p>
          <ProgressDots step={step} />
        </header>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {step === "begin" && (
          <BeginStep
            qrDataUrl={qrDataUrl}
            secretB32={secretB32}
            otpauthUri={otpauthUri}
            busy={busy}
            onContinue={() => setStep("verify")}
          />
        )}

        {step === "verify" && (
          <VerifyStep
            code={code}
            setCode={setCode}
            busy={busy}
            onSubmit={submitCode}
            onBack={() => setStep("begin")}
          />
        )}

        {step === "recovery" && (
          <RecoveryStep
            codes={recoveryCodes}
            acknowledged={acknowledged}
            setAcknowledged={setAcknowledged}
            onCopy={copyAllCodes}
            onDownload={downloadCodes}
            onComplete={onComplete}
          />
        )}

        {!forced && step !== "recovery" && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-xs text-slate-500 hover:text-slate-700 pt-1"
          >
            ← إلغاء والعودة
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ProgressDots({ step }: { step: Step }) {
  const steps: Step[] = ["begin", "verify", "recovery"];
  const idx = steps.indexOf(step);
  return (
    <div className="flex items-center justify-center gap-2 mt-2">
      {steps.map((s, i) => (
        <span
          key={s}
          className="h-1.5 rounded-full transition-all"
          style={{
            width: i === idx ? "24px" : "8px",
            backgroundColor: i <= idx ? HAFIZ_GOLD : "#e2e8f0",
          }}
        />
      ))}
    </div>
  );
}

function BeginStep({
  qrDataUrl,
  secretB32,
  otpauthUri,
  busy,
  onContinue,
}: {
  qrDataUrl: string;
  secretB32: string;
  otpauthUri: string;
  busy: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">
        ١. افتح تطبيق المصادقة (Google Authenticator أو Authy أو ما يكافئهما)
        وامسح الرمز التالي:
      </p>
      <div className="flex justify-center">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR لإعداد TOTP"
            width={240}
            height={240}
            className="border border-slate-200 rounded-lg"
          />
        ) : (
          <div className="w-[240px] h-[240px] border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-sm">
            {busy ? "جارٍ التحضير..." : "—"}
          </div>
        )}
      </div>
      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer hover:text-slate-800">
          لا يمكنك مسح الرمز؟ أدخل المفتاح يدويّاً
        </summary>
        <div className="mt-2 space-y-2">
          <div>
            <span className="text-slate-500">المفتاح:</span>
            <code className="block bg-slate-50 border border-slate-200 rounded px-2 py-1 mt-1 font-mono break-all" dir="ltr">
              {secretB32}
            </code>
          </div>
          <div>
            <span className="text-slate-500">الـ URI كاملاً:</span>
            <code className="block bg-slate-50 border border-slate-200 rounded px-2 py-1 mt-1 font-mono text-[10px] break-all" dir="ltr">
              {otpauthUri}
            </code>
          </div>
        </div>
      </details>
      <button
        type="button"
        onClick={onContinue}
        disabled={!qrDataUrl || busy}
        className="w-full disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition"
        style={{ backgroundColor: HAFIZ_GREEN }}
      >
        تابع
      </button>
    </div>
  );
}

function VerifyStep({
  code,
  setCode,
  busy,
  onSubmit,
  onBack,
}: {
  code: string;
  setCode: (v: string) => void;
  busy: boolean;
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-slate-700">
        ٢. أدخل الرمز المكوَّن من ٦ أرقام الذي يظهر في تطبيق المصادقة:
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
        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center text-2xl tracking-widest font-mono"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 rounded-lg transition"
        >
          ← السابق
        </button>
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="flex-1 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition"
          style={{ backgroundColor: HAFIZ_GREEN }}
        >
          {busy ? "جارٍ التحقّق..." : "تأكيد"}
        </button>
      </div>
    </form>
  );
}

function RecoveryStep({
  codes,
  acknowledged,
  setAcknowledged,
  onCopy,
  onDownload,
  onComplete,
}: {
  codes: string[];
  acknowledged: boolean;
  setAcknowledged: (v: boolean) => void;
  onCopy: () => void;
  onDownload: () => void;
  onComplete: () => void;
}) {
  return (
    <div className="space-y-4">
      <div
        className="border-2 rounded-lg p-3"
        style={{ borderColor: HAFIZ_GOLD, backgroundColor: "#FBF3DD" }}
      >
        <p className="text-sm font-semibold mb-1" style={{ color: "#5b4a16" }}>
          ٣. احفظ هذه الرموز الآن — لن تظهر مرّة أخرى
        </p>
        <p className="text-xs" style={{ color: "#7a6824" }}>
          استعمل أحدها مرّةً واحدة فقط لتسجيل الدخول إن فقدتَ جهازك.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {codes.map((c) => (
          <code
            key={c}
            className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 font-mono text-sm text-center"
            dir="ltr"
          >
            {c}
          </code>
        ))}
      </div>
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={onCopy}
          className="flex-1 border border-slate-300 hover:bg-slate-50 py-2 rounded-lg transition"
        >
          نسخ الكلّ
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="flex-1 border border-slate-300 hover:bg-slate-50 py-2 rounded-lg transition"
        >
          تنزيل ملفّ
        </button>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-1"
        />
        <span>حفظتُ الرموز في مكان آمن وأفهم أنّها لن تظهر مرّة أخرى.</span>
      </label>
      <button
        type="button"
        disabled={!acknowledged}
        onClick={onComplete}
        className="w-full disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition"
        style={{ backgroundColor: HAFIZ_GREEN }}
      >
        تمّ — متابعة
      </button>
    </div>
  );
}
