package phoenix.http.core.unit

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.http.scaladsl.testkit.ScalatestRouteTest
import cats.data.EitherT
import org.scalatest.OptionValues
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec
import sttp.model.StatusCode

import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess.exampleCoolingOffPunterProfile
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess.examplePunterProfile
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess.exampleSuspendedPunterProfile
import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.http.core.TapirAuthDirectives.StatusValidators.allowActiveAndNegative
import phoenix.http.core.TapirAuthDirectives.StatusValidators.allowActive_CoolOff_Unverified
import phoenix.http.core.TapirAuthDirectives.guardPunterProfileAuthorization
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext.PunterProfileDoesNotExist
import phoenix.punters.domain.PunterProfile
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock

final class TapirAuthDirectivesSpec
    extends AnyWordSpec
    with Matchers
    with OptionValues
    with ScalatestRouteTest
    with FutureSupport {
  implicit val ec: ExecutionContext = system.dispatcher
  implicit val clock: Clock = new FakeHardcodedClock()
  val punters = new PuntersContextProviderSuccess() {
    override def getPunterProfile(id: PunterId)(implicit
        ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] = {
      EitherT.safeRightT(id match {
        case PunterId("active")    => examplePunterProfile
        case PunterId("suspended") => exampleSuspendedPunterProfile
        case _                     => exampleCoolingOffPunterProfile
      })
    }

  }

  "active users" should {

    "pass auth directives for non suspended guard" in {
      val result =
        await(guardPunterProfileAuthorization(PunterId("active"), punters, allowActive_CoolOff_Unverified)(ec).value)

      result.isRight shouldBe true
    }

    "pass auth directives for active guard" in {
      val result =
        await(guardPunterProfileAuthorization(PunterId("active"), punters, allowActiveAndNegative)(ec).value)

      result.isRight shouldBe true
    }
  }

  "suspended users" should {
    "fail auth directives for active guard" in {
      val result =
        awaitLeft(guardPunterProfileAuthorization(PunterId("suspended"), punters, allowActiveAndNegative)(ec))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsSuspended)
    }
    "fail auth directives for non suspended guard" in {
      val result =
        awaitLeft(guardPunterProfileAuthorization(PunterId("suspended"), punters, allowActive_CoolOff_Unverified)(ec))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsSuspended)
    }

  }

  "cooling off and self excluded users" should {
    "pass auth directives for non suspended guard" in {
      val result =
        await(
          guardPunterProfileAuthorization(PunterId("coolingOff"), punters, allowActive_CoolOff_Unverified)(ec).value)
      result.isRight shouldBe true
    }
    "fail auth directives for active guard" in {
      val result =
        awaitLeft(guardPunterProfileAuthorization(PunterId("coolingOff"), punters, allowActiveAndNegative)(ec))

      result shouldBe ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsInCoolOff)
    }

  }

}
