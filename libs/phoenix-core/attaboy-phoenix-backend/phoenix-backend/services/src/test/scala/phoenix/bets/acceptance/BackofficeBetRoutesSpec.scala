package phoenix.bets.acceptance

import akka.http.scaladsl.model.StatusCodes
import io.circe.Json
import org.scalamock.scalatest.MockFactory

import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.CancellationReason
import phoenix.bets.support.MemorizedBetsBoundedContext
import phoenix.core.Clock
import phoenix.http.JsonMarshalling._
import phoenix.http.routes._
import phoenix.http.support.PhoenixRestRoutesBuilder
import phoenix.jwt.JwtAuthenticator
import phoenix.jwt.JwtAuthenticatorMock
import phoenix.jwt.Permissions
import phoenix.punters.PunterDataGenerator
import phoenix.punters.PunterEntity.AdminId
import phoenix.support.DataGenerator.generateBetId
import phoenix.time.FakeHardcodedClock

final class BackofficeBetRoutesSpec extends RoutesSpecSupport with MockFactory {

  implicit val clock: Clock = new FakeHardcodedClock()
  private val adminUserId = Permissions.UserId(PunterDataGenerator.generateUserId().value.toString)
  implicit val jwtAuthenticator: JwtAuthenticator = JwtAuthenticatorMock.jwtAuthenticatorMock(adminUserId)

  private val restRoutesBuilder = new PhoenixRestRoutesBuilder(clock, jwtAuthenticator)

  "Backoffice bet routes" when {
    "POST /admin/bets/:betId/cancel" should {

      "fail if no body is passed" in {
        withAdminToken(Post(s"/admin/bets/${generateBetId().value}/cancel")) ~> restRoutesBuilder
          .buildRoutes() ~> check {
          status shouldEqual StatusCodes.BadRequest
        }
      }

      "fail if an empty cancellation reason is passed" in {
        val request = Json.obj("cancellationReason" -> Json.fromString(""))
        withAdminToken(Post(s"/admin/bets/${generateBetId().value}/cancel", request)) ~> restRoutesBuilder
          .buildRoutes() ~> check {
          status shouldEqual StatusCodes.BadRequest
        }
      }

      val requestBody = Json.obj("cancellationReason" -> Json.fromString("Some very good reason."))

      assertAdminRoleRequired(Post(s"/admin/bets/${generateBetId().value}/cancel", requestBody))(
        restRoutesBuilder.buildRoutes())

      "cancel a bet" in {
        val betId = generateBetId()
        val bets = new MemorizedBetsBoundedContext()
        bets.bets = List((betId, AdminId(adminUserId.value), BetStatus.Open, clock.currentOffsetDateTime(), None))
        val routes = restRoutesBuilder.buildRoutes(bets = bets)

        withAdminToken(Post(s"/admin/bets/${betId.value}/cancel", requestBody)) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent
        }

        bets.bets shouldBe List(
          (
            betId,
            AdminId(adminUserId.value),
            BetStatus.Cancelled,
            clock.currentOffsetDateTime(),
            Some(CancellationReason.unsafe("Some very good reason."))))
      }
    }
  }
}
