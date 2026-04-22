/**
 * ProtectedRoute — wraps an authenticated-only view.
 *
 * Usage:
 *   <Route path="/account" element={
 *     <ProtectedRoute redirectTo="/login">
 *       <MyAccount />
 *     </ProtectedRoute>
 *   } />
 *
 * Works with react-router; for non-router apps use the inline
 * `if (!account) return <LoginScreen />` pattern in App.tsx.
 */

import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

export interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  redirectTo = "/login",
  fallback,
}: ProtectedRouteProps) {
  const { account, loading } = useAuth();

  if (loading) {
    return (
      fallback ?? (
        <div
          dir="rtl"
          className="min-h-screen flex items-center justify-center text-slate-400"
        >
          جارٍ التحميل...
        </div>
      )
    );
  }

  if (!account) {
    // Works with react-router v6+ if imported; otherwise caller should
    // swap this for a different navigation mechanism.
    if (typeof window !== "undefined") {
      window.location.href = redirectTo;
    }
    return null;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
