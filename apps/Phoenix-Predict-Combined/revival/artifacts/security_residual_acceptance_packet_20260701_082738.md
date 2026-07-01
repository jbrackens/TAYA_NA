# Security Residual Acceptance Packet

- Generated: `2026-07-01T08:27:38Z`
- Scope: `apps/Phoenix-Predict-Combined`
- Status: **pending launch-owner/security acceptance**
- Decision: this packet is review evidence only. It does not accept residual risk, waive remediation, or make Scenario 12 pass.

## Executive Summary

Current residual-security drift is mechanically bounded by executable gates:

- Frontend high/critical advisory governance passed with zero critical rows and only reviewed inherited Lerna high residuals.
- Direct JVM OSV governance passed with the observed direct findings matching the reviewed runtime residual set.
- Resolved-classpath JVM OSV governance passed with every observed resolved finding matching the reviewed residual policy exactly.

The residuals are therefore reviewable, but not automatically acceptable. Scenario 12 still requires launch-owner/security acceptance or remediation for the residuals that remain.

## Required Signoff

| Signoff Area | Required Decision | Current Status |
|---|---|---|
| Frontend inherited Lerna residuals | Accept temporary residual risk or approve dependency/tooling remediation plan. | Pending |
| Direct JVM runtime residuals | Accept temporary residual risk or approve dependency upgrade/remediation plan with compatibility validation. | Pending |
| Resolved JVM classpath residuals | Accept temporary residual risk or approve classpath remediation plan with resolver, compile, and runtime validation. | Pending |
| Production-contract preservation interaction | Confirm security remediation will not silently rewrite inherited auth/session, gateway, wallet, prediction, office, or shared-client contracts. | Pending |

## Current Evidence

| Gate | Artifact | Result | What It Proves | What It Does Not Prove |
|---|---|---|---|---|
| Frontend residual advisory gate | `revival/artifacts/frontend_residual_advisory_gate_20260701_082427.md` | Pass | No critical frontend advisory rows; high rows match reviewed inherited Lerna residuals only. | That the residuals are remediated or accepted for launch. |
| JVM direct residual advisory gate | `revival/artifacts/jvm_direct_residual_advisory_gate_20260701_082427.md` | Pass | Direct JVM OSV findings match the reviewed runtime residual set exactly. | That the direct JVM findings are remediated or accepted for launch. |
| JVM resolved residual advisory gate | `revival/artifacts/jvm_resolved_residual_advisory_gate_20260701_082427.md` | Pass | Resolved classpath JVM OSV findings match the reviewed residual policy exactly. | That the resolved classpath findings are remediated or accepted for launch. |
| Production preservation dossier | `revival/artifacts/production_preservation_dossier_20260701_082448.md` | Pass | Current broad diff, high-risk queue, and untracked evidence are classified. | That production contracts have human signoff. |
| RC completion audit | `revival/artifacts/rc_completion_audit_gate_20260701_082559.md` | Expected fail | Scenario 12 is still truthfully Partial. | That launch is ready. |

## Frontend Residuals

| Module | Advisory | Observed Scope | Required Version | Patched Range | Current Rationale |
|---|---|---|---|---|---|
| `ip` | `GHSA-2p57-rm9w-gvfp` | Talon workspace and Tiangge player app yarn audit logs; inherited Lerna tooling paths only. | `1.1.5` | `<0.0.0` | Inherited Lerna add/publish package-fetch proxy path; advisory feed reports no patched upstream range. |
| `lodash.set` | `GHSA-p6mc-m468-83gw` | Talon workspace and Tiangge player app yarn audit logs; inherited Lerna tooling paths only. | `4.3.2` | `<0.0.0` | Inherited Lerna version/publish GitHub client path; advisory feed reports no patched upstream range. |

Acceptance question: is temporary launch acceptance allowed while these rows remain confined to inherited Lerna tooling and no critical frontend rows are present?

## Direct JVM Residuals

| Package | Version | Advisory ids | Current Rationale |
|---|---:|---|---|
| `com.lightbend.akka.management:akka-management_2.13` | `1.1.3` | `GHSA-9qvj-rpj8-v5c8` | Runtime Akka Management line; fixed version requires Java/SBT compile and runtime validation before accepting. |
| `com.rabbitmq:amqp-client` | `5.8.0` | `GHSA-mm8h-8587-p46h` | Runtime RabbitMQ client pulled through inherited odds-feed support; fixed version needs Java/SBT compile and integration validation. |
| `com.typesafe.akka:akka-stream-kafka_2.13` | `3.0.0` | `GHSA-55vq-xpjf-r2xc` | Runtime Akka Stream Kafka line; fixed version should not be bumped without resolver-backed compatibility evidence. |
| `org.keycloak:keycloak-adapter-core` | `17.0.1` | `GHSA-7vw6-5q2f-7w5r` | Runtime Keycloak adapter; broad Keycloak movement requires auth compatibility validation. |
| `org.keycloak:keycloak-core` | `17.0.1` | `GHSA-5cc8-pgp5-7mpm`, `GHSA-755v-r4x4-qf7m`, `GHSA-93ww-43rr-79v3`, `GHSA-9vm7-v8wj-3fqw`, `GHSA-c7xw-p58w-h6fj`, `GHSA-g4gc-rh26-m3p5`, `GHSA-q4xq-445g-g6ch`, `GHSA-v436-q368-hvgg`, `GHSA-w97f-w3hq-36g2`, `GHSA-xmmm-jw76-q7vg` | Runtime Keycloak core; major Keycloak movement requires auth/session compatibility validation. |

Acceptance question: should these direct runtime residuals be accepted temporarily, or must the affected dependencies be remediated before RC?

## Resolved Classpath Residuals

| Package | Version | Advisory Count | Current Review Need |
|---|---:|---:|---|
| `com.lightbend.akka.management:akka-management_2.13` | `1.1.3` | 1 | Validate Akka Management remediation feasibility against runtime operations. |
| `com.typesafe.akka:akka-http-core_2.13` | `10.2.9` | 1 | Validate Akka HTTP upgrade path against inherited backend routes and middleware. |
| `com.typesafe.akka:akka-stream-kafka_2.13` | `3.0.0` | 1 | Validate Kafka stream upgrade path against inherited feed/runtime contracts. |
| `org.bouncycastle:bcpkix-jdk15on` | `1.68` | 2 | Validate crypto provider remediation against Keycloak/auth dependencies. |
| `org.bouncycastle:bcprov-jdk15on` | `1.70` | 5 | Validate crypto provider remediation against Keycloak/auth dependencies. |
| `org.keycloak:keycloak-adapter-core` | `17.0.1` | 1 | Validate Keycloak adapter remediation against login/session compatibility. |
| `org.keycloak:keycloak-core` | `17.0.1` | 10 | Validate Keycloak core remediation against auth/session compatibility. |
| `org.yaml:snakeyaml` | `1.28` | 7 | Validate parser remediation against inherited config and migration tooling. |

Acceptance question: can launch proceed with these resolved classpath residuals under the reviewed policy, or must any package be remediated before RC?

## Compatibility Constraints

Residual remediation cannot be treated as a standalone dependency bump. Any remediation must preserve or explicitly replace:

- Auth/session registration, disclosure, cookie, and token behavior.
- Gateway route/authz/audit behavior.
- Prediction lifecycle, settlement, and replay invariants.
- Wallet ledger idempotency and reservation/capture/release semantics.
- Office/admin account review, audit, risk, and market-operation flows.
- Shared API-client compatibility aliases and launch-facing point-native contracts.

## Approval Checklist

Before Scenario 12 can pass, a launch owner/security reviewer should record:

- The exact artifact set reviewed.
- Whether each residual class is accepted for launch or must be remediated.
- If accepted, the rationale, expiry/revisit condition, and owner.
- If remediation is required, the target dependency/tooling plan and validation gates.
- Confirmation that the production-contract review pack was considered alongside residual-security risk.

## Scenario 12 Status

Scenario 12 remains `Partial` after this packet. Passing residual gates plus this packet means the residuals are visible and bounded; it does not mean the residuals are approved.
