# Demo Setup (Legacy Thin-Demo Runbook)

This file is no longer the authoritative investor-demo runbook.

For the investor demo, use:

- [investor-demo-setup.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/investor-demo-setup.md)
- [INVESTOR_DEMO_READINESS_BOARD.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/INVESTOR_DEMO_READINESS_BOARD.md)

Reason:

- the investor-demo runtime no longer centers `phoenix-demo-web`
- the canonical runtime is now the real player frontend plus real Talon backoffice behind separate private origins
- bootstrap, warmup, smoke, and reset scripts have been updated for that runtime

`phoenix-demo-web` remains a legacy fallback path only.
