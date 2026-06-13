package phoenix.projections

import java.util.UUID

import scala.reflect.ClassTag

import cats.data.NonEmptyList
import enumeratum.SlickEnumSupport
import io.circe.Json
import shapeless.::
import shapeless.Generic
import shapeless.HList
import shapeless.HNil
import slick.jdbc.SetParameter

import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.Stake
import phoenix.core.JsonFormats._
import phoenix.core.currency.CurrencyJsonFormats.defaultCurrencyMoneyCodec
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.domain.DataProvider
import phoenix.core.domain.NamespacedPhoenixId
import phoenix.core.odds.Odds
import phoenix.core.persistence.ExtendedPostgresProfile
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.http.core.Device
import phoenix.http.core.IpAddress
import phoenix.markets.MarketCategory
import phoenix.markets.MarketSpecifier
import phoenix.markets.MarketVisibility
import phoenix.markets.MarketsBoundedContext._
import phoenix.markets.MarketsRepository.MarketLifecycleChange
import phoenix.markets.SelectionOdds
import phoenix.markets.domain.MarketType
import phoenix.markets.infrastructure.MarketJsonFormats._
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.domain.CurrentTermsVersion
import phoenix.punters.domain.TermsContent
import phoenix.punters.domain.TermsDaysThreshold
import phoenix.sharding.PhoenixId
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason
import phoenix.wallets.domain.PaymentMethod
import phoenix.wallets.domain.PaymentMethod.BackOfficeManualPaymentMethod
import phoenix.wallets.domain.PaymentMethod.BankTransferPaymentMethod
import phoenix.wallets.domain.PaymentMethod.CashDepositPaymentMethod
import phoenix.wallets.domain.PaymentMethod.CashWithdrawalPaymentMethod
import phoenix.wallets.domain.PaymentMethod.ChequeWithdrawalPaymentMethod
import phoenix.wallets.domain.PaymentMethod.CreditCardPaymentMethod
import phoenix.wallets.domain.PaymentMethod.NotApplicablePaymentMethod
import phoenix.wallets.domain.ResponsibilityCheckTaskId

object DomainMappers extends SlickEnumSupport {

  override val profile = ExtendedPostgresProfile

  /**
   * You can think of this type as mapping between `IdType` case class (that has just one field, of String type)
   * and a String.
   */
  type IdGeneric[IdType] = Generic.Aux[IdType, String :: HNil]
  type NamespacedIdGeneric[NamespacedIdType] =
    Generic.Aux[NamespacedIdType, DataProvider :: String :: HNil]

  /**
   * Basically, a way of deriving apply function (String => IdType)
   * when the only thing we have is the type (so that we don't need to pass the companion object explicitly as a param).
   */
  private def makeId[IdType](value: String)(implicit gen: IdGeneric[IdType]): IdType = gen.from(HList(value))
  private def makeNamespacedId[NamespacedIdType](value: String)(implicit
      gen: NamespacedIdGeneric[NamespacedIdType]): NamespacedIdType =
    value match {
      case NamespacedPhoenixId.namespacedIdRegex(_, provider, id) =>
        gen.from(HList((DataProvider.unsafeWithPrefix(provider), id)))
      case _ => throw new Exception("")
    }

  implicit def phoenixPersistenceIdTypeMapper[IdType <: PhoenixId: ClassTag: IdGeneric]: BaseColumnType[IdType] = {
    // Theoretically, the first param to `base` could be implemented with `gen.from`...
    // but converting a PhoenixId to String is trivial without Shapeless, just `_.value`.
    // The other conversion (String to PhoenixId) isn't possible without some dedicated factory method, however -
    // and here's where Shapeless comes handy.
    MappedColumnType.base[IdType, String](_.value, makeId[IdType])
  }

  implicit def phoenixPersistenceNamespacedIdTypeMapper[IdType <: NamespacedPhoenixId: ClassTag: NamespacedIdGeneric]
      : BaseColumnType[IdType] = {
    // Theoretically, the first param to `base` could be implemented with `gen.from`...
    // but converting a PhoenixId to String is trivial without Shapeless, just `_.value`.
    // The other conversion (String to PhoenixId) isn't possible without some dedicated factory method, however -
    // and here's where Shapeless comes handy.
    MappedColumnType.base[IdType, String](_.value, makeNamespacedId[IdType])
  }

  implicit def phoenixPersistenceIdSetParameter[IdType <: PhoenixId]: SetParameter[IdType] =
    SetParameter[IdType] {
      case (id, parameters) => parameters.setString(id.value)
    }

  implicit val currencyTypeMapper: BaseColumnType[DefaultCurrencyMoney] = jsonTypeMapper

  implicit val moneyAmountTypeMapper: BaseColumnType[MoneyAmount] =
    MappedColumnType.base[MoneyAmount, BigDecimal](_.amount, MoneyAmount.apply)

  implicit val moneyAmountSetParameter: SetParameter[MoneyAmount] = SetParameter[MoneyAmount] {
    case (moneyAmount, parameters) => parameters.setBigDecimal(moneyAmount.amount)
  }

  implicit val oddsTypeMapper: BaseColumnType[Odds] =
    MappedColumnType.base[Odds, BigDecimal](_.value, Odds(_))

  implicit val competitorsTypeMapper: BaseColumnType[Seq[Competitor]] = jsonTypeMapper

  implicit val scoreHistoryTypeMapper: BaseColumnType[Seq[FixtureScoreChange]] = jsonTypeMapper

  implicit val fixtureLifecycleStatusHistoryTypeMapper: BaseColumnType[Seq[FixtureLifecycleStatusChange]] =
    jsonTypeMapper

  implicit val selectionOddsTypeMapper: BaseColumnType[Seq[SelectionOdds]] = jsonTypeMapper

  implicit val marketSpecifiersTypeMapper: BaseColumnType[Seq[MarketSpecifier]] = jsonTypeMapper

  private implicit val marketLifecycleChangeListTypeMapper: BaseColumnType[List[MarketLifecycleChange]] = jsonTypeMapper

  implicit val marketLifecycleStatusHistoryTypeMapper: BaseColumnType[NonEmptyList[MarketLifecycleChange]] =
    MappedColumnType
      .base[NonEmptyList[MarketLifecycleChange], List[MarketLifecycleChange]](_.toList, NonEmptyList.fromListUnsafe)

  implicit val sportViewTypeMapper: BaseColumnType[SportView] = jsonTypeMapper

  implicit val tournamentViewTypeMapper: BaseColumnType[TournamentView] = jsonTypeMapper

  implicit val currentVersionMapper: BaseColumnType[CurrentTermsVersion] =
    MappedColumnType.base[CurrentTermsVersion, Int](_.value, CurrentTermsVersion.apply)

  implicit val termsContentMapper: BaseColumnType[TermsContent] =
    MappedColumnType.base[TermsContent, String](_.value, TermsContent.apply)

  implicit val thresholdDaysMapper: BaseColumnType[TermsDaysThreshold] =
    MappedColumnType.base[TermsDaysThreshold, Int](_.value, TermsDaysThreshold.apply)

  implicit val betStatusMapper: BaseColumnType[BetStatus] = mappedColumnTypeForEnum(BetStatus)

  implicit val betOutcomeMapper: BaseColumnType[BetOutcome] = mappedColumnTypeForEnum(BetOutcome)

  implicit val marketTypeMapper: BaseColumnType[MarketType] = mappedColumnTypeForEnum(MarketType)

  implicit val marketCategoryMapper: BaseColumnType[MarketCategory] =
    MappedColumnType.base[MarketCategory, String](_.value, MarketCategory.apply)

  implicit val transactionReasonMapper: BaseColumnType[TransactionReason] = mappedColumnTypeForEnum(TransactionReason)

  implicit val marketVisibilityMapper: BaseColumnType[MarketVisibility] = mappedColumnTypeForEnum(MarketVisibility)

  implicit val paymentMethodTypeMapper = MappedColumnType.base[PaymentMethod, Json](
    {
      case CreditCardPaymentMethod       => Json.obj("type" -> Json.fromString("CREDIT_CARD_PAYMENT_METHOD"))
      case BankTransferPaymentMethod     => Json.obj("type" -> Json.fromString("BANK_TRANSFER_PAYMENT_METHOD"))
      case CashWithdrawalPaymentMethod   => Json.obj("type" -> Json.fromString("CASH_WITHDRAWAL_PAYMENT_METHOD"))
      case CashDepositPaymentMethod      => Json.obj("type" -> Json.fromString("CASH_DEPOSIT_PAYMENT_METHOD"))
      case ChequeWithdrawalPaymentMethod => Json.obj("type" -> Json.fromString("CHEQUE_WITHDRAWAL_PAYMENT_METHOD"))
      case NotApplicablePaymentMethod    => Json.obj("type" -> Json.fromString("NOT_APPLICABLE_PAYMENT_METHOD"))
      case BackOfficeManualPaymentMethod(details, adminPunterId) =>
        Json.obj(
          "type" -> Json.fromString("BACKOFFICE_MANUAL_PAYMENT_METHOD"),
          "details" -> Json.fromString(details),
          "adminPunterId" -> Json.fromString(adminPunterId.value))
    },
    { json =>
      val hcursor = json.hcursor
      val decoded = for {
        tpe <- hcursor.downField("type").as[String]
        result <- tpe match {
          case "CREDIT_CARD_PAYMENT_METHOD"       => Right(CreditCardPaymentMethod)
          case "BANK_TRANSFER_PAYMENT_METHOD"     => Right(BankTransferPaymentMethod)
          case "CASH_WITHDRAWAL_PAYMENT_METHOD"   => Right(CashWithdrawalPaymentMethod)
          case "CHEQUE_WITHDRAWAL_PAYMENT_METHOD" => Right(ChequeWithdrawalPaymentMethod)
          case "CASH_DEPOSIT_PAYMENT_METHOD"      => Right(CashDepositPaymentMethod)
          case "BACKOFFICE_MANUAL_PAYMENT_METHOD" =>
            for {
              details <- hcursor.downField("details").as[String]
              adminPunterId <- hcursor.downField("adminPunterId").as[String]
            } yield BackOfficeManualPaymentMethod(details, AdminId(adminPunterId))
          case _ => hcursor.fail("Decoding error")
        }
      } yield result
      decoded.getOrElse(NotApplicablePaymentMethod)
    })

  implicit val fixtureStatusMapper: BaseColumnType[FixtureLifecycleStatus] = mappedColumnTypeForEnum(
    FixtureLifecycleStatus)

  implicit val stakeMapper: BaseColumnType[Stake] =
    MappedColumnType.base[Stake, DefaultCurrencyMoney](_.value, raw => Stake.unsafe(raw))

  implicit val responsibilityCheckTaskIdMapper: BaseColumnType[ResponsibilityCheckTaskId] =
    MappedColumnType.base[ResponsibilityCheckTaskId, UUID](_.value, raw => ResponsibilityCheckTaskId(raw))

  implicit val ipAddressMapper: BaseColumnType[IpAddress] =
    MappedColumnType.base[IpAddress, String](_.value, raw => IpAddress(raw))
  implicit val deviceMapper: BaseColumnType[Device] =
    MappedColumnType.base[Device, String](_.value, raw => Device(raw))

}
