package phoenix.dbviews.integration

import java.time.OffsetDateTime
import java.time.temporal.ChronoUnit

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike
import slick.lifted.TableQuery

import phoenix.core.Clock
import phoenix.core.deployment.DeploymentClock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.dbviews.domain.model.LimitPeriod
import phoenix.dbviews.domain.model.LimitType
import phoenix.dbviews.domain.model.PatronGameLims
import phoenix.dbviews.infrastructure.SlickView08PatronsGameLimsRepository
import phoenix.punters.PunterEntity
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator._
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport

class SlickView08PatronsGameLimsRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec {
  import dbConfig.db
  import SlickView08PatronsGameLimsRepository._

  val clock = Clock.utcClock
  val easternClock = DeploymentClock.fromConfig(deploymentConfig)
  val repository: SlickView08PatronsGameLimsRepository =
    new SlickView08PatronsGameLimsRepository(dbConfig, easternClock)
  val query = TableQuery[PatronGameLimsTable]

  "SlickView08PatronsGameLimsRepository" should {
    "store events" in {
      await(db.run(query.delete))
      val patronLims1 = generatePatronGameLims(PunterEntity.PunterId("aPunter"))
      val patronLims2 = generatePatronGameLims(PunterEntity.PunterId("bPunter"))
      await(repository.upsert(patronLims1))
      await(repository.upsert(patronLims2))
      val stored = await(db.run(query.result))
      stored.sortBy(_.patronGameLims.punterId.value) shouldBe List(patronLims1, patronLims2)
        .map(truncateTime)
        .map(withEasternTime(_, easternClock))
    }
    "store events for the same punter at different times" in {
      await(db.run(query.delete))
      val time = clock.currentOffsetDateTime()
      val patronLims1 = generatePatronGameLims(PunterEntity.PunterId("aPunter"), time)
      val patronLims2 = generatePatronGameLims(PunterEntity.PunterId("aPunter"), time.minusSeconds(1))
      await(repository.upsert(patronLims1))
      await(repository.upsert(patronLims2))
      val stored = await(db.run(query.result))
      stored.sortBy(_.createdAt) shouldBe List(patronLims2, patronLims1)
        .map(truncateTime)
        .map(withEasternTime(_, easternClock))
    }
    "override events for the same punter on the same day" in {
      await(db.run(query.delete))
      val time = clock.currentOffsetDateTime()
      val patronLims1 = generatePatronGameLims(PunterEntity.PunterId("aPunter"), time)
      val patronLims2 = generatePatronGameLims(PunterEntity.PunterId("aPunter"), time)
      await(repository.upsert(patronLims1))
      await(repository.upsert(patronLims2))
      val stored = await(db.run(query.result))
      stored.sortBy(_.patronGameLims.punterId.value) shouldBe List(patronLims2)
        .map(truncateTime)
        .map(withEasternTime(_, easternClock))
    }
  }

  def generatePatronGameLims(
      punterId: PunterEntity.PunterId,
      time: OffsetDateTime = clock.currentOffsetDateTime()): PatronGameLims =
    PatronGameLims(
      punterId = punterId,
      createdAt = time,
      start = randomOffsetDateTime(),
      finish = randomOffsetDateTime(),
      limitType = randomEnumValue[LimitType](),
      limitPeriod = randomOption(randomEnumValue[LimitPeriod]()),
      limitAmount = randomOption(randomNumber(0, BigDecimal(1000000000))))

  def truncateTime(patronGameLims: PatronGameLims): PatronGameLims =
    patronGameLims.copy(
      createdAt = patronGameLims.createdAt.truncatedTo(ChronoUnit.MILLIS),
      start = patronGameLims.start.truncatedTo(ChronoUnit.MILLIS),
      finish = patronGameLims.finish.truncatedTo(ChronoUnit.MILLIS))
}
