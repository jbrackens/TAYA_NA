package phoenix.dbviews.infrastructure

import java.time.LocalDate
import java.time.format.DateTimeFormatter

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.lifted.TableQuery
import slick.lifted.Tag

import phoenix.core.currency.MoneyAmount
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.dbviews.domain.model.AccountStatus
import phoenix.dbviews.domain.model.AccountType
import phoenix.dbviews.domain.model.Adjustment
import phoenix.dbviews.domain.model.Constants
import phoenix.dbviews.domain.model.Constants.defaultAmount
import phoenix.dbviews.domain.model.Constants.defaultFailureFlag
import phoenix.dbviews.domain.model.Constants.defaultNonFailureFlag
import phoenix.dbviews.domain.model.ExclusionReason
import phoenix.dbviews.domain.model.PatronStatus
import phoenix.punters.PunterEntity

final class SlickView09PatronStatusRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext) {
  import dbConfig.db
  import SlickView09PatronStatusRepository._
  private val patronStatusQuery: TableQuery[PatronStatusTable] = TableQuery[PatronStatusTable]
  def upsert(patronStatus: PatronStatus): Future[Unit] =
    db.run(patronStatusQuery.insertOrUpdate(patronStatus)).map(_ => ())
  def findLatest(punterId: PunterEntity.PunterId): Future[Option[PatronStatus]] = {
    val query =
      patronStatusQuery.filter(_.patronAccountId === punterId.value).sortBy(_.patronReportingDate.desc).take(1)
    db.run(query.result.headOption)
  }
}

object SlickView09PatronStatusRepository {
  import SlickViewMappers._
  final class PatronStatusTable(tag: Tag) extends Table[PatronStatus](tag, "vNJDGE09PATRONSTATUS") {
    type TableRow = (
        String,
        String,
        String,
        AccountType,
        AccountStatus,
        String,
        Option[ExclusionReason],
        BigDecimal,
        BigDecimal,
        Option[BigDecimal],
        Option[BigDecimal],
        Option[BigDecimal],
        Option[String],
        Option[BigDecimal],
        Option[String])
    def skinName = column[String]("SKIN_NAME")
    def patronAccountId = column[String]("PATRON_ACCOUNT_ID")
    def patronReportingDate = column[String]("PATRON_REPORTING_DATE")
    def accountType = column[AccountType]("ACCOUNT_TYPE")
    def accountStatus = column[AccountStatus]("ACCOUNT_STATUS")
    def exclusionFlag = column[String]("EXCLUSION_FLAG")
    def exclusionDescription = column[Option[ExclusionReason]]("EXCLUSION_DESCRIPTION")
    def walletCashBalance = column[BigDecimal]("WALLET_CASH_BALANCE")
    def walletNonCashBalance = column[BigDecimal]("WALLET_NON_CASH_BALANCE")
    def blockedFunds = column[Option[BigDecimal]]("BLOCKED_FUNDS")
    def fundsOnGame = column[Option[BigDecimal]]("FUNDS_ON_GAME")
    def cashAdjustment = column[Option[BigDecimal]]("CASH_ADJUSTMENT")
    def cashAdjustmentReason = column[Option[String]]("CASH_ADJUSTMENT_REASON")
    def nonCashAdjustment = column[Option[BigDecimal]]("NON_CASH_ADJUSTMENT")
    def nonCashAdjustmentReason = column[Option[String]]("NON_CASH_ADJUSTMENT_REASON")
    def pk = primaryKey("pk_09", (patronAccountId, patronReportingDate))
    override def * : ProvenShape[PatronStatus] =
      (
        skinName,
        patronAccountId,
        patronReportingDate,
        accountType,
        accountStatus,
        exclusionFlag,
        exclusionDescription,
        walletCashBalance,
        walletNonCashBalance,
        blockedFunds,
        fundsOnGame,
        cashAdjustment,
        cashAdjustmentReason,
        nonCashAdjustment,
        nonCashAdjustmentReason) <> (fromTableRow, toTableRow)
    private val datePattern: DateTimeFormatter = DateTimeFormatter.BASIC_ISO_DATE // yyyyMMdd
    private def fromTableRow(row: TableRow): PatronStatus =
      row match {
        case (
              _,
              patronAccountId,
              patronReportingDate,
              accountType,
              accountStatus,
              _,
              exclusionDescription,
              walletCashBalance,
              _,
              blockedFunds,
              fundsOnGame,
              cashAdjustment,
              cashAdjustmentReason,
              _,
              _) =>
          PatronStatus(
            punterId = PunterEntity.PunterId(patronAccountId),
            reportingDate = LocalDate.parse(patronReportingDate, datePattern),
            accountType = accountType,
            accountStatus = accountStatus,
            exclusionReason = exclusionDescription,
            walletBalance = MoneyAmount(walletCashBalance),
            blockedFunds = blockedFunds.map(MoneyAmount(_)),
            fundsOnGame = fundsOnGame.map(MoneyAmount(_)),
            adjustment = cashAdjustment.flatMap(amount =>
              cashAdjustmentReason.map(reason => Adjustment(MoneyAmount(amount), reason))))
      }
    private def toTableRow(patronStatus: PatronStatus): Option[TableRow] =
      Some(
        (
          Constants.skinName,
          patronStatus.punterId.value,
          patronStatus.reportingDate.format(datePattern),
          patronStatus.accountType,
          patronStatus.accountStatus,
          if (patronStatus.exclusionReason.isDefined) defaultFailureFlag else defaultNonFailureFlag,
          patronStatus.exclusionReason,
          patronStatus.walletBalance.amount,
          defaultAmount,
          patronStatus.blockedFunds.map(_.amount),
          patronStatus.fundsOnGame.map(_.amount),
          patronStatus.adjustment.map(_.amount.amount),
          patronStatus.adjustment.map(_.reason),
          None,
          None))
  }
}
