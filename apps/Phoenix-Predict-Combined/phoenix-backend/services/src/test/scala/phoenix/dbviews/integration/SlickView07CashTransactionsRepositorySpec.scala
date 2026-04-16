package phoenix.dbviews.integration

import java.time.temporal.ChronoUnit

import org.scalatest.BeforeAndAfterEach
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike
import slick.lifted.TableQuery

import phoenix.core.Clock
import phoenix.core.deployment.DeploymentClock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.dbviews.domain.model.CashTransaction
import phoenix.dbviews.domain.model.TransactionDescription
import phoenix.dbviews.domain.model.TransactionProvider
import phoenix.dbviews.domain.model.TransactionSource
import phoenix.dbviews.domain.model.TransactionType
import phoenix.dbviews.infrastructure.SlickView07CashTransactionsRepository
import phoenix.punters.PunterEntity.PunterId
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.generateMoneyAmount
import phoenix.support.DataGenerator.randomEnumValue
import phoenix.support.DataGenerator.randomOption
import phoenix.support.DataGenerator.randomUUID
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionId

class SlickView07CashTransactionsRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with BeforeAndAfterEach
    with DatabaseIntegrationSpec {

  import dbConfig.db
  import SlickView07CashTransactionsRepository._

  val clock = Clock.utcClock
  val easternClock = DeploymentClock.fromConfig(deploymentConfig)
  val repository = new SlickView07CashTransactionsRepository(dbConfig, easternClock)
  val query = TableQuery[CashTransactionTable]

  "SlickView07CashTransactionsRepository" should {
    "store cash transactions" in {
      //Given
      val transaction1 = generateCashTransaction()
      val transaction2 = generateCashTransaction()
      await(repository.upsert(transaction1))
      await(repository.upsert(transaction2))

      //When
      val stored = await(db.run(query.result))

      //Then
      stored should contain theSameElementsAs List(transaction1, transaction2).map(withEasternTime(_, easternClock))
    }

    "update a cash transaction" in {
      //Given
      val transactionId = randomUUID().toString
      await(repository.upsert(generateCashTransaction(transactionId)))
      val transaction = generateCashTransaction(transactionId)
      await(repository.upsert(transaction))

      //When
      val stored = await(db.run(query.result))

      //Then
      stored shouldBe List(transaction).map(withEasternTime(_, easternClock))
    }
  }

  override protected def beforeEach(): Unit = {
    super.beforeEach()
    await(db.run(query.delete))
  }

  def generateCashTransaction(transactionId: TransactionId = randomUUID().toString): CashTransaction =
    CashTransaction(
      punterId = PunterId(randomUUID().toString),
      transactionId = transactionId,
      timestamp = clock.currentOffsetDateTime().truncatedTo(ChronoUnit.MILLIS),
      transactionType = randomEnumValue[TransactionType](),
      description = randomEnumValue[TransactionDescription](),
      amount = generateMoneyAmount(),
      requestedAmount = generateMoneyAmount(),
      source = randomOption(randomEnumValue[TransactionSource]()),
      provider = randomOption(randomEnumValue[TransactionProvider]()))
}
