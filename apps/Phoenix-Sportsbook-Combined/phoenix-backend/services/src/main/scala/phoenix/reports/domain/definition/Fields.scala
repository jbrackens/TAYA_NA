package phoenix.reports.domain.definition

import java.time.OffsetDateTime

import phoenix.bets.BetEntity.BetId
import phoenix.core.currency.Amount
import phoenix.http.core.Device
import phoenix.http.core.IpAddress
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.domain.Address
import phoenix.punters.domain.Confidence
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.SocialSecurityNumber.FullOrPartialSSN
import phoenix.punters.domain.VisitorId
import phoenix.reports.domain.model.bets.BetStatus
import phoenix.reports.domain.model.markets.SportDiscipline
import phoenix.reports.domain.model.punter.AccountDesignation
import phoenix.reports.domain.model.wallets.TransactionType

object Fields {

  sealed trait FieldType

  final case class OptionalField[T <: FieldType](value: Option[T]) extends FieldType
  object OptionalField {
    def none[T <: FieldType] = OptionalField[T](None)
    def some[T <: FieldType](field: T) = OptionalField[T](Some(field))
  }
  final case class StringField(value: String) extends FieldType

  final case class DateField(value: OffsetDateTime) extends FieldType
  final case class TimeField(value: OffsetDateTime) extends FieldType
  final case class DateTimeField(value: OffsetDateTime) extends FieldType

  final case class NumberField(value: Int) extends FieldType
  final case class MoneyField(value: Amount) extends FieldType

  final case class AdminIdField(value: AdminId) extends FieldType
  final case class PatronIdField(value: PunterId) extends FieldType
  final case class BetIdField(value: BetId) extends FieldType
  final case class VisitorIdField(value: VisitorId) extends FieldType
  final case class ConfidenceField(value: Confidence) extends FieldType

  final case class AccountDesignationField(value: AccountDesignation) extends FieldType
  final case class ActivationPathField(value: ActivationPath) extends FieldType
  final case class BetStatusField(value: BetStatus) extends FieldType
  final case class SportDisciplineField(value: SportDiscipline) extends FieldType
  final case class TransactionTypeField(value: TransactionType) extends FieldType
  final case class FullNameField(value: PersonalName) extends FieldType
  final case class FullAddressField(value: Address) extends FieldType
  final case class IpAddressField(value: IpAddress) extends FieldType
  final case class DeviceField(value: Device) extends FieldType
  final case class FullOrPartialSSNField(value: FullOrPartialSSN) extends FieldType

}
