package webhooks

import "testing"

// TestValidatePublicURL covers the SSRF registration guard with literal IPs
// (no DNS, so deterministic in CI). SECURITY-REVIEW #6.
func TestValidatePublicURL(t *testing.T) {
	blocked := []string{
		"http://127.0.0.1/x",                       // loopback
		"http://169.254.169.254/latest/meta-data/", // cloud metadata (link-local)
		"http://10.0.0.1/x",                        // RFC1918
		"http://192.168.1.1/x",                     // RFC1918
		"http://172.16.0.1/x",                      // RFC1918
		"http://[::1]/x",                           // IPv6 loopback
		"http://0.0.0.0/x",                         // unspecified
		"ftp://example.com/x",                      // bad scheme
		"https://",                                 // no host
		"::not a url::",                            // unparseable
	}
	for _, u := range blocked {
		if err := ValidatePublicURL(u); err == nil {
			t.Errorf("expected %q to be rejected, got nil", u)
		}
	}
	// Literal public IPs are allowed without a DNS lookup.
	allowed := []string{
		"https://8.8.8.8/webhooks/abc",
		"http://93.184.216.34:8080/x",
	}
	for _, u := range allowed {
		if err := ValidatePublicURL(u); err != nil {
			t.Errorf("expected %q to be allowed, got %v", u, err)
		}
	}
}
