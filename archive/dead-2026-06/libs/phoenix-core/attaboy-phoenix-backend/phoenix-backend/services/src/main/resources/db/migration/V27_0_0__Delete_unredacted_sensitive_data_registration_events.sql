-- Delete ssns
WITH new_payloads AS (
    SELECT
      re.id,
      re.event #- '{kycResult, firstFiveDigitsSSN}' AS new_payload
    FROM registration_events re
    WHERE re.event ->> 'type' = 'punterGotSuccessfulKycResponse'
)
UPDATE registration_events re
SET "event" = np.new_payload
FROM new_payloads np
WHERE re.id = np.id;

-- Delete passwords
WITH new_payloads AS (
    SELECT
      re.id,
      re.event #- '{signUpRequest, password}' AS new_payload
    FROM registration_events re
    WHERE re.event ->> 'type' = 'punterSignUpStarted'
)
UPDATE registration_events re
SET "event" = np.new_payload
FROM new_payloads np
WHERE re.id = np.id;

