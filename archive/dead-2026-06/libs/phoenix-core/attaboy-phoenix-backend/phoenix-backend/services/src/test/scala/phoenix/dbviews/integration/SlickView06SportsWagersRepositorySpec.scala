package phoenix.dbviews.integration

import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

import org.scalatest.BeforeAndAfterEach
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetEntity.BetId
import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.core.deployment.DeploymentClock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.dbviews.domain.model.Constants
import phoenix.dbviews.domain.model.SportsWagers
import phoenix.dbviews.domain.model.SportsWagers._
import phoenix.dbviews.infrastructure.SlickView06SportsWagersRepository
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.generateFixtureId
import phoenix.support.DataGenerator.generateMoneyAmount
import phoenix.support.DataGenerator.generateOdds
import phoenix.support.DataGenerator.randomEnumValue
import phoenix.support.DataGenerator.randomOption
import phoenix.support.DataGenerator.randomString
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport

class SlickView06SportsWagersRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with BeforeAndAfterEach
    with DatabaseIntegrationSpec {

  import SlickView06SportsWagersRepository._
  import dbConfig.db

  val dateFormatter = DateTimeFormatter.ofPattern("yyyyMMdd")
  val clock = Clock.utcClock
  val easternClock = DeploymentClock.fromConfig(deploymentConfig)
  val repository = new SlickView06SportsWagersRepository(dbConfig, easternClock)
  val query = sportsWagersQuery

  "SlickView06SportsWagersTransactionsRepository" should {
    "store transactions" in {
      //Given
      val transaction1 = generateSportsWagersTransaction()
      val transaction2 = generateSportsWagersTransaction()

      await(repository.upsert(transaction1))
      await(repository.upsert(transaction2))
      //When
      val stored = await(db.run(query.result))
      //Then
      stored should contain theSameElementsAs List(transaction1, transaction2).map(toTableRow)
    }

    "update a transaction when both sportsWagerId and timestamp are the same" in {
      //Given
      val sportsWagerId = BetId.random()
      val timestamp = clock.currentOffsetDateTime()
      await(repository.upsert(generateSportsWagersTransaction(sportsWagerId, timestamp)))
      val transaction = generateSportsWagersTransaction(sportsWagerId, timestamp)
      await(repository.upsert(transaction))
      //When
      val stored = await(db.run(query.result))
      //Then
      stored shouldBe List(toTableRow(transaction))
    }

    "insert a new transaction when sportsWagerId is the same but timestamp is on different day" in {
      //Given
      val sportsWagerId1 = BetId.random()
      val sportsWagerId2 = BetId.random()
      val timestampDay1 = clock.currentOffsetDateTime()
      val timestampDay2 = timestampDay1.plusDays(1)
      val transaction1 = generateSportsWagersTransaction(sportsWagerId1, timestampDay1)
      val transaction2 = generateSportsWagersTransaction(sportsWagerId1, timestampDay2)
      val transaction3 = generateSportsWagersTransaction(sportsWagerId2, timestampDay1)
      await(repository.upsert(transaction1))
      await(repository.upsert(transaction2))
      await(repository.upsert(transaction3))
      //When
      val stored = await(db.run(query.result))
      //Then
      stored shouldBe List(transaction1, transaction2, transaction3).map(toTableRow)
    }
  }

  override protected def beforeEach(): Unit = {
    super.beforeEach()
    await(db.run(query.delete))
  }

  def generateSportsWagersTransaction(
      sportsWagerId: BetId = BetId.random(),
      timestamp: OffsetDateTime = clock.currentOffsetDateTime()): SportsWagers.Transaction =
    SportsWagers.Transaction(
      betId = sportsWagerId,
      fixtureId = generateFixtureId(),
      punterId = generatePunterId(),
      transactionId = randomOption(randomString()),
      timestamp = timestamp.truncatedTo(ChronoUnit.MILLIS),
      transactionType = randomEnumValue[TransactionType](),
      transactionReason = randomOption(randomString()),
      toWager = generateMoneyAmount(),
      toWin = generateMoneyAmount(),
      toPay = generateMoneyAmount(),
      actualPayout = randomOption(generateMoneyAmount()),
      wagerLeagues = randomString(),
      wagerStyle = randomEnumValue[WagerStyle](),
      wagerOdds = randomOption(generateOdds().toAmericanOdds))

  def truncateTime(transaction: SportsWagers.Transaction): SportsWagers.Transaction =
    transaction.copy(timestamp = transaction.timestamp.truncatedTo(ChronoUnit.MILLIS))

  def toTableRow(t: SportsWagers.Transaction): TableRow =
    (
      Constants.skinName,
      Constants.ospName,
      "NOSESSION",
      t.punterId,
      t.transactionId,
      t.timestamp,
      easternClock.adjustToClockZone(t.timestamp),
      t.transactionType,
      t.transactionReason,
      t.betId,
      t.betId,
      t.toWager,
      t.toWin,
      t.toPay,
      t.actualPayout,
      MoneyAmount.zero.get,
      t.fixtureId,
      t.wagerLeagues,
      WagerType.Straight,
      t.wagerStyle,
      t.wagerOdds,
      t.timestamp.format(dateFormatter))

}
