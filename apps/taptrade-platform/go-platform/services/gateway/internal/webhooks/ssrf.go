package webhooks

import (
	"errors"
	"fmt"
	"net"
	stdhttp "net/http"
	"net/url"
	"syscall"
	"time"
)

// isDisallowedIP reports whether an IP is in a range a public webhook delivery
// must never reach: loopback, RFC1918/ULA private, link-local (incl. the
// 169.254.169.254 cloud-metadata address), unspecified, or multicast.
func isDisallowedIP(ip net.IP) bool {
	return ip == nil ||
		ip.IsLoopback() ||
		ip.IsPrivate() ||
		ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() ||
		ip.IsUnspecified() ||
		ip.IsMulticast()
}

// ValidatePublicURL rejects a webhook endpoint URL that is not an http(s) URL to
// a public host. It blocks literal private/loopback IPs outright and, when the
// host resolves, blocks a private/loopback resolution. This is the fail-fast
// registration-time check; the dial-time guard in SafeHTTPClient is the hard
// backstop against DNS-rebinding and redirect-to-internal (SECURITY-REVIEW #6).
func ValidatePublicURL(raw string) error {
	if raw == "" {
		return errors.New("url is required")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return errors.New("url is not a valid URL")
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return errors.New("url must be http or https")
	}
	host := u.Hostname()
	if host == "" {
		return errors.New("url must include a host")
	}
	if ip := net.ParseIP(host); ip != nil {
		if isDisallowedIP(ip) {
			return errors.New("url must not target a private, loopback, or link-local address")
		}
		return nil
	}
	ips, err := net.LookupIP(host)
	if err != nil {
		// Unresolvable at registration time may be transient DNS; allow it —
		// the dial-time guard still blocks a private resolution at delivery.
		return nil
	}
	for _, ip := range ips {
		if isDisallowedIP(ip) {
			return errors.New("url resolves to a private, loopback, or link-local address")
		}
	}
	return nil
}

// SafeHTTPClient returns an HTTP client whose dialer refuses, at connect time, to
// reach private/loopback/link-local addresses — defeating DNS-rebinding and
// redirect-to-internal — and which caps redirects. The webhook dispatcher uses
// it so a partner-controlled endpoint URL cannot reach internal services or
// cloud metadata (SECURITY-REVIEW #6).
func SafeHTTPClient(timeout time.Duration) *stdhttp.Client {
	dialer := &net.Dialer{
		Timeout:   10 * time.Second,
		KeepAlive: 30 * time.Second,
		// Control runs with the concrete resolved IP:port immediately before the
		// socket connects, so a hostname that resolves (or rebinds) to a private
		// IP is rejected here even though it passed the registration check.
		Control: func(_, address string, _ syscall.RawConn) error {
			host, _, err := net.SplitHostPort(address)
			if err != nil {
				return err
			}
			if isDisallowedIP(net.ParseIP(host)) {
				return fmt.Errorf("ssrf: refusing to connect to disallowed address %s", address)
			}
			return nil
		},
	}
	return &stdhttp.Client{
		Timeout: timeout,
		Transport: &stdhttp.Transport{
			DialContext:           dialer.DialContext,
			ForceAttemptHTTP2:     true,
			MaxIdleConns:          10,
			IdleConnTimeout:       30 * time.Second,
			TLSHandshakeTimeout:   10 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
		},
		CheckRedirect: func(req *stdhttp.Request, via []*stdhttp.Request) error {
			if len(via) >= 3 {
				return errors.New("ssrf: too many redirects")
			}
			if req.URL.Scheme != "http" && req.URL.Scheme != "https" {
				return errors.New("ssrf: disallowed redirect scheme")
			}
			// The Control dialer re-validates the resolved IP on the redirect dial.
			return nil
		},
	}
}
