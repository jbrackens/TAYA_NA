package phoenix.punters.unit

import scala.concurrent.duration._

import org.scalatest.matchers.should.Matchers
import org.scalatest.prop.TableDrivenPropertyChecks
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.TimeUtils._
import phoenix.punters.domain.CurrentTermsVersion
import phoenix.punters.domain.TermsAcceptedVersion
import phoenix.punters.domain.TermsAgreement
import phoenix.punters.domain.TermsDaysThreshold
import phoenix.punters.domain.TermsValidator
import phoenix.support.DataGenerator

final class TermsValidatorSpec extends AnyWordSpec with Matchers with TableDrivenPropertyChecks {
  "terms validator should validate current accepted terms against the actual version and threshold amount" in {
    val now = DataGenerator.randomOffsetDateTime()

    val table = Table(
      ("givenCurrentTermsVersion", "givenDaysThreshold", "givenCurrentAgreement", "expectedValidationResult"),
      (CurrentTermsVersion(10), TermsDaysThreshold(100), TermsAgreement(TermsAcceptedVersion(10), now), false),
      (CurrentTermsVersion(10), TermsDaysThreshold(100), TermsAgreement(TermsAcceptedVersion(9), now), true),
      (CurrentTermsVersion(3), TermsDaysThreshold(100), TermsAgreement(TermsAcceptedVersion(2), now), true),
      (CurrentTermsVersion(5), TermsDaysThreshold(100), TermsAgreement(TermsAcceptedVersion(5), now), false),
      (CurrentTermsVersion(5), TermsDaysThreshold(100), TermsAgreement(TermsAcceptedVersion(5), now - 100.day), false),
      (CurrentTermsVersion(5), TermsDaysThreshold(100), TermsAgreement(TermsAcceptedVersion(5), now - 101.day), true))

    forAll(table) {
      case (givenCurrentTermsVersion, givenDaysThreshold, givenCurrentAgreement, expectedValidationResult) =>
        val result =
          TermsValidator.doTermsNeedToBeAccepted(
            givenCurrentTermsVersion,
            givenDaysThreshold,
            now,
            givenCurrentAgreement)
        result shouldBe expectedValidationResult
    }
  }
}
