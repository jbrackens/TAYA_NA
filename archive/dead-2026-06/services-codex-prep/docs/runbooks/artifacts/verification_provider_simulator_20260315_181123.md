# Verification Provider Simulator

- Ran at: 2026-03-15T18:11:23Z
- Gateway: http://localhost:8080
- Scenario request: full_pack

## Scenario: idpv_manual_review

## Provider callback for demo-idcomply-case-001

- HTTP status: 200

```json
{"id":"93000000-0000-0000-0000-000000000011","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"idpv","provider":"idcomply","status":"pending_review","redirectUrl":"https://demo.idcomply.local/sessions/demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001","providerDecision":"manual_review","providerCaseId":"demo-idcomply-case-001","createdAt":"2026-03-15T17:56:25.869043Z","updatedAt":"2026-03-15T18:11:25.951147347Z"}
```

## Verification detail for demo-idcomply-case-001

- HTTP status: 200

```json
{"id":"93000000-0000-0000-0000-000000000011","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"idpv","provider":"idcomply","status":"pending_review","redirectUrl":"https://demo.idcomply.local/sessions/demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001","providerDecision":"manual_review","providerCaseId":"demo-idcomply-case-001","createdAt":"2026-03-15T17:56:25.869043Z","updatedAt":"2026-03-15T18:11:25.951147Z"}
```

## Verification events for demo-idcomply-case-001

- HTTP status: 200

```json
{"data":[{"id":"7ac31cf0-5506-480b-a4fc-1a78c45f42fc","verificationSessionId":"93000000-0000-0000-0000-000000000011","provider":"idcomply","status":"pending_review","source":"provider_callback","reason":"seeded manual review","payload":{"actorRole":"data-provider","lastErrorCode":"","providerCaseId":"demo-idcomply-case-001","providerDecision":"manual_review","providerReference":"demo-idcomply-idpv-001","redirectUrl":"https://demo.idcomply.local/sessions/demo-idcomply-case-001"},"createdAt":"2026-03-15T18:11:25.968189Z"},{"id":"9a2ceb39-73ae-4fed-9f3c-6222c423ac8b","verificationSessionId":"93000000-0000-0000-0000-000000000011","provider":"idcomply","status":"pending_review","source":"provider_callback","reason":"seeded_manual_review","payload":{"flowType":"idpv","providerCaseId":"demo-idcomply-case-001","providerDecision":"manual_review","providerReference":"demo-idcomply-idpv-001"},"createdAt":"2026-03-15T18:06:25.870455Z"},{"id":"15d5dd6c-c9b2-4a92-ada5-0051d748ea2f","verificationSessionId":"93000000-0000-0000-0000-000000000011","provider":"idcomply","status":"submitted_to_provider","source":"provider_start","reason":"seeded_idpv_started","payload":{"flowType":"idpv","providerCaseId":"demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001"},"createdAt":"2026-03-15T17:56:25.870455Z"}]}
```

## Review queue snapshot after demo-idcomply-case-001

- HTTP status: 200

```json
{"data":[{"id":"93000000-0000-0000-0000-000000000011","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"idpv","provider":"idcomply","status":"pending_review","redirectUrl":"https://demo.idcomply.local/sessions/demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001","providerDecision":"manual_review","providerCaseId":"demo-idcomply-case-001","createdAt":"2026-03-15T17:56:25.869043Z","updatedAt":"2026-03-15T18:11:25.951147Z"},{"id":"93000000-0000-0000-0000-000000000012","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"kba","provider":"idcomply","status":"questions_presented","questions":[{"questionId":"occupation","text":"What is your occupation?","choices":["Engineer","Teacher","Nurse"]},{"questionId":"residence","text":"How long have you lived at your address?","choices":["\u003c1 year","1-3 years","3+ years"]}],"providerReference":"demo-idcomply-kba-001","providerDecision":"questionnaire","providerCaseId":"demo-idcomply-case-002","createdAt":"2026-03-15T17:59:25.869043Z","updatedAt":"2026-03-15T18:08:25.869043Z"}]}
```

## Scenario: idpv_assign_and_note

## Assignment for demo-idcomply-case-001

- HTTP status: 200

```json
{"id":"93000000-0000-0000-0000-000000000011","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"idpv","provider":"idcomply","status":"pending_review","redirectUrl":"https://demo.idcomply.local/sessions/demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001","providerDecision":"manual_review","providerCaseId":"demo-idcomply-case-001","assignedTo":"1c47660f-5a72-478d-acb1-f27fb427cad7","assignedAt":"2026-03-15T18:11:26.960919Z","createdAt":"2026-03-15T17:56:26.875091Z","updatedAt":"2026-03-15T18:11:26.960919Z"}
```

## Note for demo-idcomply-case-001

- HTTP status: 200

```json
{"data":[{"id":"ec55c4d5-2d50-45c7-9326-ab9d4453c143","verificationSessionId":"93000000-0000-0000-0000-000000000011","provider":"idcomply","status":"pending_review","source":"admin_note","reason":"Investor demo note: reviewed by operator flow.","payload":{"actorUserID":"1c47660f-5a72-478d-acb1-f27fb427cad7"},"createdAt":"2026-03-15T18:11:27.066046Z"},{"id":"d61792e0-bd99-4ed1-9a19-978fcd11fc54","verificationSessionId":"93000000-0000-0000-0000-000000000011","provider":"idcomply","status":"assigned","source":"admin_assign","reason":"assigned in investor demo simulator","payload":{"assignedTo":"1c47660f-5a72-478d-acb1-f27fb427cad7"},"createdAt":"2026-03-15T18:11:26.960919Z"},{"id":"0e5fbfa1-5007-47c9-981d-92cf1fe00ec6","verificationSessionId":"93000000-0000-0000-0000-000000000011","provider":"idcomply","status":"pending_review","source":"provider_callback","reason":"seeded_manual_review","payload":{"flowType":"idpv","providerCaseId":"demo-idcomply-case-001","providerDecision":"manual_review","providerReference":"demo-idcomply-idpv-001"},"createdAt":"2026-03-15T18:06:26.876284Z"},{"id":"78393b28-5800-44b3-b3ea-098dd62aaf60","verificationSessionId":"93000000-0000-0000-0000-000000000011","provider":"idcomply","status":"submitted_to_provider","source":"provider_start","reason":"seeded_idpv_started","payload":{"flowType":"idpv","providerCaseId":"demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001"},"createdAt":"2026-03-15T17:56:26.876284Z"}]}
```

## Verification detail for demo-idcomply-case-001

- HTTP status: 200

```json
{"id":"93000000-0000-0000-0000-000000000011","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"idpv","provider":"idcomply","status":"pending_review","redirectUrl":"https://demo.idcomply.local/sessions/demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001","providerDecision":"manual_review","providerCaseId":"demo-idcomply-case-001","assignedTo":"1c47660f-5a72-478d-acb1-f27fb427cad7","assignedAt":"2026-03-15T18:11:26.960919Z","createdAt":"2026-03-15T17:56:26.875091Z","updatedAt":"2026-03-15T18:11:26.960919Z"}
```

## Verification events for demo-idcomply-case-001

- HTTP status: 200

```json
{"data":[{"id":"ec55c4d5-2d50-45c7-9326-ab9d4453c143","verificationSessionId":"93000000-0000-0000-0000-000000000011","provider":"idcomply","status":"pending_review","source":"admin_note","reason":"Investor demo note: reviewed by operator flow.","payload":{"actorUserID":"1c47660f-5a72-478d-acb1-f27fb427cad7"},"createdAt":"2026-03-15T18:11:27.066046Z"},{"id":"d61792e0-bd99-4ed1-9a19-978fcd11fc54","verificationSessionId":"93000000-0000-0000-0000-000000000011","provider":"idcomply","status":"assigned","source":"admin_assign","reason":"assigned in investor demo simulator","payload":{"assignedTo":"1c47660f-5a72-478d-acb1-f27fb427cad7"},"createdAt":"2026-03-15T18:11:26.960919Z"},{"id":"0e5fbfa1-5007-47c9-981d-92cf1fe00ec6","verificationSessionId":"93000000-0000-0000-0000-000000000011","provider":"idcomply","status":"pending_review","source":"provider_callback","reason":"seeded_manual_review","payload":{"flowType":"idpv","providerCaseId":"demo-idcomply-case-001","providerDecision":"manual_review","providerReference":"demo-idcomply-idpv-001"},"createdAt":"2026-03-15T18:06:26.876284Z"},{"id":"78393b28-5800-44b3-b3ea-098dd62aaf60","verificationSessionId":"93000000-0000-0000-0000-000000000011","provider":"idcomply","status":"submitted_to_provider","source":"provider_start","reason":"seeded_idpv_started","payload":{"flowType":"idpv","providerCaseId":"demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001"},"createdAt":"2026-03-15T17:56:26.876284Z"}]}
```

## Review queue snapshot after demo-idcomply-case-001

- HTTP status: 200

```json
{"data":[{"id":"93000000-0000-0000-0000-000000000011","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"idpv","provider":"idcomply","status":"pending_review","redirectUrl":"https://demo.idcomply.local/sessions/demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001","providerDecision":"manual_review","providerCaseId":"demo-idcomply-case-001","assignedTo":"1c47660f-5a72-478d-acb1-f27fb427cad7","assignedAt":"2026-03-15T18:11:26.960919Z","createdAt":"2026-03-15T17:56:26.875091Z","updatedAt":"2026-03-15T18:11:26.960919Z"},{"id":"93000000-0000-0000-0000-000000000012","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"kba","provider":"idcomply","status":"questions_presented","questions":[{"questionId":"occupation","text":"What is your occupation?","choices":["Engineer","Teacher","Nurse"]},{"questionId":"residence","text":"How long have you lived at your address?","choices":["\u003c1 year","1-3 years","3+ years"]}],"providerReference":"demo-idcomply-kba-001","providerDecision":"questionnaire","providerCaseId":"demo-idcomply-case-002","createdAt":"2026-03-15T17:59:26.875091Z","updatedAt":"2026-03-15T18:08:26.875091Z"}]}
```

## Scenario: idpv_approve

## Provider callback for demo-idcomply-case-001

- HTTP status: 200

```json
{"id":"93000000-0000-0000-0000-000000000011","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"idpv","provider":"idcomply","status":"approved","redirectUrl":"https://demo.idcomply.local/sessions/demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001","providerDecision":"verified","providerCaseId":"demo-idcomply-case-001","createdAt":"2026-03-15T17:56:27.983216Z","updatedAt":"2026-03-15T18:11:28.035677167Z","completedAt":"2026-03-15T18:11:28.035677167Z"}
```

## Verification detail for demo-idcomply-case-001

- HTTP status: 200

```json
{"id":"93000000-0000-0000-0000-000000000011","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"idpv","provider":"idcomply","status":"approved","redirectUrl":"https://demo.idcomply.local/sessions/demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001","providerDecision":"verified","providerCaseId":"demo-idcomply-case-001","createdAt":"2026-03-15T17:56:27.983216Z","updatedAt":"2026-03-15T18:11:28.035677Z","completedAt":"2026-03-15T18:11:28.035677Z"}
```

## Verification events for demo-idcomply-case-001

- HTTP status: 200

```json
{"data":[{"id":"29c54978-b16f-4ebc-9782-46700a1004db","verificationSessionId":"93000000-0000-0000-0000-000000000011","provider":"idcomply","status":"approved","source":"provider_callback","reason":"seeded approval","payload":{"actorRole":"data-provider","lastErrorCode":"","providerCaseId":"demo-idcomply-case-001","providerDecision":"verified","providerReference":"demo-idcomply-idpv-001","redirectUrl":"https://demo.idcomply.local/sessions/demo-idcomply-case-001"},"createdAt":"2026-03-15T18:11:28.036578Z"},{"id":"a3276d9b-cab2-422a-abb3-660caf98fdab","verificationSessionId":"93000000-0000-0000-0000-000000000011","provider":"idcomply","status":"pending_review","source":"provider_callback","reason":"seeded_manual_review","payload":{"flowType":"idpv","providerCaseId":"demo-idcomply-case-001","providerDecision":"manual_review","providerReference":"demo-idcomply-idpv-001"},"createdAt":"2026-03-15T18:06:27.984097Z"},{"id":"212bf952-e6b7-4509-9d19-7b262ab71bfa","verificationSessionId":"93000000-0000-0000-0000-000000000011","provider":"idcomply","status":"submitted_to_provider","source":"provider_start","reason":"seeded_idpv_started","payload":{"flowType":"idpv","providerCaseId":"demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001"},"createdAt":"2026-03-15T17:56:27.984097Z"}]}
```

## Review queue snapshot after demo-idcomply-case-001

- HTTP status: 200

```json
{"data":[{"id":"93000000-0000-0000-0000-000000000012","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"kba","provider":"idcomply","status":"questions_presented","questions":[{"questionId":"occupation","text":"What is your occupation?","choices":["Engineer","Teacher","Nurse"]},{"questionId":"residence","text":"How long have you lived at your address?","choices":["\u003c1 year","1-3 years","3+ years"]}],"providerReference":"demo-idcomply-kba-001","providerDecision":"questionnaire","providerCaseId":"demo-idcomply-case-002","createdAt":"2026-03-15T17:59:27.983216Z","updatedAt":"2026-03-15T18:08:27.983216Z"}]}
```

## Scenario: kba_questionnaire

## Provider callback for demo-idcomply-case-002

- HTTP status: 200

```json
{"id":"93000000-0000-0000-0000-000000000012","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"kba","provider":"idcomply","status":"questions_presented","questions":[{"questionId":"occupation","text":"What is your occupation?","choices":["Engineer","Teacher","Nurse"]},{"questionId":"residence","text":"How long have you lived at your address?","choices":["\u003c1 year","1-3 years","3+ years"]}],"providerReference":"demo-idcomply-kba-001","providerDecision":"questionnaire","providerCaseId":"demo-idcomply-case-002","createdAt":"2026-03-15T17:59:28.815657Z","updatedAt":"2026-03-15T18:11:28.859297209Z"}
```

## Verification detail for demo-idcomply-case-002

- HTTP status: 200

```json
{"id":"93000000-0000-0000-0000-000000000012","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"kba","provider":"idcomply","status":"questions_presented","questions":[{"questionId":"occupation","text":"What is your occupation?","choices":["Engineer","Teacher","Nurse"]},{"questionId":"residence","text":"How long have you lived at your address?","choices":["\u003c1 year","1-3 years","3+ years"]}],"providerReference":"demo-idcomply-kba-001","providerDecision":"questionnaire","providerCaseId":"demo-idcomply-case-002","createdAt":"2026-03-15T17:59:28.815657Z","updatedAt":"2026-03-15T18:11:28.859297Z"}
```

## Verification events for demo-idcomply-case-002

- HTTP status: 200

```json
{"data":[{"id":"4e75075c-34ed-4a43-9643-10babc751f6d","verificationSessionId":"93000000-0000-0000-0000-000000000012","provider":"idcomply","status":"questions_presented","source":"provider_callback","reason":"seeded questionnaire refresh","payload":{"actorRole":"data-provider","lastErrorCode":"","providerCaseId":"demo-idcomply-case-002","providerDecision":"questionnaire","providerReference":"demo-idcomply-kba-001","questionCount":2},"createdAt":"2026-03-15T18:11:28.859979Z"},{"id":"d1cb9461-4614-42d9-acd7-1a108d2de116","verificationSessionId":"93000000-0000-0000-0000-000000000012","provider":"idcomply","status":"questions_presented","source":"provider_questionnaire","reason":"seeded_questionnaire","payload":{"flowType":"kba","providerCaseId":"demo-idcomply-case-002","providerDecision":"questionnaire","providerReference":"demo-idcomply-kba-001","questionCount":2},"createdAt":"2026-03-15T18:08:28.816606Z"}]}
```

## Review queue snapshot after demo-idcomply-case-002

- HTTP status: 200

```json
{"data":[{"id":"93000000-0000-0000-0000-000000000012","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"kba","provider":"idcomply","status":"questions_presented","questions":[{"questionId":"occupation","text":"What is your occupation?","choices":["Engineer","Teacher","Nurse"]},{"questionId":"residence","text":"How long have you lived at your address?","choices":["\u003c1 year","1-3 years","3+ years"]}],"providerReference":"demo-idcomply-kba-001","providerDecision":"questionnaire","providerCaseId":"demo-idcomply-case-002","createdAt":"2026-03-15T17:59:28.815657Z","updatedAt":"2026-03-15T18:11:28.859297Z"},{"id":"93000000-0000-0000-0000-000000000011","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"idpv","provider":"idcomply","status":"pending_review","redirectUrl":"https://demo.idcomply.local/sessions/demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001","providerDecision":"manual_review","providerCaseId":"demo-idcomply-case-001","createdAt":"2026-03-15T17:56:28.815657Z","updatedAt":"2026-03-15T18:06:28.815657Z"}]}
```

## Scenario: kba_approve

## Admin decision approve for demo-idcomply-case-002

- HTTP status: 200

```json
{"id":"93000000-0000-0000-0000-000000000012","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"kba","provider":"idcomply","status":"approved","questions":[{"questionId":"occupation","text":"What is your occupation?","choices":["Engineer","Teacher","Nurse"]},{"questionId":"residence","text":"How long have you lived at your address?","choices":["\u003c1 year","1-3 years","3+ years"]}],"providerReference":"demo-idcomply-kba-001","providerDecision":"approve","providerCaseId":"demo-idcomply-case-002","createdAt":"2026-03-15T17:59:31.429708Z","updatedAt":"2026-03-15T18:11:31.489249085Z","completedAt":"2026-03-15T18:11:31.489249085Z"}
```

## Verification detail for demo-idcomply-case-002

- HTTP status: 200

```json
{"id":"93000000-0000-0000-0000-000000000012","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"kba","provider":"idcomply","status":"approved","questions":[{"questionId":"occupation","text":"What is your occupation?","choices":["Engineer","Teacher","Nurse"]},{"questionId":"residence","text":"How long have you lived at your address?","choices":["\u003c1 year","1-3 years","3+ years"]}],"providerReference":"demo-idcomply-kba-001","providerDecision":"approve","providerCaseId":"demo-idcomply-case-002","createdAt":"2026-03-15T17:59:31.429708Z","updatedAt":"2026-03-15T18:11:31.489249Z","completedAt":"2026-03-15T18:11:31.489249Z"}
```

## Verification events for demo-idcomply-case-002

- HTTP status: 200

```json
{"data":[{"id":"6aad28cc-6633-4a5b-b557-4973d571881a","verificationSessionId":"93000000-0000-0000-0000-000000000012","provider":"idcomply","status":"approved","source":"admin_review","reason":"approved in investor demo simulator","payload":{"actorRole":"admin","decision":"approve","lastErrorCode":"","providerCaseId":"demo-idcomply-case-002","providerDecision":"approve","providerReference":"demo-idcomply-kba-001","questionCount":2,"reviewReason":"approved in investor demo simulator","reviewedByRole":"admin"},"createdAt":"2026-03-15T18:11:31.490734Z"},{"id":"265d1093-cbea-4ca1-9d66-dac5936e3576","verificationSessionId":"93000000-0000-0000-0000-000000000012","provider":"idcomply","status":"questions_presented","source":"provider_questionnaire","reason":"seeded_questionnaire","payload":{"flowType":"kba","providerCaseId":"demo-idcomply-case-002","providerDecision":"questionnaire","providerReference":"demo-idcomply-kba-001","questionCount":2},"createdAt":"2026-03-15T18:08:31.432296Z"}]}
```

## Review queue snapshot after demo-idcomply-case-002

- HTTP status: 200

```json
{"data":[{"id":"93000000-0000-0000-0000-000000000011","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"idpv","provider":"idcomply","status":"pending_review","redirectUrl":"https://demo.idcomply.local/sessions/demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001","providerDecision":"manual_review","providerCaseId":"demo-idcomply-case-001","createdAt":"2026-03-15T17:56:31.429708Z","updatedAt":"2026-03-15T18:06:31.429708Z"}]}
```

## Scenario: kba_reject

## Admin decision reject for demo-idcomply-case-002

- HTTP status: 200

```json
{"id":"93000000-0000-0000-0000-000000000012","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"kba","provider":"idcomply","status":"rejected","questions":[{"questionId":"occupation","text":"What is your occupation?","choices":["Engineer","Teacher","Nurse"]},{"questionId":"residence","text":"How long have you lived at your address?","choices":["\u003c1 year","1-3 years","3+ years"]}],"providerReference":"demo-idcomply-kba-001","providerDecision":"reject","providerCaseId":"demo-idcomply-case-002","createdAt":"2026-03-15T17:59:32.402508Z","updatedAt":"2026-03-15T18:11:32.443296586Z","completedAt":"2026-03-15T18:11:32.443296586Z"}
```

## Verification detail for demo-idcomply-case-002

- HTTP status: 200

```json
{"id":"93000000-0000-0000-0000-000000000012","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"kba","provider":"idcomply","status":"rejected","questions":[{"questionId":"occupation","text":"What is your occupation?","choices":["Engineer","Teacher","Nurse"]},{"questionId":"residence","text":"How long have you lived at your address?","choices":["\u003c1 year","1-3 years","3+ years"]}],"providerReference":"demo-idcomply-kba-001","providerDecision":"reject","providerCaseId":"demo-idcomply-case-002","createdAt":"2026-03-15T17:59:32.402508Z","updatedAt":"2026-03-15T18:11:32.443296Z","completedAt":"2026-03-15T18:11:32.443296Z"}
```

## Verification events for demo-idcomply-case-002

- HTTP status: 200

```json
{"data":[{"id":"c69bd1f9-887e-475b-8d1e-7dea015a7fa5","verificationSessionId":"93000000-0000-0000-0000-000000000012","provider":"idcomply","status":"rejected","source":"admin_review","reason":"rejected in investor demo simulator","payload":{"actorRole":"admin","decision":"reject","lastErrorCode":"","providerCaseId":"demo-idcomply-case-002","providerDecision":"reject","providerReference":"demo-idcomply-kba-001","questionCount":2,"reviewReason":"rejected in investor demo simulator","reviewedByRole":"admin"},"createdAt":"2026-03-15T18:11:32.444193Z"},{"id":"587c193f-3a8b-4a57-8c11-6d0cb118e6bd","verificationSessionId":"93000000-0000-0000-0000-000000000012","provider":"idcomply","status":"questions_presented","source":"provider_questionnaire","reason":"seeded_questionnaire","payload":{"flowType":"kba","providerCaseId":"demo-idcomply-case-002","providerDecision":"questionnaire","providerReference":"demo-idcomply-kba-001","questionCount":2},"createdAt":"2026-03-15T18:08:32.403346Z"}]}
```

## Review queue snapshot after demo-idcomply-case-002

- HTTP status: 200

```json
{"data":[{"id":"93000000-0000-0000-0000-000000000011","userId":"6d815e42-d8ea-474a-8599-b10494d86121","flowType":"idpv","provider":"idcomply","status":"pending_review","redirectUrl":"https://demo.idcomply.local/sessions/demo-idcomply-case-001","providerReference":"demo-idcomply-idpv-001","providerDecision":"manual_review","providerCaseId":"demo-idcomply-case-001","createdAt":"2026-03-15T17:56:32.402508Z","updatedAt":"2026-03-15T18:06:32.402508Z"}]}
```

