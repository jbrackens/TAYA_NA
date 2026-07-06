package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/content"
	"phoenix-revival/platform/transport/httpx"
)

func TestAdminContentPageCreateRejectsMoneyWordingBeforeService(t *testing.T) {
	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/content/pages",
		strings.NewReader(`{"slug":"unsafe-page","title":"Launch info","content":"Cash payout details","meta_title":"Launch info","meta_description":"Point play only","status":"draft"}`),
	)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-content", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()

	httpx.Handle(adminPagesHandler(nil)).ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected unsafe CMS content to return 400 before service call, got %d body=%s", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode unsafe CMS create error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "content" {
		t.Fatalf("expected content error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), "Cash payout") {
		t.Fatalf("unsafe CMS content should not be echoed: %s", res.Body.String())
	}
}

func TestAdminContentPageUpdateRejectsMoneyWordingBeforeService(t *testing.T) {
	req := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/admin/content/pages/42",
		strings.NewReader(`{"meta_description":"Crypto prize status page"}`),
	)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-content", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()

	httpx.Handle(adminPageDetailHandler(nil)).ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected unsafe CMS update copy to return 400 before service call, got %d body=%s", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode unsafe CMS update error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "meta_description" {
		t.Fatalf("expected meta_description error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), "Crypto prize") {
		t.Fatalf("unsafe CMS update copy should not be echoed: %s", res.Body.String())
	}
}

func TestAdminContentBannerCreateRejectsMoneyWordingBeforeService(t *testing.T) {
	req := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/banners",
		strings.NewReader(`{"title":"Cash prize boost","image_url":"/images/banner.png","link_url":"/rewards","position":"hero","sort_order":1,"active":true}`),
	)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-content", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()

	httpx.Handle(adminBannersHandler(nil)).ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected unsafe banner title to return 400 before service call, got %d body=%s", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode unsafe banner create error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "title" {
		t.Fatalf("expected title error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), "Cash prize") {
		t.Fatalf("unsafe banner title should not be echoed: %s", res.Body.String())
	}
}

func TestAdminContentBannerUpdateRejectsMoneyPathBeforeService(t *testing.T) {
	req := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/admin/banners/7",
		strings.NewReader(`{"link_url":"/cashier/deposit"}`),
	)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-content", "admin@taptrade.local", "admin"))
	res := httptest.NewRecorder()

	httpx.Handle(adminBannerDetailHandler(nil)).ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected unsafe banner link to return 400 before service call, got %d body=%s", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode unsafe banner update error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "link_url" {
		t.Fatalf("expected link_url error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), "/cashier/deposit") {
		t.Fatalf("unsafe banner link should not be echoed: %s", res.Body.String())
	}
}

func TestPublicContentPayloadRedactsLegacyUnsafeCopy(t *testing.T) {
	page := content.Page{
		Title:           "Cash payout guide",
		Content:         "Claim crypto prize status here",
		MetaTitle:       "Point play",
		MetaDescription: "USD payout details",
		Blocks: []content.Block{{
			Content: json.RawMessage(`{"headline":"cash payout block","items":["safe status","crypto prize link"],"count":2}`),
		}},
	}

	publicPage := publicContentPagePayload(page)

	if page.Title != "Cash payout guide" || !strings.Contains(string(page.Blocks[0].Content), "cash payout block") {
		t.Fatalf("public redaction should not mutate raw content page, got %+v", page)
	}
	for _, unsafe := range []string{"Cash payout", "crypto prize", "USD payout", "cash payout block"} {
		if strings.Contains(publicPage.Title, unsafe) ||
			strings.Contains(publicPage.Content, unsafe) ||
			strings.Contains(publicPage.MetaDescription, unsafe) ||
			strings.Contains(string(publicPage.Blocks[0].Content), unsafe) {
			t.Fatalf("public content payload leaked %q: %+v block=%s", unsafe, publicPage, string(publicPage.Blocks[0].Content))
		}
	}
	if publicPage.Title != launchRedactedUserText ||
		publicPage.Content != launchRedactedUserText ||
		publicPage.MetaDescription != launchRedactedUserText {
		t.Fatalf("expected unsafe page fields to be redacted, got %+v", publicPage)
	}
	if !strings.Contains(string(publicPage.Blocks[0].Content), launchRedactedUserText) ||
		!strings.Contains(string(publicPage.Blocks[0].Content), "safe status") {
		t.Fatalf("expected nested block text redaction with safe text preserved, got %s", string(publicPage.Blocks[0].Content))
	}
}

func TestAdminContentPagePayloadRedactsLegacyUnsafeCopy(t *testing.T) {
	page := content.Page{
		ID:              42,
		Title:           "Cash payout admin guide",
		Content:         "Crypto prize admin copy",
		MetaTitle:       "Point play",
		MetaDescription: "USD payout metadata",
		Blocks: []content.Block{{
			Content: json.RawMessage(`{"headline":"cash payout admin block","items":["safe review","crypto prize note"]}`),
		}},
	}

	adminPages := adminContentPagePayloads([]content.Page{page})

	if page.Title != "Cash payout admin guide" || !strings.Contains(string(page.Blocks[0].Content), "cash payout admin block") {
		t.Fatalf("admin redaction should not mutate raw content page, got %+v", page)
	}
	if len(adminPages) != 1 {
		t.Fatalf("expected one admin content page, got %+v", adminPages)
	}
	got := adminPages[0]
	for _, unsafe := range []string{"Cash payout", "Crypto prize", "USD payout", "cash payout admin block"} {
		if strings.Contains(got.Title, unsafe) ||
			strings.Contains(got.Content, unsafe) ||
			strings.Contains(got.MetaDescription, unsafe) ||
			strings.Contains(string(got.Blocks[0].Content), unsafe) {
			t.Fatalf("admin content payload leaked %q: %+v block=%s", unsafe, got, string(got.Blocks[0].Content))
		}
	}
	if got.Title != launchRedactedUserText ||
		got.Content != launchRedactedUserText ||
		got.MetaDescription != launchRedactedUserText ||
		!strings.Contains(string(got.Blocks[0].Content), launchRedactedUserText) ||
		!strings.Contains(string(got.Blocks[0].Content), "safe review") {
		t.Fatalf("expected unsafe admin page fields redacted with safe text preserved, got %+v block=%s", got, string(got.Blocks[0].Content))
	}
}

func TestPublicBannerPayloadRedactsLegacyUnsafeCopy(t *testing.T) {
	banners := []content.Banner{{
		Title:    "Cash prize banner",
		ImageURL: "/images/markets/safe.png",
		LinkURL:  "/cashier/deposit",
	}}

	publicBanners := publicContentBannerPayloads(banners)

	if banners[0].Title != "Cash prize banner" || banners[0].LinkURL != "/cashier/deposit" {
		t.Fatalf("public redaction should not mutate raw banner, got %+v", banners[0])
	}
	if len(publicBanners) != 1 ||
		publicBanners[0].Title != launchRedactedUserText ||
		publicBanners[0].LinkURL != launchRedactedUserText {
		t.Fatalf("expected unsafe public banner fields to be redacted, got %+v", publicBanners)
	}
	if strings.Contains(publicBanners[0].ImageURL, launchRedactedUserText) {
		t.Fatalf("image URL should be preserved, got %+v", publicBanners[0])
	}
}

func TestAdminBannerPayloadRedactsLegacyUnsafeCopy(t *testing.T) {
	banners := []content.Banner{{
		ID:       77,
		Title:    "Cash prize admin banner",
		ImageURL: "/images/markets/safe.png",
		LinkURL:  "/cashier/deposit",
		Active:   true,
	}}

	adminBanners := adminContentBannerPayloads(banners)

	if banners[0].Title != "Cash prize admin banner" || banners[0].LinkURL != "/cashier/deposit" {
		t.Fatalf("admin redaction should not mutate raw banner, got %+v", banners[0])
	}
	if len(adminBanners) != 1 ||
		adminBanners[0].Title != launchRedactedUserText ||
		adminBanners[0].LinkURL != launchRedactedUserText {
		t.Fatalf("expected unsafe admin banner fields to be redacted, got %+v", adminBanners)
	}
	if adminBanners[0].ImageURL != "/images/markets/safe.png" || !adminBanners[0].Active {
		t.Fatalf("admin banner redaction should preserve non-copy fields, got %+v", adminBanners[0])
	}
}
