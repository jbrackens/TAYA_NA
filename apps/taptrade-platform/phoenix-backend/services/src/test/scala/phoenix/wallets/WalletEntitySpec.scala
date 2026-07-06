package phoenix.wallets
import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.persistence.testkit.scaladsl.EventSourcedBehaviorTestKit
import com.typesafe.config
import org.scalatest.BeforeAndAfterEach
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec
import phoenix.wallets.WalletActorProtocol.Responses.Success.BalanceCheckForSuspendAcceptedResponse
import phoenix.wallets.WalletActorProtocol.commands.CheckBalanceForSuspend
import phoenix.wallets.WalletActorProtocol.commands.CreateWallet
import phoenix.wallets.WalletActorProtocol.commands.WalletCommand
import phoenix.wallets.WalletActorProtocol.events.NegativeBalance
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletState.WalletState
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.support.WalletsDataGenerator

class WalletEntitySpec
    extends ScalaTestWithActorTestKit(
      EventSourcedBehaviorTestKit.config.withFallback(
        config.ConfigFactory.parseString(PhoenixCirceAkkaSerializerSpec.config)))
    with AnyWordSpecLike
    with BeforeAndAfterEach {

  private val clock: Clock = Clock.utcClock
  private val walletId: WalletId = WalletsDataGenerator.generateWalletId()
  private val eventSourcedTestKit =
    EventSourcedBehaviorTestKit[WalletCommand, WalletEvent, WalletState](system, WalletEntity(walletId)(clock))

  override def beforeEach(): Unit = {
    super.beforeEach()
    eventSourcedTestKit.clear()
  }

  "WalletEntity" should {
    "trigger a suspend event when executing CheckBalanceForSuspend with a negative balance" in {
      initializeWalletBalance(BigDecimal(-10))
      val result = eventSourcedTestKit.runCommand(CheckBalanceForSuspend(walletId, _))

      result.reply shouldBe BalanceCheckForSuspendAcceptedResponse
      result.events shouldBe Seq(NegativeBalance(walletId))
    }

    "not trigger a suspend event when executing CheckBalanceForSuspend with a positive balance" in {
      initializeWalletBalance(BigDecimal(10))
      val result = eventSourcedTestKit.runCommand(CheckBalanceForSuspend(walletId, _))

      result.reply shouldBe BalanceCheckForSuspendAcceptedResponse
      result.events shouldBe Seq.empty
    }

    "not trigger a suspend event when executing CheckBalanceForSuspend with a zero balance" in {
      initializeWalletBalance(BigDecimal(0))
      val result = eventSourcedTestKit.runCommand(CheckBalanceForSuspend(walletId, _))

      result.reply shouldBe BalanceCheckForSuspendAcceptedResponse
      result.events shouldBe Seq.empty
    }
  }

  private def initializeWalletBalance(amount: BigDecimal) = {
    val balance = Balance(RealMoney(DefaultCurrencyMoney(amount)))
    eventSourcedTestKit.runCommand(CreateWallet(walletId, balance, _))
  }
}
