package phoenix.wallets.acceptance

import akka.stream.testkit.scaladsl.TestSink
import org.scalatest.GivenWhenThen
import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.time.Minutes
import org.scalatest.time.Seconds
import org.scalatest.time.Span
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.punters.PunterEntity.AdminId
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.KeycloakIntegrationSpec
import phoenix.support.ProductionLikeEnvironment
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.ConfirmationOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.RejectionOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalOutcome
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalReservation
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod
import phoenix.wallets.domain.WalletStateUpdate

class WalletsWebsocketEventStreamAcceptanceSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec
    with Eventually
    with GivenWhenThen {

  override implicit val patienceConfig: PatienceConfig =
    PatienceConfig.apply(timeout = Span(2, Minutes), interval = Span(5, Seconds))

  val env = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)

  "A Wallet" should {

    "emit an update when a deposit is received" in {

      Given("a Wallet")
      val punter = env.punterScenarios.punterWithRegisteredUserAndWallet(DefaultCurrencyMoney(BigDecimal(8.63)))

      When("a deposit is received")
      val walletEventsStream = eventually {
        await(env.walletEventStreams.streamStateUpdates(punter.walletId))
      }
      awaitRight(
        env.walletsBC.deposit(
          punter.walletId,
          PositiveAmount.ensure(RealMoney(21.37)).unsafe(),
          CreditFundsReason.Deposit,
          PaymentMethod.CreditCardPaymentMethod))

      Then("the update is received on the socket")
      val probe = TestSink[WalletStateUpdate]()(system.classicSystem)
      val events = walletEventsStream.runWith(probe)
      val expectedEvent =
        WalletStateUpdate(punter.walletId, Balance(RealMoney(DefaultCurrencyMoney(BigDecimal(30.00))), Seq.empty))

      events.ensureSubscription()
      events.request(1).expectNext(expectedEvent)
    }

    "emit an update when a withdrawal is cancelled" in {
      Given("a wallet")
      val punter = env.punterScenarios.punterWithRegisteredUserAndWallet(DefaultCurrencyMoney(BigDecimal(10)))

      And("a websocket connection")
      val walletEventStream = eventually {
        await(env.walletEventStreams.streamStateUpdates(punter.walletId))
      }
      val probe = TestSink[WalletStateUpdate]()(system.classicSystem)
      val events = walletEventStream.runWith(probe)
      events.ensureSubscription()

      When("a withdrawal is requested")
      awaitRight(
        env.walletsBC.reserveForWithdrawal(
          punter.walletId,
          WithdrawalReservation(
            ReservationId("reservation"),
            PositiveAmount(RealMoney(BigDecimal(5))),
            PaymentMethod.CashWithdrawalPaymentMethod)))

      Then("the update is received on the websocket")
      val requestedEvent = WalletStateUpdate(punter.walletId, Balance(RealMoney(DefaultCurrencyMoney(BigDecimal(5)))))

      events.request(1).expectNext(requestedEvent)

      When("a withdrawal is cancelled")
      awaitRight(
        env.walletsBC.finalizeWithdrawal(
          punter.walletId,
          ReservationId("reservation"),
          WithdrawalOutcome.Rejected(
            RejectionOrigin.BackofficeWorker(AdminId.fromPunterId(punter.punterId), "reason"))))

      Then("the update is received on the websocket")
      val confirmedEvent = WalletStateUpdate(punter.walletId, Balance(RealMoney(DefaultCurrencyMoney(BigDecimal(10)))))

      events.request(1).expectNext(confirmedEvent)
    }

    "emit an update when a withdrawal is confirmed" in {
      Given("a wallet")
      val punter = env.punterScenarios.punterWithRegisteredUserAndWallet(DefaultCurrencyMoney(BigDecimal(10)))

      And("a websocket connection")
      val walletEventStream = eventually {
        await(env.walletEventStreams.streamStateUpdates(punter.walletId))
      }
      val probe = TestSink[WalletStateUpdate]()(system.classicSystem)
      val events = walletEventStream.runWith(probe)
      events.ensureSubscription()

      When("a withdrawal is requested")
      awaitRight(
        env.walletsBC.reserveForWithdrawal(
          punter.walletId,
          WithdrawalReservation(
            ReservationId("reservation"),
            PositiveAmount(RealMoney(BigDecimal(5))),
            PaymentMethod.CashWithdrawalPaymentMethod)))

      Then("the update is received on the websocket")
      val requestedEvent = WalletStateUpdate(punter.walletId, Balance(RealMoney(DefaultCurrencyMoney(BigDecimal(5)))))

      events.request(1).expectNext(requestedEvent)

      When("a withdrawal is confirmed")
      awaitRight(
        env.walletsBC.finalizeWithdrawal(
          punter.walletId,
          ReservationId("reservation"),
          WithdrawalOutcome.Confirmed(ConfirmationOrigin.BackofficeWorker(AdminId.fromPunterId(punter.punterId)))))

      Then("the update is received on the websocket")
      val confirmedEvent = WalletStateUpdate(punter.walletId, Balance(RealMoney(DefaultCurrencyMoney(BigDecimal(5)))))

      events.request(1).expectNext(confirmedEvent)
    }
  }
}
