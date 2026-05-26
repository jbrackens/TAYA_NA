package markettranslate

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOpenAICompatibleClientParsesJSONObjectTranslations(t *testing.T) {
	var captured struct {
		Model          string            `json:"model"`
		ResponseFormat map[string]string `json:"response_format"`
		Messages       []openAIMessage   `json:"messages"`
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/chat/completions" {
			t.Fatalf("path = %q, want /chat/completions", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer test-key" {
			t.Fatalf("authorization = %q", got)
		}
		if err := json.NewDecoder(r.Body).Decode(&captured); err != nil {
			t.Fatal(err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"choices": [{
				"message": {
					"role": "assistant",
					"content": "{\"translations\":{\"id\":{\"title\":\"Judul\",\"description\":\"Deskripsi\"}}}"
				}
			}],
			"usage": {"prompt_tokens": 12, "completion_tokens": 8}
		}`))
	}))
	defer server.Close()

	client := NewOpenAICompatibleClient(Config{
		Endpoint: server.URL,
		APIKey:   "test-key",
		Model:    "test-model",
		Provider: "openai-compatible",
	})
	translations, meta, err := client.Translate(context.Background(), TranslationRequest{
		Market: MarketCopy{
			Ticker:      "IMP-TEST",
			Title:       "Will Team win?",
			Description: "Resolves YES if Team wins.",
		},
		Locales: []LocaleSpec{{Code: "id", Name: "Indonesian"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if translations["id"].Title != "Judul" {
		t.Fatalf("title = %q", translations["id"].Title)
	}
	if meta.InputTokens == nil || *meta.InputTokens != 12 {
		t.Fatalf("input tokens = %#v", meta.InputTokens)
	}
	if captured.ResponseFormat["type"] != "json_object" {
		t.Fatalf("response_format = %#v", captured.ResponseFormat)
	}
	if len(captured.Messages) != 2 {
		t.Fatalf("messages = %d, want 2", len(captured.Messages))
	}
}

func TestParseTranslationsAcceptsFencedJSON(t *testing.T) {
	translations, err := parseTranslations("```json\n{\"translations\":{\"tl\":{\"title\":\"Pamagat\",\"description\":\"Paglalarawan\"}}}\n```")
	if err != nil {
		t.Fatal(err)
	}
	if translations["tl"].Description != "Paglalarawan" {
		t.Fatalf("description = %q", translations["tl"].Description)
	}
}
