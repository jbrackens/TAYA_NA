package phoenix.dbviews.domain.model

import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.Uppercase

import phoenix.bets.BetEntity.BetId
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.AmericanOdds
import phoenix.core.validation.Validation.Validation
import phoenix.http.core.IpAddress
import phoenix.markets.MarketCategory
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.punters.PunterEntity
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.Country
import phoenix.punters.domain.DUPI
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.Gender
import phoenix.punters.domain.PunterPersonalDetails
import phoenix.punters.domain.State
import phoenix.punters.domain.Zipcode
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionId

object Constants {
  val skinName = "Phoenix"
  val ospName = skinName.toUpperCase
  val defaultFailureFlag = "Y"
  val defaultNonFailureFlag = "N"
  val defaultAmount = BigDecimal(0)
  val dateTimePattern = DateTimeFormatter.ofPattern("yyyyMMdd HHmmss.SSS xxx")
  val dateOfBirthPattern = DateTimeFormatter.ofPattern("yyyyMMdd")
  def parseGender(gender: String): Gender =
    gender match {
      case "M" => Gender.Male
      case "F" => Gender.Female
      case "O" => Gender.Other
    }
  def formatGender(gender: Gender): String =
    gender match {
      case Gender.Male   => "M"
      case Gender.Female => "F"
      case Gender.Other  => "O"
    }
  def parseDateOfBirth(dob: String): Validation[DateOfBirth] =
    DateOfBirth.from(LocalDate.parse(dob, dateOfBirthPattern))
  def formatDateOfBirth(dob: DateOfBirth): String = dob.toLocalDate.format(dateOfBirthPattern)
  private val defaultTime = OffsetDateTime.parse("20991231 235959.999 +00:00", dateTimePattern)
  val defaultVerificationTime = defaultTime
  val defaultLimitEndingTime = defaultTime
  val defaultGeoId = "NOGEOID"
}

sealed trait AccountType extends EnumEntry with Uppercase;
object AccountType extends Enum[AccountType] {
  lazy val values: IndexedSeq[AccountType] = findValues
  final case object Free extends AccountType
  final case object Real extends AccountType
  final case object Test extends AccountType
  final case object System extends AccountType
  final case object Unknown extends AccountType
}

sealed trait AccountStatus extends EnumEntry with Uppercase
object AccountStatus extends Enum[AccountStatus] {
  lazy val values: IndexedSeq[AccountStatus] = findValues
  final case object Open extends AccountStatus
  final case object Pending extends AccountStatus
  final case object Closed extends AccountStatus
  final case object Suspended extends AccountStatus
  final case object Dormant extends AccountStatus
  final case object Unknown extends AccountStatus
}

sealed trait ExclusionReason extends EnumEntry with Uppercase;
object ExclusionReason extends enumeratum.Enum[ExclusionReason] {
  lazy val values: IndexedSeq[ExclusionReason] = findValues
  final case object Locked extends ExclusionReason
  final case object KYCFailure extends ExclusionReason
  final case object Excluded extends ExclusionReason
  final case object Cooldown extends ExclusionReason
  final case object SelfExcluded extends ExclusionReason
}

sealed trait KYCVerificationMethod extends EnumEntry with Uppercase;
object KYCVerificationMethod extends enumeratum.Enum[KYCVerificationMethod] {
  lazy val values: IndexedSeq[KYCVerificationMethod] = findValues
  final case object Automatic extends KYCVerificationMethod
  final case object Manual extends KYCVerificationMethod
  final case object NoKYC extends KYCVerificationMethod
}

sealed trait KYCVerificationStatus extends EnumEntry with Uppercase;
object KYCVerificationStatus extends enumeratum.Enum[KYCVerificationStatus] {
  lazy val values: IndexedSeq[KYCVerificationStatus] = findValues
  final case object Passed extends KYCVerificationStatus
  final case object Pending extends KYCVerificationStatus
  final case object Failed extends KYCVerificationStatus
  final case object NoStatus extends KYCVerificationStatus
}

final case class Adjustment(amount: MoneyAmount, reason: String)

final case class PatronKYCDetails(
    kycVerificationMethod: KYCVerificationMethod,
    kycVerificationStatus: KYCVerificationStatus,
    kycVerificationTime: OffsetDateTime)

final case class PatronRegistrationDetails(
    registrationTime: OffsetDateTime,
    state: Option[State],
    zipcode: Option[Zipcode],
    nonUsState: Option[String],
    country: Option[Country])

final case class PatronDetails(
    punterId: PunterEntity.PunterId,
    geoId: String,
    dupi: DUPI,
    registration: PatronRegistrationDetails,
    personal: PunterPersonalDetails,
    kyc: PatronKYCDetails,
    lastUpdateTime: OffsetDateTime)

final case class PatronStatus(
    punterId: PunterEntity.PunterId,
    reportingDate: LocalDate,
    accountType: AccountType,
    accountStatus: AccountStatus,
    exclusionReason: Option[ExclusionReason],
    walletBalance: MoneyAmount,
    blockedFunds: Option[MoneyAmount],
    fundsOnGame: Option[MoneyAmount],
    adjustment: Option[Adjustment])

sealed trait TransactionType extends EnumEntry with Uppercase;
object TransactionType extends Enum[TransactionType] {
  val values: IndexedSeq[TransactionType] = findValues
  final case object Deposit extends TransactionType
  final case object Withdrawal extends TransactionType
}

sealed trait TransactionDescription extends EnumEntry with Uppercase
object TransactionDescription extends Enum[TransactionDescription] {
  val values: IndexedSeq[TransactionDescription] = findValues
  final case object InsufficientFunds extends TransactionDescription
  final case object Override extends TransactionDescription
  final case object Denied extends TransactionDescription
  final case object Reversed extends TransactionDescription
  final case object Pending extends TransactionDescription
  final case object Failed extends TransactionDescription
  final case object Authorization extends TransactionDescription
  final case object Void extends TransactionDescription
  final case object Approved extends TransactionDescription
}

sealed trait TransactionSource extends EnumEntry with Uppercase
object TransactionSource extends Enum[TransactionSource] {
  val values: IndexedSeq[TransactionSource] = findValues
  final case object BankAccount extends TransactionSource
  final case object CreditCard extends TransactionSource
  final case object GiftCard extends TransactionSource
  final case object Cash extends TransactionSource
}

sealed trait TransactionProvider extends EnumEntry with Uppercase
object TransactionProvider extends Enum[TransactionProvider] {
  val values: IndexedSeq[TransactionProvider] = findValues
  final case object Paypal extends TransactionProvider
  final case object Visa extends TransactionProvider
  final case object CashAtCasinoCage extends TransactionProvider
  final case object BankWireTransfer extends TransactionProvider
}

final case class CashTransaction(
    punterId: PunterEntity.PunterId,
    transactionId: TransactionId,
    timestamp: OffsetDateTime,
    transactionType: TransactionType,
    description: TransactionDescription,
    amount: MoneyAmount,
    requestedAmount: MoneyAmount,
    source: Option[TransactionSource],
    provider: Option[TransactionProvider])

sealed trait LimitType extends EnumEntry with Uppercase
object LimitType extends enumeratum.Enum[LimitType] {
  lazy val values: IndexedSeq[LimitType] = findValues
  final case object Deposit extends LimitType
  final case object Time extends LimitType
  final case object Spend extends LimitType
  final case object Wager extends LimitType
  final case object Loss extends LimitType
  final case object CoolOff extends LimitType
}

sealed trait LimitPeriod extends EnumEntry with Uppercase
object LimitPeriod extends enumeratum.Enum[LimitPeriod] {
  lazy val values: IndexedSeq[LimitPeriod] = findValues
  final case object Daily extends LimitPeriod
  final case object Weekly extends LimitPeriod
  final case object Monthly extends LimitPeriod
  final case object Yearly extends LimitPeriod
}

final case class PatronGameLims(
    punterId: PunterEntity.PunterId,
    createdAt: OffsetDateTime,
    start: OffsetDateTime,
    finish: OffsetDateTime,
    limitType: LimitType,
    limitPeriod: Option[LimitPeriod],
    limitAmount: Option[BigDecimal])

sealed trait GameType extends EnumEntry with Uppercase
object GameType extends enumeratum.Enum[GameType] {
  lazy val values: IndexedSeq[GameType] = findValues
  final case object Poker extends GameType
  final case object Casino extends GameType
  final case object SportsBook extends GameType
}

sealed trait TransferType extends EnumEntry with Uppercase
object TransferType extends enumeratum.Enum[TransferType] {
  lazy val values: IndexedSeq[TransferType] = findValues
  final case object ToWallet extends TransferType
  final case object FromWallet extends TransferType
}

sealed trait TransferDescription extends EnumEntry with Uppercase
object TransferDescription extends enumeratum.Enum[TransferDescription] {
  lazy val values: IndexedSeq[TransferDescription] = findValues
  final case object Cash extends TransferDescription
  final case object Promotional extends TransferDescription
  final case object Expired extends TransferDescription
  final case object CasinoAdjustment extends TransferDescription
  final case object TournamentFee extends TransferDescription
  final case object PokerTimeFee extends TransferDescription
  final case object Profit extends TransferDescription
  final case object Bonus extends TransferDescription
}

final case class WalletTransfer(
    punterId: PunterEntity.PunterId,
    sessionId: Option[SessionId],
    transactionId: TransactionId,
    timestamp: OffsetDateTime,
    transferType: TransferType,
    transferDescription: TransferDescription,
    amount: MoneyAmount,
    gameName: Option[String],
    gameVersion: Option[String],
    rgsName: Option[String])

final case class PatronSession(
    punterId: PunterEntity.PunterId,
    sessionId: SessionId,
    loginTime: OffsetDateTime,
    logoutTime: Option[OffsetDateTime],
    ipAddress: IpAddress)

object SportsWagers {
  type TransactionReason = String
  type WagerLeagues = String
  case class Transaction(
      betId: BetId,
      fixtureId: FixtureId,
      punterId: PunterEntity.PunterId,
      transactionId: Option[TransactionId],
      timestamp: OffsetDateTime,
      transactionType: TransactionType,
      transactionReason: Option[TransactionReason],
      toWager: MoneyAmount,
      toWin: MoneyAmount,
      toPay: MoneyAmount,
      actualPayout: Option[MoneyAmount],
      wagerLeagues: WagerLeagues,
      wagerStyle: WagerStyle,
      wagerOdds: Option[AmericanOdds])

  sealed trait WagerType extends EnumEntry with Uppercase
  object WagerType extends Enum[WagerType] {
    val values: IndexedSeq[WagerType] = findValues
    final case object Straight extends WagerType
  }

  sealed trait TransactionType extends EnumEntry with Uppercase
  object TransactionType extends Enum[TransactionType] {
    val values: IndexedSeq[TransactionType] = findValues
    final case object Created extends TransactionType
    final case object Settled extends TransactionType
    final case object Resettled extends TransactionType
    final case object Paid extends TransactionType
    final case object Voided extends TransactionType
    final case object Cancelled extends TransactionType
    final case object Expired extends TransactionType
    final case object Lost extends TransactionType
    final case object Won extends TransactionType
    final case object Pending extends TransactionType
  }

  sealed trait WagerStyle extends EnumEntry with Uppercase
  object WagerStyle extends Enum[WagerStyle] {
    val values: IndexedSeq[WagerStyle] = findValues
    final case object Undefined extends WagerStyle
    final case object Spread extends WagerStyle
    final case object Total extends WagerStyle
    final case object MoneyLine extends WagerStyle

    def fromMarketCategory(marketCategory: MarketCategory): WagerStyle =
      marketCategory.value match {
        case "Activated rune type spawned at time" => Total
        case "Beyond godlike"                      => Total
        case "Correct goal score"                  => Total
        case "Correct match score"                 => Total
        case "Correct round score"                 => Total
        case "Dragon soul type"                    => Total
        case "X. dragon type"                      => Total
        case "First Aegis"                         => MoneyLine
        case "First Baron"                         => MoneyLine
        case "First barracks"                      => MoneyLine
        case "First blood"                         => MoneyLine
        case "First dragon"                        => MoneyLine
        case "First half winner - twoway"          => MoneyLine
        case "First half winner - threeway"        => MoneyLine
        case "First half winner twoway"            => MoneyLine
        case "First half winner threeway"          => MoneyLine
        case "First inhibitor"                     => MoneyLine
        case "First to reach X kills"              => MoneyLine
        case "First to reach X rounds"             => MoneyLine
        case "First tower"                         => MoneyLine
        case "First turret"                        => MoneyLine
        case "Map duration X"                      => Total
        case "Map X winner"                        => MoneyLine
        case "Match handicap"                      => Spread
        case "Match winner - twoway"               => MoneyLine
        case "Match winner - threeway"             => MoneyLine
        case "Megacreeps"                          => Total
        case "Xth kill"                            => MoneyLine
        case "Number of maps X"                    => Total
        case "Number of rounds X"                  => Total
        case "Number of rounds parity"             => Total
        case "Overtime"                            => MoneyLine
        case "Penta kill"                          => Total
        case "Pistol Round X winner"               => MoneyLine
        case "Place within TOPX"                   => MoneyLine
        case "Quadra kill"                         => Total
        case "Rampage"                             => Total
        case "Round handicap"                      => Spread
        case "Round X winner"                      => MoneyLine
        case "Second half winner - twoway"         => MoneyLine
        case "Second half winner - threeway"       => MoneyLine
        case "Total goals X"                       => Total
        case "Total goals parity"                  => Total
        case "Total kills X"                       => Total
        case "Total kills parity"                  => Total
        case "Total towers X"                      => Total
        case "Total turrets"                       => Total
        case "Ultra kill"                          => Total
        case "Will be X dragon slayed?"            => Total
        case "X wins at least one map"             => MoneyLine
        case _                                     => Undefined
      }
  }
}
