package phoenix.punters.exclusion.domain

import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter.ISO_LOCAL_DATE

import scala.collection.immutable.IndexedSeq

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

import phoenix.punters.domain.SocialSecurityNumber.FullOrPartialSSN
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN

final case class ExcludedPlayer(
    name: Name,
    address: Address,
    ssn: Option[FullOrPartialSSN],
    dateOfBirth: LocalDate,
    exclusion: Exclusion) {

  def uniqueIdentifier: ExcludedPlayerId =
    ExcludedPlayerId(ssn match {
      case Some(Right(fullSSN: FullSSN)) =>
        fullSSN.value

      case Some(Left(partialSSN: Last4DigitsOfSSN)) =>
        s"${partialSSN.value}#${dateOfBirth.format(ISO_LOCAL_DATE)}"

      case None =>
        s"${dateOfBirth.format(ISO_LOCAL_DATE)}#${name.normalizedLastName.value}"
    })
}
final case class ExcludedPlayerId(value: String)
final case class Name(firstName: String, middleName: Option[String], lastName: String) {
  def normalizedLastName: NormalizedLastName = NormalizedLastName(lastName)
}
final case class NormalizedLastName private (value: String)
object NormalizedLastName {
  def apply(value: String) = new NormalizedLastName(value.trim.toLowerCase)
}
final case class Address(
    street1: String,
    street2: Option[String],
    city: String,
    state: Option[String],
    country: String,
    zipcode: String)
final case class Exclusion(
    exclusionType: ExclusionType,
    status: ExclusionStatus,
    submittedDate: OffsetDateTime,
    confirmedDate: Option[LocalDate],
    modifiedDate: Option[LocalDate],
    removalDate: Option[LocalDate]) {

  def changeDate: LocalDate = (List(submittedDate.toLocalDate) ++ confirmedDate ++ modifiedDate ++ removalDate).max
}
sealed trait ExclusionType extends EnumEntry with UpperSnakecase
object ExclusionType extends Enum[ExclusionType] {
  override def values: IndexedSeq[ExclusionType] = findValues

  case object Internet extends ExclusionType
  case object Division extends ExclusionType
  case object Property extends ExclusionType
}
sealed trait ExclusionStatus extends EnumEntry with UpperSnakecase
object ExclusionStatus extends Enum[ExclusionStatus] {
  override def values: IndexedSeq[ExclusionStatus] = findValues

  case object Active extends ExclusionStatus
  case object Removed extends ExclusionStatus
}
