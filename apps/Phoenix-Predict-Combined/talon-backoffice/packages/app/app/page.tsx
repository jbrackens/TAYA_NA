import { redirect } from "next/navigation";

// The old sportsbook home page (discovery, sport pills, match cards) was
// replaced by the prediction discovery at /predict on 2026-04-16. If we ever
// want a marketing landing page at /, swap the redirect for a real component.
export default function HomePage() {
  redirect("/predict");
}
