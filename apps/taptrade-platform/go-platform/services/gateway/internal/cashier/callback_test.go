package cashier

import "testing"

func TestVerifyProviderCallbackSignatureUsesRawBody(t *testing.T) {
	rawBody := []byte(`{"providerRequestId":"relay_req_test_001","status":"source"}`)
	secret := "test-secret"
	signature := SignProviderCallbackBodyForTest(rawBody, secret)

	if !VerifyProviderCallbackSignature(rawBody, signature, secret) {
		t.Fatalf("expected raw body signature to verify")
	}

	reserialized := []byte("{\n  \"providerRequestId\": \"relay_req_test_001\",\n  \"status\": \"source\"\n}")
	if VerifyProviderCallbackSignature(reserialized, signature, secret) {
		t.Fatalf("reserialized body must not verify against raw-body signature")
	}
}

func TestVerifyProviderCallbackSignatureFailsClosed(t *testing.T) {
	rawBody := []byte(`{"providerRequestId":"relay_req_test_001"}`)
	secret := "test-secret"
	signature := SignProviderCallbackBodyForTest(rawBody, secret)

	cases := []struct {
		name      string
		rawBody   []byte
		signature string
		secret    string
	}{
		{name: "empty body", rawBody: nil, signature: signature, secret: secret},
		{name: "missing signature", rawBody: rawBody, signature: "", secret: secret},
		{name: "missing secret", rawBody: rawBody, signature: signature, secret: ""},
		{name: "bad hex", rawBody: rawBody, signature: "sha256=not-hex", secret: secret},
		{name: "wrong secret", rawBody: rawBody, signature: signature, secret: "wrong-secret"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if VerifyProviderCallbackSignature(tc.rawBody, tc.signature, tc.secret) {
				t.Fatalf("expected verification to fail closed")
			}
		})
	}
}

func TestProviderCallbackRawBodySHA256(t *testing.T) {
	got := ProviderCallbackRawBodySHA256([]byte("hello"))
	want := "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
	if got != want {
		t.Fatalf("ProviderCallbackRawBodySHA256 = %q, want %q", got, want)
	}
}
