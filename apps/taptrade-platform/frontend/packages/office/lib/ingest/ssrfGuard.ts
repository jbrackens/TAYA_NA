// SSRF classification core for server-side article-URL fetching (plan §7.1).
//
// This module is the PURE, unit-testable part: scheme allowlist + blocked-IP
// ranges (v4/v6, including cloud metadata). The networked parts — resolving a
// hostname to an IP, pinning the connection to that exact IP to defeat DNS
// rebinding, and re-validating after every redirect — land with the fetch
// wiring (got + request-filtering-agent, or an egress proxy). That choice is an
// open decision (§13); until then, importing this guard does not perform any
// network I/O.

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

export class SSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SSRFError";
  }
}

export function isAllowedScheme(scheme: string): boolean {
  return ALLOWED_SCHEMES.has(scheme.toLowerCase());
}

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

export function isBlockedIPv4(ip: string): boolean {
  const m = ip.match(IPV4_RE);
  if (!m) return false;
  const octets = m.slice(1).map(Number);
  if (octets.some((o) => o > 255)) return false; // not a valid v4 literal
  const [a, b, c] = octets;
  if (a === 0) return true; // 0.0.0.0/8 "this host"
  if (a === 10) return true; // 10/8 private
  if (a === 127) return true; // 127/8 loopback
  if (a === 169 && b === 254) return true; // 169.254/16 link-local (incl. 169.254.169.254 metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12 private
  if (a === 192 && b === 168) return true; // 192.168/16 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0/24 IETF protocol
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2/24 TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18/15 benchmarking
  if (a >= 224) return true; // 224/4 multicast + 240/4 reserved + 255.255.255.255
  return false;
}

export function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // IPv4-mapped (::ffff:a.b.c.d) — classify the embedded v4.
  const mapped = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isBlockedIPv4(mapped[1]);
  if (lower === "::1" || lower === "::") return true; // loopback / unspecified
  if (/^fe[89ab]/.test(lower)) return true; // fe80::/10 link-local
  if (/^f[cd]/.test(lower)) return true; // fc00::/7 unique-local (ULA)
  if (lower.startsWith("ff")) return true; // ff00::/8 multicast
  if (lower === "fd00:ec2::254") return true; // AWS IMDS over IPv6
  return false;
}

export function isIPLiteral(host: string): boolean {
  return IPV4_RE.test(host) || host.includes(":");
}

export function isBlockedIP(ip: string): boolean {
  return ip.includes(":") ? isBlockedIPv6(ip) : isBlockedIPv4(ip);
}

// Validates the URL's scheme and, when the host is a literal IP, that the IP is
// not in a blocked range. Hostnames pass here (their resolved IP must be checked
// at connect time by the fetch layer — see module header). Strips userinfo so a
// URL like http://user:pass@host can't smuggle credentials onward.
export function assertSafeRequestURL(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SSRFError("invalid URL");
  }
  if (!isAllowedScheme(url.protocol))
    throw new SSRFError(`scheme not allowed: ${url.protocol}`);
  if (url.username || url.password)
    throw new SSRFError("URL must not contain credentials");
  const host = stripBrackets(url.hostname);
  if (isIPLiteral(host) && isBlockedIP(host))
    throw new SSRFError(`blocked IP address: ${host}`);
  return url;
}

function stripBrackets(host: string): string {
  // URL.hostname keeps IPv6 in [brackets]; strip them for classification.
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}
