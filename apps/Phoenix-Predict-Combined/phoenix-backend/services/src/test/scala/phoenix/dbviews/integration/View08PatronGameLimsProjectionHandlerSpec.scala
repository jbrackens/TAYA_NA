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

import phoenix.core.deployment.DeploymentClock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.dbviews.infrastructure.SlickView08PatronsGameLimsRepository
import phoenix.dbviews.infrastructure.View08PatronGameLimsProjectionHandler
import phoenix.punters.PunterProtocol.Events.CoolOffExclusionBegan
import phoenix.punters.PunterProtocol.Events.DailyDepositLimitChanged
import phoenix.punters.PunterProtocol.Events.DailySessionLimitChanged
import phoenix.punters.PunterProtocol.Events.DailyStakeLimitChanged
import phoenix.punters.PunterProtocol.Events.MonthlyDepositLimitChanged
import phoenix.punters.PunterProtocol.Events.MonthlySessionLimitChanged
import phoenix.punters.PunterProtocol.Events.MonthlyStakeLimitChanged
import phoenix.punters.PunterProtocol.Events.PunterEvent
import phoenix.punters.PunterProtocol.Events.WeeklyDepositLimitChanged
import phoenix.punters.PunterProtocol.Events.WeeklySessionLimitChanged
import phoenix.punters.PunterProtocol.Events.WeeklyStakeLimitChanged
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport

class View08PatronGameLimsProjectionHandlerSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with BeforeAndAfterEach
    with DatabaseIntegrationSpec {
  import dbConfig.db
  val clock = DeploymentClock.fromConfig(deploymentConfig)
  val repository: SlickView08PatronsGameLimsRepository = new SlickView08PatronsGameLimsRepository(dbConfig, clock)
  val query = TableQuery[SlickView08PatronsGameLimsRepository.PatronGameLimsTable]
  val handler = new View08PatronGameLimsProjectionHandler(repository, clock, LoggerFactory.getLogger(getClass()))
  val limitChangeEventGen: Gen[PunterEvent] = Gen.oneOf(
    implicitly[Arbitrary[DailyDepositLimitChanged]].arbitrary,
    implicitly[Arbitrary[WeeklyDepositLimitChanged]].arbitrary,
    implicitly[Arbitrary[MonthlyDepositLimitChanged]].arbitrary,
    implicitly[Arbitrary[DailyStakeLimitChanged]].arbitrary,
    implicitly[Arbitrary[WeeklyStakeLimitChanged]].arbitrary,
    implicitly[Arbitrary[MonthlyStakeLimitChanged]].arbitrary,
    implicitly[Arbitrary[DailySessionLimitChanged]].arbitrary,
    implicitly[Arbitrary[WeeklySessionLimitChanged]].arbitrary,
    implicitly[Arbitrary[MonthlySessionLimitChanged]].arbitrary)
  val coolOffStartedEventGen: Gen[PunterEvent] = implicitly[Arbitrary[CoolOffExclusionBegan]].arbitrary

  "View08PatronGameLimsProjectionHandler" should {
    "handle limit changes" in {
      val event = limitChangeEventGen.pureApply(Gen.Parameters.default, Seed.random())
      await(handler.process(EventEnvelope.create(NoOffset, "fakePersistenceId", 0, event, 0)))
      val stored = await(db.run(query.result))
      stored.map(_.patronGameLims.punterId) shouldBe List(event.punterId)
    }
    "handle cooloffs" in {
      val event =
        implicitly[Arbitrary[CoolOffExclusionBegan]].arbitrary.pureApply(Gen.Parameters.default, Seed.random())
      await(handler.process(EventEnvelope.create(NoOffset, "fakePersistenceId", 0, event, 0)))
      val stored = await(db.run(query.result))
      stored.map(_.patronGameLims.punterId) shouldBe List(event.punterId)
    }
  }

  override protected def beforeEach(): Unit = {
    super.beforeEach()
    await(db.run(query.delete))
  }
}
