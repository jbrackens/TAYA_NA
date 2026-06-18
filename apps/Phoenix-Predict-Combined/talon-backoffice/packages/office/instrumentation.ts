/**
 * Next.js instrumentation hook — runs once at server startup.
 *
 * Fails the boot hard if the auth-guard escape hatch is left enabled in
 * production. OFFICE_AUTH_GUARD_DISABLED=true bypasses the proxy session gate
 * (intended for local dev / backend-less environments only); shipping it to
 * prod would render the full admin shell to any unauthenticated visitor. The
 * proxy itself already ignores the flag in production, but refusing to boot
 * makes the misconfiguration loud instead of silently ineffective.
 */
export async function register(): Promise<void> {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.OFFICE_AUTH_GUARD_DISABLED === "true"
  ) {
    throw new Error(
      "OFFICE_AUTH_GUARD_DISABLED=true is not allowed in production: " +
        "it disables the back-office authentication guard. Unset it before " +
        "deploying.",
    );
  }
}
