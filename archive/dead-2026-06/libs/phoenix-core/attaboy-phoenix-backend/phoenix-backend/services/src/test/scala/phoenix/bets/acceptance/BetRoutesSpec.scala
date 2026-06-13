package phoenix.bets.acceptance

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.http.scaladsl.model.StatusCodes
import cats.data.EitherT
import io.circe.literal._

import phoenix.bets.BetEntity
import phoenix.bets.BetState
import phoenix.bets.BetStateUpdate
import phoenix.bets.BetsBoundedContext
import phoenix.bets.BetsBoundedContext.UnexpectedStateError
import phoenix.bets.infrastructure.BetJsonFormats._
import phoenix.bets.support.BetsBoundedContextMock.BetsSuccessMock
import phoenix.core.Clock
import phoenix.http.JsonMarshalling._
import phoenix.http.routes.RoutesSpecSupport
import phoenix.http.support.PhoenixRestRoutesBuilder
import phoenix.jwt.JwtAuthenticator
import phoenix.jwt.JwtAuthenticatorMock
import phoenix.jwt.Permissions
import phoenix.punters.PunterDataGenerator
import phoenix.punters.infrastructure.http.BackofficePunterRoutesSpec.betData
import phoenix.support.DataGenerator.generateBetId
import phoenix.time.FakeHardcodedClock

class BetRoutesSpec extends RoutesSpecSupport {

  implicit val clock: Clock = new FakeHardcodedClock()
  private val adminUserId = Permissions.UserId(PunterDataGenerator.generateUserId().value.toString)
  implicit val jwtAuthenticator: JwtAuthenticator = JwtAuthenticatorMock.jwtAuthenticatorMock(adminUserId)

  private val restRoutesBuilder = new PhoenixRestRoutesBuilder(clock, jwtAuthenticator)

  "The Bet Routes" when {
    "/punters/bets/status" should {

      "return the bet status updates" in {
        val betId1 = generateBetId()
        val betId2 = generateBetId()
        val request = json"""
              {
                "betIds": [${betId1.value}, ${betId2.value}]
              }
            """
        withAuthToken(Post(s"/punters/bets/status", request), JwtAuthenticatorMock.punterToken) ~> restRoutesBuilder
          .buildRoutes() ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[List[BetStateUpdate]].map(_.betId) should ===(List(betId1, betId2))
        }
      }

      "filter out bets that haven't been processed or are uknown" in {
        val betId1 = generateBetId()
        val betId2 = generateBetId()
        val betsBoundedContext = new BetsSuccessMock(BetState.Status.Open, betData) {
          override def betDetails(id: BetEntity.BetId)(implicit ec: ExecutionContext)
              : EitherT[Future, BetsBoundedContext.BetDetailsError, BetsBoundedContext.BetDetails] = {
            if (id == betId1) {
              super.betDetails(id)
            } else {
              EitherT.leftT(UnexpectedStateError(id, BetState.Status.Uninitialized))
            }
          }
        }

        val request = json"""
              {
                "betIds": [${betId1.value}, ${betId2.value}]
              }
            """
        withAuthToken(Post(s"/punters/bets/status", request), JwtAuthenticatorMock.punterToken) ~> restRoutesBuilder
          .buildRoutes(bets = betsBoundedContext) ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[List[BetStateUpdate]].map(_.betId) should ===(List(betId1))
        }
      }
    }
  }
}
