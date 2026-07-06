"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "../../lib/api/auth-client";

const SHELL_CLASS = "flex min-h-screen items-center justify-center px-5 py-10";
const CARD_CLASS =
  "relative w-full max-w-[440px] rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] px-[34px] pb-[30px] pt-9 text-center text-[var(--t1)]";
const TITLE_CLASS =
  "m-0 mb-4 text-2xl font-bold tracking-[-0.01em] text-[var(--t1)]";
const MESSAGE_CLASS = "m-0 mb-6 text-sm leading-[1.6] text-[var(--t2)]";
const ERROR_CLASS = "m-0 mb-4 text-[13px] text-[var(--no-text)]";
const SPINNER_WRAP_CLASS = "mb-6 flex justify-center";
const SPINNER_CLASS =
  "inline-block size-7 animate-spin rounded-full border-2 border-[var(--border-2)] border-t-[var(--accent)]";
const SUBMIT_LINK_CLASS =
  "inline-flex cursor-pointer justify-center rounded-[var(--r-rh-md)] border-0 bg-[var(--accent)] px-4 py-3.5 text-sm font-bold tracking-[0.02em] text-[#04140a] no-underline transition-[transform,filter] duration-[180ms] ease-[ease] hover:-translate-y-px hover:brightness-[1.05] active:scale-[0.98] [font-family:inherit]";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMessage("No verification token provided");
      return;
    }

    const verify = async () => {
      try {
        await verifyEmail({ token });
        setState("success");
      } catch (err) {
        setState("error");
        const message =
          err instanceof Error ? err.message : "Verification failed";
        setErrorMessage(message);
      }
    };

    verify();
  }, [token]);

  return (
    <div className={SHELL_CLASS}>
      <div className={CARD_CLASS}>
        {state === "loading" && (
          <>
            <h1 className={TITLE_CLASS}>Verifying email…</h1>
            <div className={SPINNER_WRAP_CLASS}>
              <div className={SPINNER_CLASS} aria-hidden="true" />
            </div>
            <p className={MESSAGE_CLASS}>Hold tight — confirming the token.</p>
          </>
        )}

        {state === "success" && (
          <>
            <h1 className={TITLE_CLASS}>Email verified</h1>
            <p className={MESSAGE_CLASS}>
              You&apos;re all set. Log in to pick up where you left off.
            </p>
            <Link href="/auth/login" className={SUBMIT_LINK_CLASS}>
              Go to login
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className={TITLE_CLASS}>Verification failed</h1>
            <p className={ERROR_CLASS}>{errorMessage}</p>
            <p className={MESSAGE_CLASS}>
              The link may have expired. Request a fresh verification email from
              the login page.
            </p>
            <Link href="/auth/login" className={SUBMIT_LINK_CLASS}>
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
