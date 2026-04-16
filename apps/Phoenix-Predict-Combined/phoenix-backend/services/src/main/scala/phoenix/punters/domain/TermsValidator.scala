package phoenix.punters.domain

import java.time.OffsetDateTime
import java.time.temporal.ChronoUnit

object TermsValidator {
  def doTermsNeedToBeAccepted(
      termsVersion: CurrentTermsVersion,
      daysThreshold: TermsDaysThreshold,
      now: OffsetDateTime,
      termsAgreement: TermsAgreement): Boolean =
    hasDaysThresholdBeenPassedFromLastAccept(daysThreshold, now, termsAgreement.acceptedAt) ||
    !isAcceptedVersionTheLatest(termsVersion, termsAgreement.version)

  private def hasDaysThresholdBeenPassedFromLastAccept(
      daysThreshold: TermsDaysThreshold,
      now: OffsetDateTime,
      acceptedAt: OffsetDateTime): Boolean =
    acceptedAt.until(now, ChronoUnit.DAYS) > daysThreshold.value

  private def isAcceptedVersionTheLatest(termsVersion: CurrentTermsVersion, version: TermsAcceptedVersion): Boolean =
    termsVersion.value == version.value
}
