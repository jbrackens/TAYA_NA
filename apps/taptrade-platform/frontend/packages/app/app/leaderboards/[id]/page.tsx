"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Legacy deep-link compatibility. The Predict leaderboards UX is a single-page
// sidebar + detail view — boards are addressed via ?board=<id>. Old routes
// like /leaderboards/accuracy (or, rarely, shared from pre-Predict sportsbook)
// redirect to the new shape.
export default function LeaderboardDetailRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const raw = params?.id;
    const id = Array.isArray(raw) ? raw[0] : raw;
    if (id) {
      router.replace(`/leaderboards?board=${encodeURIComponent(id)}`);
    } else {
      router.replace("/leaderboards");
    }
  }, [params, router]);

  return null;
}
