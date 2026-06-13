package phoenix.suppliers.oddin

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Try

import akka.actor.typed.scaladsl.TimerScheduler
import akka.actor.typed.scaladsl.adapter._
import akka.stream.scaladsl.Sink
import org.scalamock.function.MockFunction2
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.domain.DataProvider
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.UpdateSportRequest
import phoenix.markets.sports.SportEntity
import phoenix.oddin.EndpointStub
import phoenix.oddin.OddinApiSpecSupport
import phoenix.oddin.domain.OddinRestApi
import phoenix.support._
import phoenix.time.FakeHardcodedClock

class SportsCollectorSpec
    extends AnyWordSpecLike
    with ActorSystemIntegrationSpec
    with OddinApiSpecSupport
    with FutureSupport
    with HttpSpec {
  import SportsCollectorSpec._

  implicit val classicAS = system.toClassic
  implicit val typedAS = system

  val fakeClock = new FakeHardcodedClock()

  def fakeSportsCollector(c: OddinRestApi, mc: MarketsBoundedContext) =
    new SportsCollector {
      override implicit val ec: ExecutionContext = scala.concurrent.ExecutionContext.Implicits.global
      override val client: OddinRestApi = c
      override val clock: Clock = fakeClock
      override val timers: TimerScheduler[CollectorBehaviors.CollectorMessage] =
        mock[TimerScheduler[CollectorBehaviors.CollectorMessage]]
      override val marketsContext: MarketsBoundedContext = mc
    }

  "A Sports Collector" should {

    "Request the list of all sports to Oddin and propagate it to the MarketsBoundedContext" in {
      withOddinApi(ListAllSportsRequests, specOddinConfig(httpBaseUrl)) { client =>
        // Given
        val marketsContext = mock[MarketsBoundedContext]
        val sportsCollector = fakeSportsCollector(client, marketsContext)
        val source = sportsCollector.createSource()

        // Expect
        val fakeResult = Future.successful(SportEntity.SportId.apply(DataProvider.Oddin, "test"))
        val updateSportsFn: MockFunction2[UpdateSportRequest, ExecutionContext, Future[_]] =
          marketsContext.createOrUpdateSport(_: UpdateSportRequest)(_: ExecutionContext)
        updateSportsFn
          .expects(where { (req, _) => assertUpdateSportRequest(req, "s:p:1", "League of Legends", "lol") })
          .returns(fakeResult)
        updateSportsFn
          .expects(where { (req, _) => assertUpdateSportRequest(req, "s:p:2", "Fortnite", "for") })
          .returns(fakeResult)

        // When
        await(source.runWith(Sink.ignore))
      }
    }

  }

  def assertUpdateSportRequest(
      req: UpdateSportRequest,
      sportId: String,
      sportName: String,
      sportAbbreviation: String): Boolean = {
    req.sportId.value == sportId &&
    req.sportName == sportName &&
    req.sportAbbreviation == sportAbbreviation &&
    req.receivedAtUtc == fakeClock.fixedTime &&
    Try(java.util.UUID.fromString(req.correlationId)).isSuccess
  }

}

object SportsCollectorSpec extends FileSupport {

  val SpecDataDir = "data/sports-collector-spec"
  val ListAllSportsDir = s"$SpecDataDir/list-all-sports"

  val ListAllSportsRequests = Seq(
    EndpointStub("/v1/sports/en/sports", Seq(stringFromResource(ListAllSportsDir, fileName = "list-all-sports.xml"))))
}
