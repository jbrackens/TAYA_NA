package phoenix.dbviews.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.lifted.TableQuery
import slick.lifted.Tag

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.dbviews.domain.model.Constants.dateTimePattern
import phoenix.dbviews.domain.model.Constants.defaultNonFailureFlag
import phoenix.dbviews.domain.model._
import phoenix.dbviews.infrastructure.SlickView03WalletTransfersRepository.WalletTransferTable
import phoenix.dbviews.infrastructure.SlickView03WalletTransfersRepository.withEasternTime
import phoenix.punters.PunterEntity
import phoenix.punters.PuntersBoundedContext.SessionId

class SlickView03WalletTransfersRepository(dbConfig: DatabaseConfig[JdbcProfile], easternClock: Clock)(implicit
    ec: ExecutionContext) {
  import dbConfig.db
  private val walletTransferQuery: TableQuery[WalletTransferTable] = TableQuery[WalletTransferTable]
  def upsert(walletTransfer: WalletTransfer): Future[Unit] =
    db.run(walletTransferQuery.insertOrUpdate(withEasternTime(walletTransfer, easternClock))).map(_ => ())
}

object SlickView03WalletTransfersRepository {
  private val NoSession = "NOSESSION"
  import SlickViewMappers._
  final case class WalletTransferWithEasternTime(walletTransfer: WalletTransfer, timestamp: OffsetDateTime)
  def withEasternTime(walletTransfer: WalletTransfer, easternClock: Clock): WalletTransferWithEasternTime =
    WalletTransferWithEasternTime(
      walletTransfer = walletTransfer,
      timestamp = easternClock.adjustToClockZone(walletTransfer.timestamp))

  final class WalletTransferTable(tag: Tag)
      extends Table[WalletTransferWithEasternTime](tag, "vNJDGE03WALLETTRANSFERS") {
    type TableRow = (
        String,
        String,
        String,
        String,
        String,
        String,
        String,
        TransferType,
        TransferDescription,
        BigDecimal,
        Option[GameType],
        Option[String],
        Option[String],
        Option[String])

    def skinName = column[String]("SKIN_NAME")
    def patronAccountId = column[String]("PATRON_ACCOUNT_ID")
    def sessionId = column[String]("SESSION_ID")
    def walletTransactionId = column[String]("WALLET_TRANSACTION_ID")
    def transactionFailureIndicator = column[String]("TRANSACTION_FAILURE_INDICATOR")
    def transferTimeSystem = column[String]("TRANSFERTIME_SYSTEM")
    def transferTimeEastern = column[String]("TRANSFERTIME_EASTERN")
    def walletTransferType = column[TransferType]("WALLET_TRANSFER_TYPE")
    def walletTransferDescription = column[TransferDescription]("WALLET_TRANSFER_DESCRIPTION")
    def amount = column[BigDecimal]("AMOUNT")
    def gameType = column[Option[GameType]]("GAME_TYPE")
    def gameName = column[Option[String]]("GAME_NAME")
    def gameVersion = column[Option[String]]("GAME_VERSION")
    def rgsName = column[Option[String]]("RGS_NAME")
    def pk = primaryKey("pk_03", walletTransactionId)

    override def * : ProvenShape[WalletTransferWithEasternTime] =
      (
        skinName,
        patronAccountId,
        sessionId,
        walletTransactionId,
        transactionFailureIndicator,
        transferTimeSystem,
        transferTimeEastern,
        walletTransferType,
        walletTransferDescription,
        amount,
        gameType,
        gameName,
        gameVersion,
        rgsName) <> (fromTableRow, toTableRow)

    private def fromTableRow(row: TableRow): WalletTransferWithEasternTime =
      row match {
        case (
              _,
              patronAccountId,
              sessionId,
              walletTransactionId,
              _,
              timeSystem,
              timeEastern,
              walletTransferType,
              walletTransferDescription,
              amount,
              _,
              gameName,
              gameVersion,
              rgsName) =>
          WalletTransferWithEasternTime(
            walletTransfer = WalletTransfer(
              punterId = PunterEntity.PunterId(patronAccountId),
              sessionId = if (sessionId == NoSession) None else Some(SessionId(sessionId)),
              transactionId = walletTransactionId,
              timestamp = OffsetDateTime.parse(timeSystem, dateTimePattern),
              transferType = walletTransferType,
              transferDescription = walletTransferDescription,
              amount = MoneyAmount(amount),
              gameName = gameName,
              gameVersion = gameVersion,
              rgsName = rgsName),
            timestamp = OffsetDateTime.parse(timeEastern, dateTimePattern))
      }

    private def toTableRow(transferWithEasternTime: WalletTransferWithEasternTime): Option[TableRow] = {
      val transfer = transferWithEasternTime.walletTransfer
      Some(
        (
          Constants.skinName,
          transfer.punterId.value,
          transfer.sessionId.fold(NoSession)(_.value),
          transfer.transactionId,
          defaultNonFailureFlag,
          transfer.timestamp.format(dateTimePattern),
          transferWithEasternTime.timestamp.format(dateTimePattern),
          transfer.transferType,
          transfer.transferDescription,
          transfer.amount.amount,
          Some(GameType.SportsBook),
          transfer.gameName,
          transfer.gameVersion,
          transfer.rgsName))
    }
  }
}
