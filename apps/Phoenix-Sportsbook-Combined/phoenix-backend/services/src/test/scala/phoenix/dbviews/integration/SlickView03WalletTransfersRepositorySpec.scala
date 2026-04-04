package phoenix.dbviews.integration

import java.time.temporal.ChronoUnit

import org.scalatest.BeforeAndAfterEach
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike
import slick.lifted.TableQuery

import phoenix.core.Clock
import phoenix.core.deployment.DeploymentClock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.dbviews.domain.model.TransferDescription
import phoenix.dbviews.domain.model.TransferType
import phoenix.dbviews.domain.model.WalletTransfer
import phoenix.dbviews.infrastructure.SlickView03WalletTransfersRepository
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator._
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionId

class SlickView03WalletTransfersRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with BeforeAndAfterEach
    with DatabaseIntegrationSpec {
  import SlickView03WalletTransfersRepository.withEasternTime
  import dbConfig.db

  val clock = Clock.utcClock
  val easternClock = DeploymentClock.fromConfig(deploymentConfig)
  val repository = new SlickView03WalletTransfersRepository(dbConfig, easternClock)
  val query = TableQuery[SlickView03WalletTransfersRepository.WalletTransferTable]

  "SlickView03WalletTransfersRepository" should {
    "store wallet transfers" in {
      //Given
      val transfer1 = generateWalletTransfer()
      val transfer2 = generateWalletTransfer()
      await(repository.upsert(transfer1))
      await(repository.upsert(transfer2))

      //When
      val stored = await(db.run(query.result))

      //Then
      stored should contain theSameElementsAs List(transfer1, transfer2).map(withEasternTime(_, easternClock))
    }

    "update a wallet transfer" in {
      //Given
      val transactionId = randomUUID().toString
      await(repository.upsert(generateWalletTransfer(transactionId)))
      val transfer = generateWalletTransfer(transactionId)
      await(repository.upsert(transfer))

      //When
      val stored = await(db.run(query.result))

      //Then
      stored shouldBe List(transfer).map(withEasternTime(_, easternClock))
    }
  }

  override protected def beforeEach(): Unit = {
    super.beforeEach()
    await(db.run(query.delete))
  }

  def generateWalletTransfer(transactionId: TransactionId = randomUUID().toString): WalletTransfer =
    WalletTransfer(
      punterId = PunterId(randomUUID().toString),
      sessionId = Some(SessionId(randomUUID().toString)),
      transactionId = transactionId,
      timestamp = clock.currentOffsetDateTime().truncatedTo(ChronoUnit.MILLIS),
      transferType = randomEnumValue[TransferType](),
      transferDescription = randomEnumValue[TransferDescription](),
      amount = generateMoneyAmount(),
      gameName = randomOption(randomString()),
      gameVersion = randomOption(randomString()),
      rgsName = randomOption(randomString()))
}
