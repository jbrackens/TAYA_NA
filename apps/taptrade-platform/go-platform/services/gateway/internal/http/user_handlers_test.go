package http

import "testing"

func TestUserProfilePayloadRedactsUnsafeDisplayUsernameWithoutMutatingProfile(t *testing.T) {
	profile := userProfileResponse{
		UserID:    "u-profile-copy",
		Username:  "cash-payout",
		Email:     "cash-payout@example.test",
		KYCStatus: "unverified",
		CreatedAt: "2026-06-30T19:00:00Z",
		UpdatedAt: "2026-06-30T19:00:00Z",
	}

	payload := userProfilePayload(profile)

	if payload.Username != launchRedactedUserText {
		t.Fatalf("expected unsafe display username redacted, got %+v", payload)
	}
	if payload.UserID != profile.UserID ||
		payload.Email != profile.Email ||
		payload.KYCStatus != profile.KYCStatus ||
		payload.CreatedAt != profile.CreatedAt ||
		payload.UpdatedAt != profile.UpdatedAt {
		t.Fatalf("profile payload should preserve stable fields, got %+v", payload)
	}
	if profile.Username != "cash-payout" {
		t.Fatalf("userProfilePayload must not mutate raw profile, got %+v", profile)
	}
}

func TestUserProfileUpdatePayloadRedactsNestedUnsafeStringsWithoutMutatingInput(t *testing.T) {
	body := map[string]interface{}{
		"displayName": "crypto payout profile",
		"bio":         "points-only player",
		"preferences": map[string]interface{}{
			"tagline": "cash prize fan",
			"visible": true,
		},
		"badges": []interface{}{"daily streak", "USD winner"},
	}

	payload := userProfileUpdatePayload(body)

	if payload["displayName"] != launchRedactedUserText {
		t.Fatalf("expected displayName redacted, got %+v", payload)
	}
	if payload["bio"] != "points-only player" {
		t.Fatalf("expected safe bio preserved, got %+v", payload)
	}
	preferences, ok := payload["preferences"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected copied preferences map, got %+v", payload["preferences"])
	}
	if preferences["tagline"] != launchRedactedUserText || preferences["visible"] != true {
		t.Fatalf("expected nested unsafe string redacted and non-string preserved, got %+v", preferences)
	}
	badges, ok := payload["badges"].([]interface{})
	if !ok {
		t.Fatalf("expected copied badges slice, got %+v", payload["badges"])
	}
	if badges[0] != "daily streak" || badges[1] != launchRedactedUserText {
		t.Fatalf("expected slice strings sanitized, got %+v", badges)
	}

	if body["displayName"] != "crypto payout profile" {
		t.Fatalf("userProfileUpdatePayload must not mutate top-level input, got %+v", body)
	}
	rawPreferences := body["preferences"].(map[string]interface{})
	if rawPreferences["tagline"] != "cash prize fan" {
		t.Fatalf("userProfileUpdatePayload must not mutate nested map, got %+v", rawPreferences)
	}
	rawBadges := body["badges"].([]interface{})
	if rawBadges[1] != "USD winner" {
		t.Fatalf("userProfileUpdatePayload must not mutate nested slice, got %+v", rawBadges)
	}
}
