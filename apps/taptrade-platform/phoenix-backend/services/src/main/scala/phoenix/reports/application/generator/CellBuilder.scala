package phoenix.reports.application.generator

import java.time.LocalDateTime
import java.time.OffsetDateTime

import scala.math.BigDecimal.RoundingMode
import scala.math.BigDecimal.decimal

import com.norbitltd.spoiwo.model.Cell
import com.norbitltd.spoiwo.model.CellBorders
import com.norbitltd.spoiwo.model.CellDataFormat
import com.norbitltd.spoiwo.model.CellStyle
import com.norbitltd.spoiwo.model.CellValueType
import com.norbitltd.spoiwo.model.Font
import com.norbitltd.spoiwo.model.Height._
import com.norbitltd.spoiwo.model.enums.CellBorderStyle

import phoenix.core.Clock
import phoenix.core.currency.Amount
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.PunterState.ActivationPath.IDPV
import phoenix.punters.PunterState.ActivationPath.KBA
import phoenix.punters.PunterState.ActivationPath.Manual
import phoenix.punters.PunterState.ActivationPath.Unknown
import phoenix.punters.domain.Address
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.SocialSecurityNumber.FullOrPartialSSN
import phoenix.reports.domain.definition.Fields.AccountDesignationField
import phoenix.reports.domain.definition.Fields.ActivationPathField
import phoenix.reports.domain.definition.Fields.AdminIdField
import phoenix.reports.domain.definition.Fields.BetIdField
import phoenix.reports.domain.definition.Fields.BetStatusField
import phoenix.reports.domain.definition.Fields.ConfidenceField
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.DateTimeField
import phoenix.reports.domain.definition.Fields.DeviceField
import phoenix.reports.domain.definition.Fields.FieldType
import phoenix.reports.domain.definition.Fields.FullAddressField
import phoenix.reports.domain.definition.Fields.FullNameField
import phoenix.reports.domain.definition.Fields.FullOrPartialSSNField
import phoenix.reports.domain.definition.Fields.IpAddressField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.NumberField
import phoenix.reports.domain.definition.Fields.OptionalField
import phoenix.reports.domain.definition.Fields.PatronIdField
import phoenix.reports.domain.definition.Fields.SportDisciplineField
import phoenix.reports.domain.definition.Fields.StringField
import phoenix.reports.domain.definition.Fields.TimeField
import phoenix.reports.domain.definition.Fields.TransactionTypeField
import phoenix.reports.domain.definition.Fields.VisitorIdField
import phoenix.reports.domain.model.bets.BetStatus
import phoenix.reports.domain.model.bets.BetStatus.Open
import phoenix.reports.domain.model.markets.SportDiscipline
import phoenix.reports.domain.model.markets.SportDiscipline.AmericanFootball
import phoenix.reports.domain.model.markets.SportDiscipline.Baseball
import phoenix.reports.domain.model.markets.SportDiscipline.Basketball
import phoenix.reports.domain.model.markets.SportDiscipline.Boxing
import phoenix.reports.domain.model.markets.SportDiscipline.Football
import phoenix.reports.domain.model.markets.SportDiscipline.Golf
import phoenix.reports.domain.model.markets.SportDiscipline.MotorSport
import phoenix.reports.domain.model.markets.SportDiscipline.Other
import phoenix.reports.domain.model.markets.SportDiscipline.Tennis
import phoenix.reports.domain.model.punter.AccountDesignation
import phoenix.reports.domain.model.punter.AccountDesignation.RealAccount
import phoenix.reports.domain.model.punter.AccountDesignation.TestAccount
import phoenix.reports.domain.model.wallets.TransactionType
import phoenix.reports.domain.model.wallets.TransactionType.Deposit
import phoenix.reports.domain.model.wallets.TransactionType.Withdrawal

private object CellBuilder {
  def apply(clock: Clock): CellBuilder = new CellBuilder(clock)
}

private final class CellBuilder private (clock: Clock) {
  def buildCell(field: FieldType): Cell =
    field match {
      case OptionalField(field)                  => buildCell(field)
      case StringField(value)                    => stringCell(value)
      case DateField(date)                       => dateCell(date)
      case TimeField(time)                       => timeCell(time)
      case DateTimeField(dateTime)               => dateTimeCell(dateTime)
      case NumberField(number)                   => numberCell(number)
      case MoneyField(money)                     => moneyCell(money)
      case AdminIdField(adminId)                 => stringCell(adminId.value)
      case PatronIdField(patronId)               => stringCell(patronId.value)
      case BetIdField(betId)                     => stringCell(betId.value)
      case AccountDesignationField(designation)  => accountDesignationCell(designation)
      case ActivationPathField(activationPath)   => activationPathCell(activationPath)
      case BetStatusField(betStatus)             => betStatusCell(betStatus)
      case SportDisciplineField(discipline)      => sportDisciplineCell(discipline)
      case TransactionTypeField(transactionType) => transactionTypeCell(transactionType)
      case FullNameField(personalName)           => fullName(personalName)
      case FullAddressField(address)             => fullAddress(address)
      case IpAddressField(ipAddress)             => stringCell(ipAddress.value)
      case DeviceField(device)                   => stringCell(device.value)
      case FullOrPartialSSNField(ssn)            => fullOrPartialSSN(ssn)
      case ConfidenceField(field)                => floatNumberCell(field.value)
      case VisitorIdField(field)                 => stringCell(field.value)
    }

  private def buildCell(field: Option[FieldType]): Cell = field.map(buildCell).getOrElse(stringCell(""))

  private def dateCell(dateTime: OffsetDateTime): Cell =
    createFormattedCell(adjustTimeZone(dateTime, clock), dataFormat = DateTimeFormats.DATE_FORMAT)

  private def timeCell(dateTime: OffsetDateTime): Cell =
    createFormattedCell(adjustTimeZone(dateTime, clock), dataFormat = DateTimeFormats.TIME_FORMAT)

  private def dateTimeCell(dateTime: OffsetDateTime): Cell =
    createFormattedCell(adjustTimeZone(dateTime, clock), dataFormat = DateTimeFormats.DATE_TIME_FORMAT)

  private def numberCell(value: Long): Cell =
    createFormattedCell(value, dataFormat = NumberFormats.INTEGER_FORMAT)

  private def floatNumberCell(value: Float): Cell =
    createFormattedCell(decimal(value), dataFormat = NumberFormats.DECIMAL_FORMAT)

  private def moneyCell(amount: Amount): Cell = {
    val rounded = amount.setScale(2, RoundingMode.HALF_UP)
    createFormattedCell(rounded, dataFormat = NumberFormats.DECIMAL_FORMAT)
  }

  private def accountDesignationCell(input: AccountDesignation): Cell = {
    stringCell(input match {
      case RealAccount => "Real"
      case TestAccount => "Test"
    })
  }

  private def activationPathCell(input: ActivationPath): Cell = {
    stringCell(input match {
      case KBA     => "KBA"
      case IDPV    => "IDPV"
      case Manual  => "MANUAL"
      case Unknown => "UNKNOWN"
    })
  }

  private def betStatusCell(input: BetStatus): Cell = {
    stringCell(input match {
      case Open => "Open"
    })
  }

  private def transactionTypeCell(input: TransactionType): Cell = {
    stringCell(input match {
      case Deposit    => "Deposit"
      case Withdrawal => "Withdrawal"
    })
  }

  private def sportDisciplineCell(input: SportDiscipline): Cell = {
    stringCell(input match {
      case AmericanFootball => "American Football"
      case Baseball         => "Baseball"
      case Basketball       => "Basketball"
      case Boxing           => "Boxing"
      case Football         => "Football"
      case Golf             => "Golf"
      case MotorSport       => "Motor Sport"
      case Tennis           => "Tennis"
      case Other            => "Other"
    })
  }

  private def fullName(name: PersonalName): Cell =
    stringCell(s"${name.title.value} ${name.firstName.value} ${name.lastName.value}")

  private def fullAddress(address: Address): Cell =
    stringCell(
      s"${address.addressLine.value}, ${address.city.value}, ${address.state.value}, ${address.zipcode.value}, ${address.country.value}")

  private def fullOrPartialSSN(ssn: FullOrPartialSSN): Cell =
    stringCell(ssn.fold(_.value, _.value))

  private def adjustTimeZone(dateTime: OffsetDateTime, clock: Clock): LocalDateTime =
    clock.adjustToClockZone(dateTime).toLocalDateTime

  private def createFormattedCell[T: CellValueType](data: T, dataFormat: String): Cell =
    stringCell(data, _.copy(dataFormat = Some(CellDataFormat(dataFormat))))

  private def stringCell[T: CellValueType](value: T, style: CellStyle => CellStyle = identity): Cell =
    Cell(value, style = style(defaultCellStyle))

  private lazy val defaultCellStyle: CellStyle = CellStyle(
    borders = CellBorders(
      leftStyle = CellBorderStyle.Thin,
      rightStyle = CellBorderStyle.Thin,
      bottomStyle = CellBorderStyle.Thin,
      topStyle = CellBorderStyle.Thin),
    font = Font(height = 13.points))
}
