package phoenix.dbviews.infrastructure

import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import enumeratum.SlickEnumSupport
import slick.ast.BaseTypedType
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.jdbc.JdbcType
import slick.lifted
import slick.lifted._

import phoenix.bets.BetEntity.BetId
import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.AmericanOdds
import phoenix.core.persistence.ExtendedPostgresProfile
import phoenix.dbviews.domain.model.Constants
import phoenix.dbviews.domain.model.SportsWagers
import phoenix.dbviews.domain.model.SportsWagers._
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.punters.PunterEntity.PunterId

class SlickView06SportsWagersRepository(dbConfig: DatabaseConfig[JdbcProfile], easternClock: Clock)(implicit
    ec: ExecutionContext) {
  import SlickView06SportsWagersRepository._
  import dbConfig.db

  def upsert(transaction: SportsWagers.Transaction): Future[Unit] =
    db.run(insertOrUpdate(transaction, easternClock)).map(_ => ())
}

object SlickView06SportsWagersRepository extends SlickEnumSupport {
  override val profile = ExtendedPostgresProfile
  import profile.api._

  val sportsWagersQuery: TableQuery[SportsWagersTable] = lifted.TableQuery[SportsWagersTable]
  private val NoSession = "NOSESSION"
  private val ZeroFeePaid = MoneyAmount.zero.get
  private val dateFormatter = DateTimeFormatter.ofPattern("yyyyMMdd")

  def insertOrUpdate(transaction: SportsWagers.Transaction, easternClock: Clock) = {
    val easternTime = easternClock.adjustToClockZone(transaction.timestamp)
    sportsWagersQuery.insertOrUpdate(
      (
        Constants.skinName,
        Constants.ospName,
        NoSession,
        transaction.punterId,
        transaction.transactionId,
        transaction.timestamp,
        easternTime,
        transaction.transactionType,
        transaction.transactionReason,
        transaction.betId,
        transaction.betId,
        transaction.toWager,
        transaction.toWin,
        transaction.toPay,
        transaction.actualPayout,
        ZeroFeePaid,
        transaction.fixtureId,
        transaction.wagerLeagues,
        WagerType.Straight,
        transaction.wagerStyle,
        transaction.wagerOdds,
        easternTime.toLocalDate.format(dateFormatter)))
  }

  type WagerEventId = FixtureId
  type WagerId = BetId
  type BetslipId = BetId
  type SessionId = String
  type SkinName = String
  type OSPName = String
  type TableRow = (
      SkinName,
      OSPName,
      SessionId,
      PunterId,
      Option[String],
      OffsetDateTime,
      OffsetDateTime,
      TransactionType,
      Option[String],
      BetslipId,
      WagerId,
      MoneyAmount,
      MoneyAmount,
      MoneyAmount,
      Option[MoneyAmount],
      MoneyAmount,
      WagerEventId,
      WagerLeagues,
      WagerType,
      WagerStyle,
      Option[AmericanOdds],
      String)

  val offsetDateTimeColumnMapper: JdbcType[OffsetDateTime] with BaseTypedType[OffsetDateTime] =
    MappedColumnType.base[OffsetDateTime, String](
      _.format(Constants.dateTimePattern),
      OffsetDateTime.parse(_, Constants.dateTimePattern))
  implicit val americanOddsColumnMapper = MappedColumnType.base[AmericanOdds, String](_.value, AmericanOdds(_))
  implicit val punterIdColumnMapper = MappedColumnType.base[PunterId, String](_.value, PunterId(_))
  implicit val betIdColumnMapper = MappedColumnType.base[BetId, String](_.value, BetId(_))
  implicit val fixtureIdColumnMapper = MappedColumnType.base[WagerEventId, String](_.value, FixtureId.unsafeParse)
  implicit val moneyAmountColumnMapper = MappedColumnType.base[MoneyAmount, BigDecimal](_.amount, MoneyAmount(_))
  implicit val sportsWagerTypeMapper: BaseColumnType[WagerType] =
    mappedColumnTypeForEnum(WagerType)
  implicit val sportsWagerTransactionStyleMapper: BaseColumnType[WagerStyle] =
    mappedColumnTypeForEnum(WagerStyle)
  implicit val sportsWagerTransactionTypeMapper: BaseColumnType[TransactionType] =
    mappedColumnTypeForEnum(TransactionType)

  final class SportsWagersTable(tag: Tag) extends Table[TableRow](tag, "vNJDGE06SPORTSWAGERS_t") {
    def skinName = column[SkinName]("SKIN_NAME")
    def ospName = column[OSPName]("OSP_NAME")
    def sessionId = column[SessionId]("SESSION_ID")
    def patronAccountId = column[PunterId]("PATRON_ACCOUNT_ID")
    def transactionId = column[Option[String]]("TRANSACTION_ID")
    def transactionTimeSystem = column[OffsetDateTime]("TRANSACTIONTIME_SYSTEM")(offsetDateTimeColumnMapper)
    def transactionTimeEastern = column[OffsetDateTime]("TRANSACTIONTIME_EASTERN")(offsetDateTimeColumnMapper)
    def transactionType = column[TransactionType]("TRANSACTION_TYPE")
    def transactionReason = column[Option[String]]("TRANSACTION_REASON")
    def sportsBetslipId = column[BetId]("SPORTS_BETSLIP_ID")
    def sportsWagerId = column[BetId]("SPORTS_WAGER_ID")
    def toWager = column[MoneyAmount]("TO_WAGER")
    def toWin = column[MoneyAmount]("TO_WIN")
    def toPay = column[MoneyAmount]("TO_PAY")
    def actualPayout = column[Option[MoneyAmount]]("ACTUAL_PAYOUT")
    def feePaid = column[MoneyAmount]("FEE_PAID")
    def sportsWagerEventId = column[WagerEventId]("SPORTS_WAGER_EVENT_ID")
    def sportsWagerLeagues = column[WagerLeagues]("SPORTS_WAGER_LEAGUES")
    def sportsWagerType = column[WagerType]("SPORTS_WAGER_TYPE")
    def sportsWagerStyle = column[WagerStyle]("SPORTS_WAGER_STYLE")
    def sportsWagerOdds = column[Option[AmericanOdds]]("SPORTS_WAGER_ODDS")
    def transactionDate = column[String]("TRANSACTION_DATE")

    def pk = primaryKey("pk_06", (transactionDate, sportsWagerId))

    override def * : ProvenShape[TableRow] =
      (
        skinName,
        ospName,
        sessionId,
        patronAccountId,
        transactionId,
        transactionTimeSystem,
        transactionTimeEastern,
        transactionType,
        transactionReason,
        sportsBetslipId,
        sportsWagerId,
        toWager,
        toWin,
        toPay,
        actualPayout,
        feePaid,
        sportsWagerEventId,
        sportsWagerLeagues,
        sportsWagerType,
        sportsWagerStyle,
        sportsWagerOdds,
        transactionDate)
  }

}
