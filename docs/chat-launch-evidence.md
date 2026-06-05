# Embedded Chat Launch Evidence

Use this file as the launch gate record for v1 global chat. Fill in the
evidence links before enabling `NEXT_PUBLIC_FEATURE_CHAT=true` for public users.
Run `services/codex-prep/scripts/chat-launch-gate-check.sh` before launch; it
fails until sections 1-5 and rollback evidence are complete.

## 1. Production/Staging Header Validation

- [ ] `CHAT_PUBLIC_URL`:
- [ ] `CHAT_PARENT_ORIGIN`:
- [ ] `services/codex-prep/scripts/chat-origin-validate.sh` passes:
- [ ] Chrome iframe smoke test passes on staging:
- [ ] Same-site cookie/session behavior verified on staging:
- [ ] Edge policy removes or neutralizes legacy `X-Frame-Options` conflicts:
- [ ] Edge CSP includes a tight `frame-ancestors` allowlist for the Tiangge app:

## 2. Rocket.Chat Admin and License Review

- [ ] Rocket.Chat image tag:
- [ ] Rocket.Chat edition/license:
- [ ] REST user admin confirmed:
- [ ] REST login/session handoff confirmed:
- [ ] Iframe authentication confirmed:
- [ ] Room role sync confirmed:
- [ ] Paid-tier limitations reviewed:
- [ ] Decision owner/signoff:

Reference checks:

- Built-in `Moderator` room role supports message management, deletion, and
  user bans according to Rocket.Chat roles documentation.
- Required permissions include `delete-message`, `mute-user`, `ban-user`,
  `pin-message`, and `manage-moderation-actions` according to Rocket.Chat
  permissions documentation.

## 3. Moderation Setup

- [ ] `global` room provisioned:
- [ ] `announcements` room provisioned or explicitly deferred:
- [ ] File uploads disabled:
- [ ] Attachments/rich previews disabled or risk-accepted:
- [ ] Link preview behavior configured:
- [ ] User audio/video recording disabled or risk-accepted:
- [ ] Initial admins:
- [ ] Initial moderators:
- [ ] Moderator can delete a message:
- [ ] Moderator can mute a user:
- [ ] Moderator can ban a user:
- [ ] Moderator can view reports/moderation actions:
- [ ] Moderator action audit limitations documented:

## 4. Compliance and Retention

- [ ] Retention period:
- [ ] Rocket.Chat retention settings configured:
- [ ] Export workflow tested:
- [ ] Deletion workflow tested:
- [ ] `prediction.chat.reported` audit rows visible in Tiangge audit/admin tools:
- [ ] Report triage owner/team:
- [ ] Legal/compliance signoff:

Rocket.Chat retention policy defaults to never deleting messages unless a
retention policy is configured. The policy deletes from the
`rocketchat_messages` collection, so launch must explicitly decide retention.

## 5. Staging Rollout

- [ ] Gateway deployed with `CHAT_ENABLED=false`:
- [ ] Frontend deployed with `NEXT_PUBLIC_FEATURE_CHAT=false`:
- [ ] Rocket.Chat deployed and reachable on staging:
- [ ] Gateway configured with server-only Rocket.Chat admin credentials:
- [ ] Internal cohort enabled:
- [ ] Desktop open/collapse QA passed:
- [ ] Mobile external-open QA passed:
- [ ] Provider outage QA passed:
- [ ] Suspended/deactivated user denied and provider-side access deactivated:
- [ ] Chat report audit write tested:

## 6. Optional Post-v1 Backlog

- [ ] Market-specific room policy:
- [ ] Market room provisioning job:
- [ ] Category rooms:
- [ ] Embedded mobile chat:
- [ ] Automated moderation/spam tooling:
- [ ] Rich badges/creator/verified trader labels:

## Rollback Evidence

- [ ] `CHAT_ENABLED=false` disables backend session/report endpoints:
- [ ] `NEXT_PUBLIC_FEATURE_CHAT=false` hides the UI:
- [ ] Existing market/trading actions remain unaffected during provider outage:
- [ ] Rollback owner:
