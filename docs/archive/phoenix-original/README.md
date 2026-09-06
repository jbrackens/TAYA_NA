# Phoenix original planning documents (March 2026)

> **ARCHIVED 2026-09-06.** Historical record only — these do not describe the current system.
> They are the founding Phoenix Platform strategy documents, written before the
> prediction-market pivot and before the Taya Na Sportsbook fork of 2026-04-16.
> See `CLAUDE.md` for current architecture.

Three Word documents, kept because they are the origin record of the platform's
architecture decisions. Nothing in the repository references them.

| File | What it is |
|---|---|
| `Phoenix_Definitive_Architecture_Plan.docx` | "Document 6" — the definitive architecture and strategy plan. Go microservices, LLM-accelerated porting, bot-first prediction market. |
| `Phoenix_Codex_Instructions.docx` | "Document 7" — a build plan written for AI coding agents. |
| `Phoenix_Phase4_Gap_Mapping.docx` | Phase 4 gap analysis against the legacy stack. |

## Read these with care

`Phoenix_Codex_Instructions.docx` is addressed directly to an AI coding agent and
briefs it to build "a modern, Go-based microservices **sportsbook** and prediction
market platform," porting business logic out of the legacy Scala/Akka codebase.

Both premises are now wrong:

- The product is a **prediction market only**. Sportsbook concepts — fixtures,
  selections, betslips, odds, parlays — are banned, and `scripts/check-conventions.sh`
  fails CI if they reappear.
- The legacy Scala stack it tells you to port from (`phoenix-backend/`) was **deleted**
  on 2026-09-06, along with `phoenix-frontend-brand-viegg/` and `revival/`.

Treat these as a record of what was once intended, never as instructions to follow.
