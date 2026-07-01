# JVM Resolved Residual Triage

- Generated: `2026-06-30T17:01:55Z`
- Current resolved baseline: `revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_170146.md`
- Current resolved residual gate: `revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_171007.md`
- Current reviewed residual policy: `revival/jvm_resolved_residual_allowlist.json`
- Current status: Scenario 12 remains Partial; the residual drift gate now passes against an explicit policy, but the policy is technical review evidence and still requires launch-owner/security acceptance before Scenario 12 can pass.

## Summary

The resolved JVM classpath currently has 8 package/version coordinates with
OSV findings and 28 unique OSV ids. The direct residual gate still passes, and
the resolved residual advisory gate now verifies that those exact residuals
match `revival/jvm_resolved_residual_allowlist.json`. Candidate remediation
must preserve direct residual governance and avoid converting transitive
residuals into new unreviewed direct residuals.

## Residual Origin Notes

| Residual coordinate | Observed origin | Triage |
|---|---|---|
| `com.lightbend.akka.management:akka-management_2.13@1.1.3` | Direct Akka Management dependency. | Fixed-version candidates require broader Akka Management migration validation; previous fixed candidate did not resolve cleanly in this repository setup. |
| `com.typesafe.akka:akka-http-core_2.13@10.2.9` | Direct Akka HTTP dependency family. | `10.5.3` resolved as available but introduced a Scala XML eviction conflict with inherited Scalate/Spoiwo dependencies, so it was not kept. |
| `com.typesafe.akka:akka-stream-kafka_2.13@3.0.0` | Direct Akka Streams Kafka dependency. | `4.0.2` removed the advisory but introduced Akka `2.7.0` artifacts into the inherited Akka `2.6.19` runtime and caused ActorSystem startup failure; a safe fix requires an Akka-family migration, not a lone adapter bump. |
| `org.bouncycastle:bcpkix-jdk15on@1.68` | Keycloak transitive dependency. | Same-artifact `jdk15on` versions through `1.70` remain OSV-positive; newer `jdk18on` families require auth/runtime migration review. |
| `org.bouncycastle:bcprov-jdk15on@1.70` | SendGrid and Keycloak transitive dependencies. | Same-artifact `jdk15on` versions through `1.70` remain OSV-positive; replacement artifact families are not clean narrow fixes. |
| `org.keycloak:keycloak-adapter-core@17.0.1` | Direct Keycloak adapter dependency. | OSV still reports the advisory through adapter versions available on this artifact line; no matching `26.x` adapter artifact was found. |
| `org.keycloak:keycloak-core@17.0.1` | Direct Keycloak core/admin/authz dependencies. | Keycloak core becomes OSV-clean only on much newer major versions, but adapter-core does not have matching current artifacts; this is an auth/session migration, not a transitive override. |
| `org.yaml:snakeyaml@1.28` | `tapir-openapi-circe-yaml@0.20.2 -> circe-yaml@0.14.1`. | `circe-yaml@0.15.2` moves to SnakeYAML `2.2`, but Coursier tries to fetch missing `snakeyaml-2.2-android.jar`; the candidate was rejected because strict SBT resolution fails. |

## Next Remediation Shape

The remaining residuals require one of these larger decisions:

1. Plan a Keycloak adapter/core migration rather than overriding Keycloak transitive dependencies.
2. Plan an Akka HTTP/Akka Management upgrade with Scala XML, Scalate, Spoiwo, and runtime route compatibility evidence.
3. Obtain launch-owner/security acceptance for the reviewed residual policy, or continue remediating the remaining compatibility-constrained findings.

No residual in this report is accepted for launch solely by this report. The
resolved residual gate now prevents unreviewed residual drift, but launch
readiness still requires the policy entries to be accepted by the appropriate
launch owner/security review or remediated.

## Rejected Trial Notes

- Logback `1.3.16` plus SLF4J `2.0.17` was not kept. Evidence before rollback:
  `revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_132354.md`
  still reported 12 coordinates with findings, although unique OSV ids dropped
  to 36. The targeted validation test did not reach assertions because Scala
  2.13.8 failed during compilation with `bad constant pool index: 0` while
  reading Logback classic class metadata.
- After rolling back to Logback `1.2.13` and SLF4J `1.7.36`, Java 17/SBT
  tooling was restored and the gates returned to a compile-verified baseline
  before the later Scala and Logback remediations.

## Completed Remediation Notes

- Scala moved from `2.13.8` to `2.13.16` after upgrading `sbt-scalafix` from
  `0.9.34` to `0.14.3`, removing the obsolete `scalafix-rules` dependency, and
  applying narrow compiler-compatibility fixes for stricter warnings. The
  newer `0.14.3` line was chosen because `0.14.7` is listed in Maven metadata
  but its plugin POM was not available from the configured repositories, and
  `0.14.3` publishes `scalafix-testkit_2.13.16`.
- Verification after the Scala remediation: `make security-jvm-required`
  passed; backend compile passed at
  `revival/artifacts/backend_compile_20260630_135908.log`;
  `make security-jvm-osv-resolved-classpath` reported 11 resolved coordinates
  with findings and 38 OSV ids at
  `revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_135649.md`;
  direct residual governance passed at
  `revival/artifacts/jvm_direct_residual_advisory_gate_20260630_135741.md`;
  and the resolved residual gate still failed correctly at
  `revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_135749.md`.
- Logback moved from `1.2.13` to `1.5.37`, `logstash-logback-encoder` moved
  from `7.2` to `8.1`, and SLF4J moved from `1.7.36` to `2.0.17` after Scala
  `2.13.16` eliminated the previous compiler crash. Logback `1.5.18` compiled
  but still had 2 OSV findings, so it was superseded by `1.5.37`. Verification:
  `make security-jvm-required` passed, backend compile passed at
  `revival/artifacts/backend_compile_20260630_141620.log`,
  `make security-jvm-osv-resolved-classpath` reported 10 resolved coordinates
  with findings and 34 OSV ids at
  `revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_143322.md`,
  direct residual governance passed at
  `revival/artifacts/jvm_direct_residual_advisory_gate_20260630_143348.md`,
  and the resolved residual gate still failed correctly at
  `revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_143348.md`.
- Kafka clients moved from `3.3.2` to `4.3.1` through the security dependency
  overrides. The newer Kafka client line also replaces `org.lz4:lz4-java@1.8.0`
  with `at.yawk.lz4:lz4-java@1.10.2`, removing both the Kafka and LZ4 resolved
  residual coordinates. Verification: backend compile passed at
  `revival/artifacts/backend_compile_20260630_153800.log`,
  `make security-jvm-osv-resolved-classpath` reported 8 resolved coordinates
  with findings and 28 OSV ids at
  `revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_153740.md`,
  direct residual governance passed at
  `revival/artifacts/jvm_direct_residual_advisory_gate_20260630_153957.md`,
  and the resolved residual gate still failed correctly at
  `revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_154009.md`.

## Latest Rejected Trial Notes

- SnakeYAML `2.6` was not kept. Like the earlier `2.2` attempt, Coursier tried
  to fetch a missing `snakeyaml-2.6-android.jar` artifact, so strict SBT
  resolution failed before compile evidence could exist.
- A direct SnakeYAML `2.6` override with an explicit Maven Central jar URL was
  also not kept. Coursier still attempted to fetch the missing
  `snakeyaml-2.6-android.jar`, so the workaround did not restore strict SBT
  resolution.
- SnakeYAML `1.33` was not kept. It compiled and the focused OpenAPI YAML route
  regression passed at
  `revival/artifacts/snakeyaml_openapi_compat_20260630_170000.log`, reducing
  unique resolved OSV ids from 28 to 22, but it still carried
  `GHSA-mjmj-j48q-9wg2` and converted SnakeYAML into a direct residual. The
  direct residual gate failed at
  `revival/artifacts/jvm_direct_residual_advisory_gate_20260630_170032.md`, so
  the override was rolled back. The OpenAPI YAML regression was kept as safety
  evidence for future YAML dependency trials and passed after rollback at
  `revival/artifacts/openapi_yaml_regression_20260630_170100.log`.
- Akka HTTP `10.2.10` with Akka Management `1.1.4`, and later Akka HTTP
  `10.4.0` with Akka Management `1.4.1`, compiled but did not reduce the
  resolved OSV coordinate or advisory counts. Akka HTTP `10.5.3` was not kept
  because SBT failed on the existing Scala XML eviction conflict between
  `akka-http-xml` `2.1.0` and inherited Scalate/Spoiwo `1.3.0` dependencies.
- Alpakka FTP `4.0.0` plus SSHJ `0.40.0` was not kept. SSHJ `0.40.0` removed
  the EdDSA coordinate but added separate BouncyCastle `jdk18on` residual
  coordinates, increasing resolved coordinates with findings from 10 to 11.
- Akka Streams Kafka `4.0.2` was not kept. It removed
  `GHSA-55vq-xpjf-r2xc` from direct/resolved OSV output, but introduced Akka
  `2.7.0` `akka-actor`, `akka-stream`, and `akka-protobuf-v3` artifacts into
  a classpath whose inherited Akka family remains on `2.6.19`. The SFTP
  compatibility suite aborted at ActorSystem startup with Akka mixed-version
  checks until the adapter was rolled back to `3.0.0`.
- Keycloak `25.0.3` was not kept. It reduced direct advisory ids from 12 to 5
  in the direct OSV baseline at
  `revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_160841.md`,
  but the resolved classpath baseline at
  `revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_160600.md`
  increased coordinates with findings from 8 to 11 by adding Keycloak
  `server-spi-private` and BouncyCastle `jdk18on` residuals. Backend compile
  also failed because `ClientCredentialsProviderUtils`,
  `org.keycloak.adapters.authorization.PolicyEnforcer`, and the old
  `ResteasyClientBuilder` construction used by the inherited
  `CustomKeycloakDeploymentBuilder` no longer match the newer adapter/client
  API. This remains an auth/session migration, not a safe dependency bump.
- After rollback to Keycloak `17.0.1`, the retained final baseline was
  refreshed so latest-artifact gates no longer point at the rejected trial:
  backend compile passed at
  `revival/artifacts/backend_compile_20260630_161305.log`; resolved OSV
  baseline returned to 8 coordinates and 28 OSV ids at
  `revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_161305.md`;
  direct OSV baseline returned to 3 coordinates and 12 OSV ids at
  `revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_161915.md`;
  direct residual governance passed at
  `revival/artifacts/jvm_direct_residual_advisory_gate_20260630_162001.md`;
  and the resolved residual gate failed correctly on the remaining 8 at
  `revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_162009.md`.
- SSHJ now resolves to `0.40.0` through the security dependency overrides, with
  BouncyCastle `jdk18on` artifacts pinned at `1.84`. This removes the former
  `net.i2p.crypto:eddsa@0.2.0` residual from the Alpakka FTP path while
  preserving the inherited Alpakka FTP API. The production-relevant SFTP flows
  were verified by
  `revival/artifacts/sftp_dependency_compat_20260630_162558.log`: 3 suites and
  4 tests passed against a Testcontainers SFTP server. Testcontainers was
  updated from `1.16.3` to `1.21.4` and its deprecated host accessors were
  replaced with `getHost` so the integration harness works with current Docker
  Desktop. The retained final baseline is
  `revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_164958.md`
  with 239 resolved coordinates, 8 coordinates with findings, and 28 OSV ids.
  Backend compile passed at
  `revival/artifacts/backend_compile_20260630_165054.log`; direct evidence is
  `revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_165026.md`
  and `revival/artifacts/jvm_direct_residual_advisory_gate_20260630_165053.md`;
  the resolved residual gate still fails correctly at
  `revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_165054.md`.
- After the rejected SnakeYAML trials were rolled back, the retained baseline
  was refreshed again: backend compile passed at
  `revival/artifacts/backend_compile_20260630_170100.log`; direct OSV evidence
  returned to 136 parsed coordinates, 4 coordinates with findings, and 13 OSV
  ids at
  `revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_170135.md`;
  direct residual governance passed at
  `revival/artifacts/jvm_direct_residual_advisory_gate_20260630_170137.md`;
  resolved OSV evidence returned to 239 resolved coordinates, 8 coordinates
  with findings, and 28 OSV ids at
  `revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_170146.md`;
  and the resolved residual gate still failed correctly at
  `revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_170155.md`.
- A reviewed residual policy was then added at
  `revival/jvm_resolved_residual_allowlist.json` for the exact 8 retained
  resolved coordinates and 28 OSV ids. Each entry records the compatibility
  reason the narrow remediation was rejected and is marked as pending
  launch-owner sign-off. `make security-jvm-resolved-residual-advisories`
  passed at
  `revival/artifacts/jvm_resolved_residual_advisory_gate_20260630_171007.md`,
  proving there are no unreviewed resolved JVM residuals beyond the policy and
  that stale policy entries will fail after future remediation.
