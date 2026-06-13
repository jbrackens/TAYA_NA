package phoenix.http.core.unit

import akka.http.scaladsl.testkit.ScalatestRouteTest
import org.scalatest.OptionValues
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec
import sttp.model.StatusCode

import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess.exampleDeletedPunterProfile
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess.examplePunterProfile
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess.exampleSuspendedPunterProfile
import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.http.core.TapirAuthDirectives.StatusValidators.allowActiveAndNegative
import phoenix.http.core.TapirAuthDirectives.StatusValidators.allowActive_CoolOff_Negative
import phoenix.http.core.TapirAuthDirectives.StatusValidators.allowActive_CoolOff_Unverified
import phoenix.http.core.TapirAuthDirectives.authorizePunterProfile
import phoenix.punters.domain.PunterStatus._
import phoenix.punters.domain.SuspensionEntity.NegativeBalance
import phoenix.support.FutureSupport

final class StatusValidatorSpec
    extends AnyWordSpec
    with Matchers
    with OptionValues
    with ScalatestRouteTest
    with FutureSupport {
  "Active_CoolOff_Unverified status validator" should {
    "fail for a suspended user" in {
      val result =
        awaitLeft(authorizePunterProfile(allowActive_CoolOff_Unverified, exampleSuspendedPunterProfile))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsSuspended)
    }
    "fail for a deleted user" in {
      val result =
        awaitLeft(authorizePunterProfile(allowActive_CoolOff_Unverified, exampleDeletedPunterProfile))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsDeleted)
    }

    "fail for a user in self-exclusion" in {
      val selfExcludedUser = examplePunterProfile.copy(status = SelfExcluded)

      val result = awaitLeft(authorizePunterProfile(allowActive_CoolOff_Unverified, selfExcludedUser))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsInSelfExclusion)
    }

    "pass for a user in cool-off" in {
      val coolingOffUser = examplePunterProfile.copy(status = InCoolOff)

      val result = awaitRight(authorizePunterProfile(allowActive_CoolOff_Unverified, coolingOffUser))

      result shouldBe (())
    }

    "pass for an active user" in {
      val result = awaitRight(authorizePunterProfile(allowActive_CoolOff_Unverified, examplePunterProfile))

      result shouldBe (())
    }

    "pass for an unverified user" in {
      val punter = examplePunterProfile.copy(status = Unverified)
      val result = awaitRight(authorizePunterProfile(allowActive_CoolOff_Unverified, punter))

      result shouldBe (())
    }

    "pass for an user with negative balance" in {
      val punter = examplePunterProfile.copy(status = Suspended(NegativeBalance("Negative balance")))
      val result = awaitRight(authorizePunterProfile(allowActive_CoolOff_Unverified, punter))

      result shouldBe (())
    }
  }

  "Active_CoolOff status validator" should {
    "fail for a suspended user" in {
      val result =
        awaitLeft(authorizePunterProfile(allowActive_CoolOff_Negative, exampleSuspendedPunterProfile))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsSuspended)
    }
    "fail for a deleted user" in {
      val result =
        awaitLeft(authorizePunterProfile(allowActive_CoolOff_Negative, exampleDeletedPunterProfile))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsDeleted)
    }

    "fail for a user in self-exclusion" in {
      val selfExcludedUser = examplePunterProfile.copy(status = SelfExcluded)

      val result = awaitLeft(authorizePunterProfile(allowActive_CoolOff_Negative, selfExcludedUser))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsInSelfExclusion)
    }

    "fail for a user in unverified" in {
      val punter = examplePunterProfile.copy(status = Unverified)
      val result = awaitLeft(authorizePunterProfile(allowActive_CoolOff_Negative, punter))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsUnverified)
    }

    "pass for a user in cool-off" in {
      val coolingOffUser = examplePunterProfile.copy(status = InCoolOff)

      val result = awaitRight(authorizePunterProfile(allowActive_CoolOff_Negative, coolingOffUser))

      result shouldBe (())
    }

    "pass for an active user" in {
      val result = awaitRight(authorizePunterProfile(allowActive_CoolOff_Negative, examplePunterProfile))

      result shouldBe (())
    }

    "pass for an user with negative balance" in {
      val punter = examplePunterProfile.copy(status = Suspended(NegativeBalance("Negative balance")))
      val result = awaitRight(authorizePunterProfile(allowActive_CoolOff_Negative, punter))

      result shouldBe (())
    }
  }

  "active status validators" should {
    "fail for a suspended user" in {
      val result = awaitLeft(authorizePunterProfile(allowActiveAndNegative, exampleSuspendedPunterProfile))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsSuspended)
    }

    "fail for a deleted user" in {
      val result = awaitLeft(authorizePunterProfile(allowActiveAndNegative, exampleDeletedPunterProfile))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsDeleted)
    }

    "fail for a user in self-exclusion" in {
      val selfExcludedUser = examplePunterProfile.copy(status = SelfExcluded)

      val result = awaitLeft(authorizePunterProfile(allowActiveAndNegative, selfExcludedUser))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsInSelfExclusion)
    }

    "fail for a user in cool-off" in {
      val coolingOffUser = examplePunterProfile.copy(status = InCoolOff)

      val result = awaitLeft(authorizePunterProfile(allowActiveAndNegative, coolingOffUser))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsInCoolOff)
    }

    "fail for a user in unverified" in {
      val punter = examplePunterProfile.copy(status = Unverified)

      val result = awaitLeft(authorizePunterProfile(allowActiveAndNegative, punter))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsUnverified)
    }

    "pass for an active user" in {
      val result = awaitRight(authorizePunterProfile(allowActiveAndNegative, examplePunterProfile))

      result shouldBe (())
    }

    "pass for an user with negative balance" in {
      val punter = examplePunterProfile.copy(status = Suspended(NegativeBalance("Negative balance")))
      val result = awaitRight(authorizePunterProfile(allowActiveAndNegative, punter))

      result shouldBe (())
    }
  }

}
