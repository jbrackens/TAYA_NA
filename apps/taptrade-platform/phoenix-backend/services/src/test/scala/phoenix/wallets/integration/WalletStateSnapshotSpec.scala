// because we unfortunately need to mess around with akka internals here
package akka.persistence.phoenix.wallets.integration
import java.util.NoSuchElementException

import scala.concurrent.Future
import scala.concurrent.duration._

import akka.pattern.ask
import akka.persistence.Persistence
import akka.persistence.SnapshotMetadata
import akka.persistence.SnapshotProtocol.LoadSnapshot
import akka.persistence.SnapshotProtocol.LoadSnapshotResult
import akka.persistence.SnapshotProtocol.SaveSnapshot
import akka.persistence.SnapshotSelectionCriteria
import akka.util.Timeout
import cats.syntax.functor._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.currency.PositiveAmount
import phoenix.core.odds.Odds
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.generateBetId
import phoenix.support.DataGenerator.generateReservationId
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.wallets.WalletState
import phoenix.wallets.WalletState.ActiveWallet
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.Bet
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalReservation
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod.CreditCardPaymentMethod
import phoenix.wallets.support.WalletsDataGenerator.generateWalletId

final class WalletStateSnapshotSpec
    extends AnyWordSpec
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with Matchers
    with FutureSupport {

  implicit val timeout: Timeout = Timeout(30.seconds)

  "should properly serialize and deserialize wallet state" in {
    // given
    val activeWallet = WalletState
      .initial(generateWalletId(), Balance(RealMoney(2137)))
      .reserveFunds(
        WithdrawalReservation(
          generateReservationId(),
          funds = PositiveAmount.ensure(RealMoney(100)).unsafe(),
          paymentMethod = CreditCardPaymentMethod))
      .reserveFunds(generateReservationId(), Bet(generateBetId(), stake = RealMoney(1), odds = Odds(1.2)))

    // and
    await(saveSnapshot(activeWallet))

    // when
    val recoveredFromSnapshot = await(loadRecentSnapshot(activeWallet.walletId))

    // then
    recoveredFromSnapshot shouldBe activeWallet
  }

  private def saveSnapshot(walletState: ActiveWallet): Future[Unit] = {
    val saveSnapshotCommand =
      SaveSnapshot(
        SnapshotMetadata(
          persistenceId = persistenceId(walletState.walletId),
          sequenceNr = 2137,
          timestamp = System.currentTimeMillis(),
          meta = None),
        walletState)

    snapshotStore.ask(saveSnapshotCommand).void
  }

  private def loadRecentSnapshot(walletId: WalletId): Future[ActiveWallet] = {
    val loadSnapshotCommand =
      LoadSnapshot(
        persistenceId = persistenceId(walletId),
        criteria = SnapshotSelectionCriteria.Latest,
        toSequenceNr = Long.MaxValue)

    snapshotStore.ask(loadSnapshotCommand).flatMap {
      case LoadSnapshotResult(Some(result), _) => Future { result.snapshot.asInstanceOf[ActiveWallet] }
      case _                                   => Future.failed(new NoSuchElementException(s"Missing snapshot for [walletId = $walletId]"))
    }
  }

  private def persistenceId(walletId: WalletId): String = s"Wallet~${walletId.value}"
  private lazy val snapshotStore = Persistence.get(system).snapshotStoreFor("jdbc-snapshot-store")
}
