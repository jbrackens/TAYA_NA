package phoenix.dbviews.integration

import java.time.OffsetDateTime
import java.time.temporal.ChronoUnit

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike
import slick.lifted.TableQuery

import phoenix.core.Clock
import phoenix.core.deployment.DeploymentClock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.dbviews.domain.model._
import phoenix.dbviews.infrastructure.SlickView02PatronSessionsRepository
import phoenix.dbviews.infrastructure.SlickView02PatronSessionsRepository.PatronSessionWithEasternTime.withEasternTime
import phoenix.punters.PunterDataGenerator.Api.generateSessionId
import phoenix.punters.PunterDataGenerator.generateIpAddress
import phoenix.punters.PunterEntity
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport

class SlickView02PatronSessionsRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec {
  import dbConfig.db

  val clock = Clock.utcClock
  val easternClock = DeploymentClock.fromConfig(deploymentConfig)
  val repository: SlickView02PatronSessionsRepository = new SlickView02PatronSessionsRepository(dbConfig, easternClock)
  val query = TableQuery[SlickView02PatronSessionsRepository.PatronSessionsTable]

  "SlickView02PatronSessionsRepository" should {
    "store sessions" in {
      await(db.run(query.delete))
      val loginTime1 = clock.currentOffsetDateTime()
      val loginTime2 = clock.currentOffsetDateTime()
      val patronSession1 = generatePatronSession(PunterEntity.PunterId("aPunter"), loginTime1)
      val patronSession2 = generatePatronSession(PunterEntity.PunterId("bPunter"), loginTime2)
      await(repository.upsert(patronSession1))
      await(repository.upsert(patronSession2))
      val stored = await(db.run(query.result))
      stored.sortBy(_.patronSession.punterId.value) shouldBe List(patronSession1, patronSession2)
        .map(truncateTime)
        .map(withEasternTime(_, easternClock))
    }
    "override sessions for the same punter on the same day" in {
      await(db.run(query.delete))
      val loginTime1 = clock.currentOffsetDateTime()
      val logoutTime = clock.currentOffsetDateTime()
      val patronSession1 = generatePatronSession(PunterEntity.PunterId("aPunter"), loginTime1)
      val patronSession2 = patronSession1.copy(logoutTime = Some(logoutTime))
      await(repository.upsert(patronSession1))
      await(repository.upsert(patronSession2))
      val stored = await(db.run(query.result))
      stored.sortBy(_.patronSession.punterId.value) shouldBe List(patronSession2)
        .map(truncateTime)
        .map(withEasternTime(_, easternClock))
    }
  }

  def truncateTime(patronSession: PatronSession): PatronSession =
    patronSession.copy(
      loginTime = patronSession.loginTime.truncatedTo(ChronoUnit.MILLIS),
      logoutTime = patronSession.logoutTime.map(_.truncatedTo(ChronoUnit.MILLIS)))

  def generatePatronSession(
      punterId: PunterEntity.PunterId,
      loginTime: OffsetDateTime,
      logoutTime: Option[OffsetDateTime] = None): PatronSession =
    PatronSession(
      punterId = punterId,
      sessionId = generateSessionId(),
      loginTime = loginTime,
      logoutTime = logoutTime,
      ipAddress = generateIpAddress())
}
