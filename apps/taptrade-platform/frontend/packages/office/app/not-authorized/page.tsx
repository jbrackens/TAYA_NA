export default function NotAuthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-0)] px-6 text-[var(--t1)]">
      <section className="w-full max-w-[460px] rounded-[8px] border border-[color:var(--border-1)] bg-[var(--surface-1)] p-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--no-text)]">
          403
        </p>
        <h1 className="mb-2 text-[24px] font-semibold tracking-[-0.01em]">
          Not authorized
        </h1>
        <p className="text-[14px] leading-6 text-[var(--t2)]">
          Your operator account does not have access to this backoffice area.
        </p>
      </section>
    </main>
  );
}
