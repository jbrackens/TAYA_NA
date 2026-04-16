package phoenix.punters.idcomply.domain

import java.time.OffsetDateTime

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.idcomply.domain.UserFields._

final case class TransactionId(value: String)

final case class UserFields(
    userId: PunterId,
    firstName: FirstName,
    lastName: LastName,
    buildingName: BuildingName,
    city: City,
    state: State,
    zip: ZipCode,
    country: Country,
    dobDay: DateOfBirthDay,
    dobMonth: DateOfBirthMonth,
    dobYear: DateOfBirthYear,
    ssn: LastFourDigitsOfSocialSecurityNumber)
object UserFields {
  final case class FirstName(value: String)
  final case class LastName(value: String)
  final case class BuildingName(value: String)
  final case class City(value: String)
  final case class State(value: String)
  final case class ZipCode(value: String)
  final case class Country(value: String)
  final case class PhoneNumber(value: String)
  final case class DateOfBirthYear(value: Int)
  final case class DateOfBirthMonth(value: Int)
  final case class DateOfBirthDay(value: Int)
  final case class LastFourDigitsOfSocialSecurityNumber(value: String)
}

final case class AlertKey(value: String)
final case class AlertMessage(value: String)
final case class Alert(key: AlertKey, message: AlertMessage)

final case class DetailField(value: String)
final case class DetailMessage(value: String)
final case class Detail(field: DetailField, message: DetailMessage)

final case class ErrorKey(value: String)
final case class ErrorMessage(value: String)
final case class Error(key: ErrorKey, message: ErrorMessage)

final case class QuestionId(value: String)
final case class QuestionText(value: String)
final case class AnswerChoices(value: List[String])
final case class Question(questionId: QuestionId, text: QuestionText, choices: AnswerChoices)

final case class Answer(questionId: QuestionId, choice: String)

final case class TokenId(value: String)
final case class OpenKey(value: String)

final case class TokenCreationTime(value: OffsetDateTime)
final case class TokenExpirationTime(value: OffsetDateTime)
