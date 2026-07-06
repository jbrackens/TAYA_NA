package phoenix.dbviews.integration

import java.time.OffsetDateTime

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike
import slick.lifted.TableQuery

import phoenix.core.Clock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.dbviews.domain.model.AccountStatus
import phoenix.dbviews.domain.model.AccountType
import phoenix.dbviews.domain.model.Adjustment
import phoenix.dbviews.domain.model.ExclusionReason
import phoenix.dbviews.domain.model.PatronStatus
import phoenix.dbviews.infrastructure.SlickView09PatronStatusRepository
import phoenix.punters.PunterEntity
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator._
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport

class SlickView09PatronStatusRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec {
  import dbConfig.db

  val clock = Clock.utcClock
  val repository: SlickView09PatronStatusRepository = new SlickView09PatronStatusRepository(dbConfig)
  val query = TableQuery[SlickView09PatronStatusRepository.PatronStatusTable]

  "SlickView09PatronStatusRepository" should {
    "store daily events" in {
      await(db.run(query.delete))
      val patronStatus1 = generatePatronStatus(PunterEntity.PunterId("aPunter"))
      val patronStatus2 = generatePatronStatus(PunterEntity.PunterId("bPunter"))
      await(repository.upsert(patronStatus1))
      await(repository.upsert(patronStatus2))
      val stored = await(db.run(query.result))
      stored.sortBy(_.punterId.value) shouldBe List(patronStatus1, patronStatus2)
    }
    "store events for the same punter on different days" in {
      await(db.run(query.delete))
      val time = clock.currentOffsetDateTime()
      val patronStatus1 = generatePatronStatus(PunterEntity.PunterId("aPunter"), time)
      val patronStatus2 = generatePatronStatus(PunterEntity.PunterId("aPunter"), time.minusDays(1))
      await(repository.upsert(patronStatus1))
      await(repository.upsert(patronStatus2))
      val stored = await(db.run(query.result))
      stored.sortBy(_.punterId.value) shouldBe List(patronStatus1, patronStatus2)
    }
    "override events for the same punter on the same day" in {
      await(db.run(query.delete))
      val time = clock.currentOffsetDateTime()
      val patronStatus1 = generatePatronStatus(PunterEntity.PunterId("aPunter"), time)
      val patronStatus2 = generatePatronStatus(PunterEntity.PunterId("aPunter"), time)
      await(repository.upsert(patronStatus1))
      await(repository.upsert(patronStatus2))
      val stored = await(db.run(query.result))
      stored.sortBy(_.punterId.value) shouldBe List(patronStatus2)
    }
  }

  def generatePatronStatus(
      punterId: PunterEntity.PunterId,
      time: OffsetDateTime = clock.currentOffsetDateTime()): PatronStatus =
    PatronStatus(
      punterId = punterId,
      reportingDate = time.toLocalDate(),
      accountType = randomEnumValue[AccountType](),
      accountStatus = randomEnumValue[AccountStatus](),
      exclusionReason = randomOption(randomEnumValue[ExclusionReason]()),
      walletBalance = generateMoneyAmount(),
      blockedFunds = randomOption(generateMoneyAmount()),
      fundsOnGame = randomOption(generateMoneyAmount()),
      adjustment = randomOption(Adjustment(generateMoneyAmount(), randomString())))
}
