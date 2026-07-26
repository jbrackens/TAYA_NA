/**
 * Support mailto composer (QA fix ISSUE-004, 2026-07-26).
 *
 * The contact form previously POSTed to /api/v1/support/contact — an
 * endpoint the gateway does not expose — so every signed-out submission
 * died with a raw 401 and the message was lost. Until a real support
 * inbox endpoint ships (tracked in TODOS.md), the form composes the
 * message in the visitor's own mail client: no backend dependency, no
 * silently dropped messages.
 */

export const SUPPORT_EMAIL = "support@taptrade.com";

export interface SupportRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/** Build the prefilled support mailto URL. The reply-to context (name +
 * email) must survive in the body and every field must be URI-encoded. */
export function buildSupportMailto(data: SupportRequest): string {
  const subject = `[Support] ${data.subject}`;
  const body = `${data.message}\n\n— ${data.name} (${data.email})`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}
