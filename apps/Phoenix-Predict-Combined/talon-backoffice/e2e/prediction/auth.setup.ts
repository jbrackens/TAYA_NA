import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// Logs in the seeded demo player via the API and persists the session cookies
// as Playwright storageState, so authenticated UI specs start logged in
// (the player app has no standalone /login route — auth is a component).
const AUTH_FILE = path.join(__dirname, "..", ".auth", "predict-user.json");

setup("authenticate demo player", async ({ request }) => {
  const res = await request.post("/api/v1/auth/login", {
    data: { username: "demo@phoenix.local", password: "demo123" },
  });
  expect(
    res.ok(),
    `demo login should succeed (got ${res.status()})`,
  ).toBeTruthy();

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await request.storageState({ path: AUTH_FILE });

  const state = JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
  const hasSession = (state.cookies || []).some(
    (c: { name: string }) => c.name === "access_token",
  );
  expect(hasSession, "session cookie should be persisted").toBeTruthy();
});
