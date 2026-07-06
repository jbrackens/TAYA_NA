"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token") || "";
    router.replace(`/auth/reset-password?token=${token}`);
  }, [router, searchParams]);

  return (
    <div className="p-10 text-center text-[14px] text-[#64748b]">
      Redirecting...
    </div>
  );
}
