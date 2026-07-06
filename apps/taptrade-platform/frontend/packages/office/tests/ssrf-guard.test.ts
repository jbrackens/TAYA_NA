import { describe, expect, it } from "vitest";
import {
  assertSafeRequestURL,
  isBlockedIP,
  SSRFError,
} from "../lib/ingest/ssrfGuard";

describe("ssrfGuard.isBlockedIP", () => {
  it("blocks IPv4 loopback/private/link-local/CGNAT/metadata/reserved", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.5",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254", // cloud metadata
      "100.64.0.1", // CGNAT
      "0.0.0.0",
      "224.0.0.1", // multicast
    ]) {
      expect(isBlockedIP(ip)).toBe(true);
    }
  });

  it("blocks IPv6 loopback/ULA/link-local/mapped-v4/AWS-IMDS", () => {
    for (const ip of [
      "::1",
      "::",
      "fc00::1",
      "fd12:3456::1",
      "fe80::1",
      "::ffff:127.0.0.1",
      "fd00:ec2::254",
    ]) {
      expect(isBlockedIP(ip)).toBe(true);
    }
  });

  it("allows public addresses", () => {
    for (const ip of [
      "8.8.8.8",
      "1.1.1.1",
      "93.184.216.34",
      "2606:4700:4700::1111",
    ]) {
      expect(isBlockedIP(ip)).toBe(false);
    }
  });
});

describe("ssrfGuard.assertSafeRequestURL", () => {
  it("allows https hostnames and public IP literals", () => {
    expect(() =>
      assertSafeRequestURL("https://www.philstar.com/article"),
    ).not.toThrow();
    expect(() => assertSafeRequestURL("http://93.184.216.34/")).not.toThrow();
  });

  it("rejects non-http(s) schemes", () => {
    for (const u of [
      "file:///etc/passwd",
      "gopher://x/1",
      "data:text/html,x",
      "ftp://example.com/y",
    ]) {
      expect(() => assertSafeRequestURL(u)).toThrow(SSRFError);
    }
  });

  it("rejects literal blocked IPs incl. cloud metadata and IPv6 loopback", () => {
    expect(() =>
      assertSafeRequestURL("http://169.254.169.254/latest/meta-data/"),
    ).toThrow(SSRFError);
    expect(() => assertSafeRequestURL("http://127.0.0.1:8080/")).toThrow(
      SSRFError,
    );
    expect(() => assertSafeRequestURL("http://[::1]/")).toThrow(SSRFError);
  });

  it("rejects URLs carrying credentials", () => {
    expect(() =>
      assertSafeRequestURL("https://user:pass@example.com/"),
    ).toThrow(SSRFError);
  });
});
