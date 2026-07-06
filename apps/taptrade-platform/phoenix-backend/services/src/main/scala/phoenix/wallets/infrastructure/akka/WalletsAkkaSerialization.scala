package phoenix.wallets.infrastructure.akka

import java.util.UUID

import io.circe.Codec
import io.circe.Json
import io.circe.generic.semiauto._
import org.virtuslab.ash.annotation.SerializabilityTrait
import org.virtuslab.ash.annotation.Serializer
import org.virtuslab.ash.circe.Register
import org.virtuslab.ash.circe.Registration

import phoenix.CirceAkkaSerializable
import phoenix.bets.BetEntity.BetId
import phoenix.core.currency.JsonFormats
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.core.currency.Zero
import phoenix.core.odds.Odds
import phoenix.core.serialization.CirceMigration.ChangeOptionalToComputedRequired
import phoenix.core.serialization.CirceMigration.RenameField
import phoenix.core.serialization.CirceMigrations
import phoenix.core.serialization.PhoenixAkkaSerialization
import phoenix.core.serialization.PhoenixCodecs
import phoenix.core.serialization.deriveCodecWithMigrations
import phoenix.punters.PunterEntity.AdminId
import phoenix.wallets.WalletActorProtocol.Responses.WalletResponse
import phoenix.wallets.WalletActorProtocol.commands.WalletCommand
import phoenix.wallets.WalletActorProtocol.events.BetResettled
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletState.WalletState
import phoenix.wallets.WalletsBoundedContextProtocol.AccountBalance
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.Bet
import phoenix.wallets.WalletsBoundedContextProtocol.BlockedFunds
import phoenix.wallets.WalletsBoundedContextProtocol.ConfirmationOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.RejectionOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalReservation
import phoenix.wallets.domain.Deposit
import phoenix.wallets.domain.DepositHistory
import phoenix.wallets.domain.Funds
import phoenix.wallets.domain.Funds.BonusFunds
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod
import phoenix.wallets.domain.ResponsibilityCheckStatus

@SerializabilityTrait
trait WalletsAkkaSerializable extends CirceAkkaSerializable

@Serializer(classOf[WalletsAkkaSerializable], Register.REGISTRATION_REGEX)
object WalletsAkkaSerialization extends PhoenixAkkaSerialization[WalletsAkkaSerializable] with PhoenixCodecs {
  import WalletsAkkaSerializationMigrations._

  private implicit lazy val moneyAmountCodec: Codec[MoneyAmount] = deriveCodec
  private implicit def positiveAmountCodec[T: Zero: Ordering: Codec]: Codec[PositiveAmount[T]] =
    JsonFormats.positiveAmountCodec
  private implicit lazy val walletIdCodec: Codec[WalletId] = deriveCodec
  private implicit lazy val realMoneyCodec: Codec[RealMoney] = deriveCodec
  private implicit lazy val bonusFundsCodec: Codec[BonusFunds] = deriveCodec
  private implicit lazy val fundsCodec: Codec[Funds] = deriveCodec
  private implicit lazy val balanceCodec: Codec[Balance] = deriveCodec
  private implicit lazy val depositCodec: Codec[Deposit] = deriveCodec
  private implicit lazy val depositHistoryCodec: Codec[DepositHistory] = deriveCodec
  private implicit lazy val responsibilityCheckStatusCodec: Codec[ResponsibilityCheckStatus] = deriveCodec
  private implicit lazy val reservationIdCodec: Codec[ReservationId] = deriveCodec
  private implicit lazy val adminIdCodec: Codec[AdminId] = deriveCodec
  private implicit lazy val paymentMethodCodec: Codec[PaymentMethod] = deriveCodec
  private implicit lazy val blockedFundsCodec: Codec[BlockedFunds] = deriveCodec
  private implicit lazy val accountBalanceCodec: Codec[AccountBalance] = deriveCodec
  private implicit lazy val withdrawalReservationCodec: Codec[WithdrawalReservation] = deriveCodec
  private implicit lazy val confirmationOriginCodec: Codec[ConfirmationOrigin] = deriveCodec
  private implicit lazy val rejectionOriginCodec: Codec[RejectionOrigin] = deriveCodec
  private implicit lazy val betIdCodec: Codec[BetId] = deriveCodec
  private implicit lazy val oddsCodec: Codec[Odds] = deriveCodec
  private implicit lazy val betCodec: Codec[Bet] = deriveCodec

  private implicit lazy val walletResponseCodec: Codec[WalletResponse] = deriveCodec
  // it has to def, because WalletCommand contains ActorRef
  private implicit def walletCommandCodec: Codec[WalletCommand] = deriveCodec
  private implicit lazy val betResettledCodec: Codec[BetResettled] = deriveCodecWithMigrations
  private implicit lazy val walletEventCodec: Codec[WalletEvent] = deriveCodecWithMigrations
  private implicit lazy val walletStateCodec: Codec[WalletState] = deriveCodec

  override def codecEntries: Seq[Registration[_ <: WalletsAkkaSerializable]] =
    Seq(Register[WalletResponse], Register[WalletCommand], Register[WalletEvent], Register[WalletState])
}
object WalletsAkkaSerializationMigrations {
  private def createdAtToTransactionId(obj: Json): Json =
    Json.fromString(UUID.nameUUIDFromBytes((obj \\ "createdAt")(0).asString.get.getBytes).toString)
  implicit val negativeBalanceMigration: CirceMigrations[WalletEvent] =
    CirceMigrations(RenameField("SuspendedForNegativeBalance", "NegativeBalance"))
  implicit val resettledTransactionIdMigration: CirceMigrations[BetResettled] =
    CirceMigrations(ChangeOptionalToComputedRequired("transactionId", createdAtToTransactionId))
}
