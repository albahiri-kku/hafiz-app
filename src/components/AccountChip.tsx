/**
 * AccountChip — floating auth button shown on the LandingPage.
 *
 * FIX (2026-04-22): use a direct React callback prop instead of relying
 * on window.dispatchEvent(new PopStateEvent(...)). Dispatching PopStateEvent
 * manually is inconsistent across browsers (some require the `state` option,
 * some don't forward it to handlers correctly). The callback approach is
 * 100% reliable and avoids touching the global history twice.
 *
 * Usage in App.tsx:
 *   <AccountChip onNavigate={(path) => {
 *     window.history.pushState({}, '', path)
 *     setPhase(pathToPhase(path, ''))
 *   }} />
 *
 * When logged out: small "تسجيل الدخول" pill button → onNavigate('/login')
 * When logged in:  avatar + display name → onNavigate('/account')
 */

import { useAuth } from '../hooks/useAuth'

export interface AccountChipProps {
  onNavigate: (path: string) => void
}

export default function AccountChip({ onNavigate }: AccountChipProps) {
  const { account, loading } = useAuth()

  // Never render while rehydrating — avoids flash of wrong state
  if (loading) return null

  // Guest view: LandingPage has its own "تسجيل الدخول" button in its header.
  // We don't show a duplicate floating one; AccountChip only appears for
  // authenticated users as an account indicator + navigation shortcut.
  if (!account) return null

  const displayName = account.full_name_ar || `المستخدم #${account.user_id}`
  const initial = displayName.charAt(0)

  return (
    <button
      onClick={() => onNavigate('/account')}
      className="fixed top-3 z-50 flex items-center gap-2 text-sm bg-white/95 border border-stone-200 shadow-sm rounded-full pl-3 pr-1 py-1 text-stone-700 hover:text-emerald-800 hover:shadow transition font-ui"
      style={{ insetInlineEnd: 12 }}
    >
      <span className="max-w-[140px] truncate">{displayName}</span>
      <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold grid place-items-center text-xs">
        {initial}
      </span>
    </button>
  )
}
