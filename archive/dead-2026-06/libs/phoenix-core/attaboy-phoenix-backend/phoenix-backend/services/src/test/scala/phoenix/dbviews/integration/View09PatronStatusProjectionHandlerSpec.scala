package phoenix.dbviews.integration

import akka.persistence.query.NoOffset
import akka.projection.eventsourced.EventEnvelope
import org.scalacheck.Arbitrary
import org.scalacheck.Gen
import org.scalacheck.ScalacheckShapeless._
import org.scalacheck.rng.Seed
import org.scalatest.BeforeAndAfterEach
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike
import org.slf4j.LoggerFactory
import slick.lifted.TableQuery

import phoenix.CirceAkkaSerializable
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess.examplePunterProfile
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.deployment.DeploymentClock
import phoenix.core.odds.Odds
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.dbviews.infrastructure.SlickView09PatronStatusRepository
import phoenix.dbviews.infrastructure.View09PatronStatusProjectionHandler
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.Events.PunterEvent
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.wallets.WalletActorProtocol.events.TransactionEvent

class View09PatronStatusProjectionHandlerSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with BeforeAndAfterEach
    with DatabaseIntegrationSpec {
  import dbConfig.db
  val repository: SlickView09PatronStatusRepository = new SlickView09PatronStatusRepository(dbConfig)
  val query = TableQuery[SlickView09PatronStatusRepository.PatronStatusTable]
  val clock = DeploymentClock.fromConfig(deploymentConfig)
  implicit lazy val oddsArbitrary: Arbitrary[Odds] = Arbitrary(
    Gen.chooseNum(Odds.MinValue, Odds.MaxValue).filterNot(_ == Odds.MaxValue).map(Odds.apply))
  implicit lazy val defaultCurrencyMoneyArbitrary: Arbitrary[DefaultCurrencyMoney] =
    Arbitrary(implicitly[Arbitrary[MoneyAmount]].arbitrary.map(DefaultCurrencyMoney.apply))

  "View09PatronStatusProjectionHandler" should {
    "handle punter events" in {
      val event = implicitly[Arbitrary[PunterEvent]].arbitrary.pureApply(Gen.Parameters.default, Seed.random())
      val punterId = event.punterId
      handleEvent(event, punterId)
      val stored = await(db.run(query.result))
      stored.map(_.punterId) shouldBe List(punterId)
    }

    "handle wallet events" in {
      val event = implicitly[Arbitrary[TransactionEvent]].arbitrary.pureApply(Gen.Parameters.default, Seed.random())
      val punterId = event.walletId.owner
      handleEvent(event, punterId)
      val stored = await(db.run(query.result))
      stored.map(_.punterId) shouldBe List(punterId)
    }
  }

  private def handleEvent(event: CirceAkkaSerializable, punterId: PunterId) = {
    val envelope: EventEnvelope[CirceAkkaSerializable] =
      EventEnvelope.create(NoOffset, "fakePersistenceId", 0, event, 0)
    val handler = new View09PatronStatusProjectionHandler(
      punters = new PuntersContextProviderSuccess(punterProfile = examplePunterProfile.copy(punterId = punterId))(
        clock = clock),
      repository = repository,
      clock = clock,
      log = LoggerFactory.getLogger(getClass()))
    await(handler.process(envelope))
  }

  override protected def beforeEach(): Unit = {
    super.beforeEach()
    await(db.run(query.delete))
  }
}
