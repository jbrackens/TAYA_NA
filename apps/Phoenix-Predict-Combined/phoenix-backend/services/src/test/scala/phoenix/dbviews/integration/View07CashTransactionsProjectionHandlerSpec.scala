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

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.deployment.DeploymentClock
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.dbviews.infrastructure.SlickView07CashTransactionsRepository
import phoenix.dbviews.infrastructure.View07CashTransactionsProjectionHandler
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.wallets.WalletActorProtocol.events.AdjustingFundsDeposited
import phoenix.wallets.WalletActorProtocol.events.AdjustingFundsWithdrawn
import phoenix.wallets.WalletActorProtocol.events.FundsDeposited
import phoenix.wallets.WalletActorProtocol.events.FundsReservedForWithdrawal
import phoenix.wallets.WalletActorProtocol.events.FundsWithdrawn
import phoenix.wallets.WalletActorProtocol.events.TransactionEvent
import phoenix.wallets.WalletActorProtocol.events.WithdrawalCancelled
import phoenix.wallets.WalletActorProtocol.events.WithdrawalConfirmed

class View07CashTransactionsProjectionHandlerSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with BeforeAndAfterEach
    with DatabaseIntegrationSpec {
  import dbConfig.db
  val clock = DeploymentClock.fromConfig(deploymentConfig)
  val repository = new SlickView07CashTransactionsRepository(dbConfig, clock)
  val query = TableQuery[SlickView07CashTransactionsRepository.CashTransactionTable]
  val handler = new View07CashTransactionsProjectionHandler(repository, LoggerFactory.getLogger(getClass()))
  implicit lazy val defaultCurrencyMoneyArbitrary: Arbitrary[DefaultCurrencyMoney] =
    Arbitrary(implicitly[Arbitrary[MoneyAmount]].arbitrary.map(DefaultCurrencyMoney.apply))
  val paymentTransactionGen: Gen[TransactionEvent] = Gen.oneOf(
    implicitly[Arbitrary[AdjustingFundsDeposited]].arbitrary,
    implicitly[Arbitrary[AdjustingFundsWithdrawn]].arbitrary,
    implicitly[Arbitrary[FundsDeposited]].arbitrary,
    implicitly[Arbitrary[FundsWithdrawn]].arbitrary,
    implicitly[Arbitrary[FundsReservedForWithdrawal]].arbitrary,
    implicitly[Arbitrary[WithdrawalCancelled]].arbitrary,
    implicitly[Arbitrary[WithdrawalConfirmed]].arbitrary)

  "View08CashTransactionProjectionHandler" should {
    "handle cash transactions" in {
      val event = paymentTransactionGen.pureApply(Gen.Parameters.default, Seed.random())
      await(handler.process(EventEnvelope.create(NoOffset, "fakePersistenceId", 0, event, 0)))
      val stored = await(db.run(query.result))
      stored.map(_.cashTransaction.punterId) shouldBe List(event.walletId.owner)
    }
  }
  override protected def beforeEach(): Unit = {
    super.beforeEach()
    await(db.run(query.delete))
  }
}
