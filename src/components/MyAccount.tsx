/**
 * MyAccount — authenticated dashboard.
 *
 * Five tabs:
 *   1. نظرة عامة (Overview)   — summary of plans + last activity
 *   2. خطط الحفظ (Plans)      — list + create + inspect progress
 *   3. المجموعات (Groups)     — cohorts (user is member of OR manages)
 *   4. التقارير (Reports)     — placeholder (needs backend endpoint)
 *   5. الإعدادات (Settings)   — profile + logout
 *
 * Uses "مجموعات" instead of "أفواج" per project vocabulary guidelines.
 *
 * Role-aware UI:
 *   - student: sees own plans, read-only cohorts
 *   - teacher / institution_admin: sees all tenant plans, manage cohorts
 *   - personal account: sees own plans only, cohorts tab shows "unavailable"
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "../api/institutionalApi";
import { useAuth } from "../hooks/useAuth";
import { InstitutionalApiError } from "../types/institutional";
import type {
  Cohort,
  MemorizationPlan,
  PlanProgress,
} from "../types/institutional";
import MyAccountSecurity from "./MyAccountSecurity";
import TotpEnrollWizard from "./TotpEnrollWizard";

type TabId = "overview" | "plans" | "groups" | "reports" | "settings";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "نظرة عامة" },
  { id: "plans", label: "خطط الحفظ" },
  { id: "groups", label: "المجموعات" },
  { id: "reports", label: "التقارير" },
  { id: "settings", label: "الإعدادات" },
];

export interface MyAccountProps {
  /** Called when the user explicitly logs out. Caller should redirect. */
  onLogout?: () => void;
}

export function MyAccount({ onLogout }: MyAccountProps) {
  const { account, logout, isPersonal } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  if (!account) {
    return (
      <div dir="rtl" lang="ar" className="p-8 text-center text-slate-500">
        يتطلّب الوصول تسجيل الدخول.
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    onLogout?.();
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-slate-50">
      <Header account={account} onLogout={handleLogout} />

      <nav
        role="tablist"
        className="sticky top-14 z-10 bg-white border-b border-slate-200"
      >
        <div className="max-w-4xl mx-auto flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={
                "px-4 py-3 text-sm whitespace-nowrap border-b-2 transition " +
                (activeTab === t.id
                  ? "border-emerald-700 text-emerald-800 font-medium"
                  : "border-transparent text-slate-600 hover:text-slate-800")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 md:p-6">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "plans" && <PlansTab />}
        {activeTab === "groups" && <GroupsTab disabled={isPersonal} />}
        {activeTab === "reports" && <ReportsTab />}
        {activeTab === "settings" && <SettingsTab onLogout={handleLogout} />}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header({
  account,
  onLogout,
}: {
  account: NonNullable<ReturnType<typeof useAuth>["account"]>;
  onLogout: () => void;
}) {
  const displayName =
    account.full_name_ar || `المستخدم #${account.user_id}`;
  const accountTypeLabel =
    account.account_type === "personal"
      ? "حساب فردي"
      : account.account_type === "halqah"
      ? "حلقة"
      : "مؤسسة";

  return (
    <header className="bg-white border-b border-slate-200 h-14 flex items-center px-4 md:px-6 sticky top-0 z-20">
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold grid place-items-center text-sm">
            {displayName.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">
              {displayName}
            </div>
            <div className="text-xs text-slate-500">{accountTypeLabel}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="text-sm text-slate-600 hover:text-red-700 transition"
        >
          تسجيل الخروج
        </button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab() {
  const [plans, setPlans] = useState<MemorizationPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listMemorizationPlans()
      .then((p) => !cancelled && setPlans(p))
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof InstitutionalApiError ? e.message : "تعذّر التحميل",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (plans === null) return <Spinner />;

  const activePlans = plans.filter((p) => p.status === "active").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard label="خطط نشطة" value={String(activePlans)} />
        <StatCard label="إجمالي الخطط" value={String(plans.length)} />
        <StatCard label="تقييمات اليوم" value="—" hint="قيد التطوير" />
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3">
          آخر النشاطات
        </h2>
        <p className="text-sm text-slate-500">
          سيظهر هنا سجل آخر تقييماتك وتحديثات جدول الحفظ بمجرد تفعيل
          <code className="mx-1 bg-slate-100 px-1 rounded">AUTO_ATTEMPTS</code>
          على الخادم.
        </p>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plans tab
// ---------------------------------------------------------------------------

function PlansTab() {
  const [plans, setPlans] = useState<MemorizationPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPlans(null);
    api
      .listMemorizationPlans()
      .then((p) => !cancelled && setPlans(p))
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof InstitutionalApiError ? e.message : "تعذّر التحميل",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleCreated = useCallback(() => {
    setCreating(false);
    setRefreshKey((k) => k + 1);
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (plans === null) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">خطط الحفظ</h2>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="text-sm bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg"
          >
            + خطة جديدة
          </button>
        )}
      </div>

      {creating && <CreatePlanForm onCreated={handleCreated} onCancel={() => setCreating(false)} />}

      {plans.length === 0 && !creating && (
        <EmptyBox message="لا خطط حالياً. أنشئ خطتك الأولى." />
      )}

      <ul className="space-y-2">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} onChanged={() => setRefreshKey((k) => k + 1)} />
        ))}
      </ul>
    </div>
  );
}

function CreatePlanForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("001001");
  const [end, setEnd] = useState("001007");
  const [dailyTarget, setDailyTarget] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const plan = await api.createPlan({
        name_ar: name.trim(),
        scope_start_ayah: start,
        scope_end_ayah: end,
        daily_target_ayahs: dailyTarget,
      });
      // Seed state rows automatically
      await api.initializePlan(plan.id);
      onCreated();
    } catch (e: unknown) {
      setError(
        e instanceof InstitutionalApiError ? e.message : "تعذّر إنشاء الخطة",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3"
    >
      <div>
        <label className="block text-sm text-slate-700 mb-1">اسم الخطة</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: حفظ الفاتحة"
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-700 mb-1">
            من آية (6 أرقام)
          </label>
          <input
            type="text"
            required
            pattern="\d{6}"
            dir="ltr"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-700 mb-1">
            إلى آية (6 أرقام)
          </label>
          <input
            type="text"
            required
            pattern="\d{6}"
            dir="ltr"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-700 mb-1">
          الهدف اليومي (عدد الآيات)
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={dailyTarget}
          onChange={(e) => setDailyTarget(parseInt(e.target.value, 10) || 1)}
          className="w-32 border border-slate-300 rounded-lg px-3 py-2"
        />
      </div>

      {error && <ErrorBox message={error} />}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm"
        >
          {busy ? "جارٍ..." : "إنشاء الخطة"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-slate-600 hover:text-slate-900 px-3"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}

function PlanCard({
  plan,
  onChanged: _onChanged,
}: {
  plan: MemorizationPlan;
  onChanged: () => void;
}) {
  const [progress, setProgress] = useState<PlanProgress | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getPlanProgress(plan.id)
      .then((p) => !cancelled && setProgress(p))
      .catch(() => {
        /* silent */
      });
    return () => {
      cancelled = true;
    };
  }, [plan.id]);

  const masteredPct = useMemo(() => {
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.mastered / progress.total) * 100);
  }, [progress]);

  return (
    <li className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900 truncate">
            {plan.name_ar}
          </div>
          <div className="text-xs text-slate-500 mt-0.5" dir="ltr">
            {plan.scope_start_ayah} → {plan.scope_end_ayah}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            الحالة: {plan.status === "active" ? "نشطة" : plan.status === "paused" ? "متوقفة" : "مؤرشفة"}
          </div>
        </div>
        {progress && (
          <div className="text-center shrink-0">
            <div className="text-xl font-bold text-emerald-700">
              {masteredPct}%
            </div>
            <div className="text-xs text-slate-400">مُتقن</div>
          </div>
        )}
      </div>
      {progress && progress.total > 0 && (
        <div className="mt-3 flex gap-1 text-xs text-slate-500">
          <span className="flex-1">
            جديد: <b className="text-slate-800">{progress.new}</b>
          </span>
          <span className="flex-1">
            قيد التعلّم: <b className="text-slate-800">{progress.learning}</b>
          </span>
          <span className="flex-1">
            قيد المراجعة: <b className="text-slate-800">{progress.reviewing}</b>
          </span>
          <span className="flex-1">
            مُتقن: <b className="text-emerald-700">{progress.mastered}</b>
          </span>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Groups (Cohorts) tab
// ---------------------------------------------------------------------------

function GroupsTab({ disabled }: { disabled: boolean }) {
  const [cohorts, setCohorts] = useState<Cohort[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (disabled) {
      setCohorts([]);
      return;
    }
    let cancelled = false;
    api
      .listCohorts()
      .then((c) => !cancelled && setCohorts(c))
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof InstitutionalApiError ? e.message : "تعذّر التحميل",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [disabled]);

  if (disabled) {
    return (
      <EmptyBox message="ميزة المجموعات تتطلّب حساباً مؤسسياً أو حلقة. حسابك الفردي لا يستخدم المجموعات." />
    );
  }

  if (error) return <ErrorBox message={error} />;
  if (cohorts === null) return <Spinner />;
  if (cohorts.length === 0)
    return <EmptyBox message="لا مجموعات في مؤسستك بعد." />;

  return (
    <ul className="space-y-2">
      {cohorts.map((c) => (
        <li
          key={c.id}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
        >
          <div className="font-medium text-slate-900">{c.name_ar}</div>
          <div className="text-xs text-slate-500 mt-1">
            النوع: {c.kind === "class" ? "فصل" : c.kind === "halqah" ? "حلقة" : "خاص"}
            {" · "}القراءة: {c.qiraah}
            {" · "}الحالة: {c.status === "active" ? "نشطة" : c.status === "paused" ? "متوقفة" : "مؤرشفة"}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Reports tab — placeholder
// ---------------------------------------------------------------------------

function ReportsTab() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
      <div className="text-4xl mb-3">📊</div>
      <h3 className="font-semibold text-slate-900 mb-2">
        التقارير التفصيلية قيد التطوير
      </h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto">
        سيُتاح قريباً عرض تقييماتك الأخيرة، أكثر الآيات التي تتكرّر فيها
        الأخطاء، ومؤشرات التحسّن الأسبوعية. الخادم يحفظ البيانات الآن —
        نحتاج فقط endpoint للعرض.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------

function SettingsTab({ onLogout }: { onLogout: () => void }) {
  const { account, refresh } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (!account) return null;

  // Re-enrollment from settings — full-screen wizard takeover.
  if (enrolling) {
    return (
      <TotpEnrollWizard
        onComplete={async () => {
          setEnrolling(false);
          await refresh();
        }}
        onCancel={() => setEnrolling(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3">معلومات الحساب</h3>
        <dl className="text-sm space-y-2">
          <Row label="معرف المستخدم" value={String(account.user_id)} />
          <Row
            label="معرّف المؤسسة"
            value={String(account.institution_id)}
          />
          <Row
            label="نوع الحساب"
            value={
              account.account_type === "personal"
                ? "فردي"
                : account.account_type === "halqah"
                ? "حلقة"
                : "مؤسسي"
            }
          />
          <Row label="الأدوار" value={account.roles.join("، ")} />
        </dl>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-sm text-emerald-700 hover:text-emerald-900 disabled:opacity-60"
        >
          {refreshing ? "جارٍ..." : "تحديث معلومات الجلسة"}
        </button>
        <div>
          <button
            onClick={onLogout}
            className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            تسجيل الخروج
          </button>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-2">
          تغيير كلمة السر
        </h3>
        <p className="text-sm text-slate-500">
          هذه الميزة قيد التطوير. مؤقتاً، أنشئ حساباً جديداً عبر
          <code className="mx-1 bg-slate-100 px-1 rounded text-xs">
            inst_provision_personal
          </code>
          من مسؤول النظام.
        </p>
      </section>

      {/* Admin-only TOTP panel — renders null for non-admins. */}
      <MyAccountSecurity
        roles={account.roles}
        totpEnrolled={Boolean(account.totp_enrolled)}
        onStartEnroll={() => setEnrolling(true)}
        onDisabled={async () => {
          await refresh();
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900 font-medium" dir="ltr">
        {value}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable primitives
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
      جارٍ التحميل...
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2"
    >
      {message}
    </div>
  );
}

function EmptyBox({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-sm p-8 text-center">
      {message}
    </div>
  );
}

export default MyAccount;

