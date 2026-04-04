package phoenix.punters.idcomply.domain

import scala.collection.immutable
import scala.concurrent.Future

import cats.data.EitherT
import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.SocialSecurityNumber.First5DigitsOfSSN
import phoenix.punters.idcomply.domain.CreateIDPVToken.CreateIDPVTokenResult
import phoenix.punters.idcomply.domain.CreateIDPVToken.CreateIDPVTokenWrongRequest
import phoenix.punters.idcomply.domain.GetKBAQuestions.GetKBAQuestionsWrongRequest
import phoenix.punters.idcomply.domain.GetKBAQuestions.KBAQuestionsResult
import phoenix.punters.idcomply.domain.RequestKYC.KYCError
import phoenix.punters.idcomply.domain.RequestKYC.KYCResult
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.KBAError
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.SubmitKBAAnswersResult

trait IdComplyService {

  def requestKYC(userFields: UserFields): EitherT[Future, KYCError, KYCResult]

  def getKBAQuestions(
      transactionId: TransactionId,
      userFields: UserFields): EitherT[Future, GetKBAQuestionsWrongRequest.type, KBAQuestionsResult]

  def submitKBAAnswers(
      questionsTransactionId: TransactionId,
      answers: List[Answer]): EitherT[Future, KBAError, SubmitKBAAnswersResult]

  def createIDPVToken(punterId: PunterId): EitherT[Future, CreateIDPVTokenWrongRequest.type, CreateIDPVTokenResult]

  def createIDPVUrl(token: TokenId, openKey: OpenKey): IDPVUrl

  def getIDPVTokenStatus(tokenId: TokenId): Future[IDPVTokenStatusResponse]
}

object RequestKYC {
  sealed trait KYCMatch
  object KYCMatch {
    final object FailMatch extends KYCMatch
    final object PartialMatch extends KYCMatch
    final case class FullMatch(firstFiveDigitsSSN: First5DigitsOfSSN) extends KYCMatch
  }

  final case class KYCResult(
      kycMatch: KYCMatch,
      transactionId: TransactionId,
      alerts: List[Alert],
      details: List[Detail])

  final case class RequestError(key: KYCErrorKey, message: String)

  sealed trait KYCError
  object KYCError {
    case class WrongRequest(error: RequestError) extends KYCError
  }

  sealed trait KYCErrorKey extends UpperSnakecase
  object KYCErrorKey extends Enum[KYCErrorKey] {
    override def values: IndexedSeq[KYCErrorKey] = findValues

    case object UnknownError extends KYCErrorKey
    case object UserIdInvalid extends KYCErrorKey
    case object CityInvalid extends KYCErrorKey
    case object CountryInvalid extends KYCErrorKey
    case object DobInvalid extends KYCErrorKey
    case object DobYearInvalid extends KYCErrorKey
    case object FirstNameInvalid extends KYCErrorKey
    case object LastNameInvalid extends KYCErrorKey
    case object IdNumberInvalid extends KYCErrorKey
    case object SsnInvalid extends KYCErrorKey
    case object StateInvalid extends KYCErrorKey
    case object ZipInvalid extends KYCErrorKey
  }
}

object GetKBAQuestions {
  sealed trait KBAQuestionsResult

  object KBAQuestionsResult {
    final case class FullMatch(transactionId: TransactionId, questions: List[Question]) extends KBAQuestionsResult
    final case class FailMatch(message: String) extends KBAQuestionsResult
  }

  object GetKBAQuestionsWrongRequest
}

object SubmitKBAAnswers {

  sealed trait SubmitKBAAnswersResult

  object SubmitKBAAnswersResult {
    case object FullMatch extends SubmitKBAAnswersResult

    final case class PartialMatch(transactionId: TransactionId, questions: List[Question])
        extends SubmitKBAAnswersResult

    case object FailMatch extends SubmitKBAAnswersResult
  }
  final case class RequestError(key: KBAErrorKey, message: String)

  sealed trait KBAError
  object KBAError {
    case object QuestionsExpired extends KBAError
    case class WrongRequest(error: RequestError) extends KBAError
  }

  sealed trait KBAErrorKey extends UpperSnakecase
  object KBAErrorKey extends Enum[KBAErrorKey] {
    override def values: IndexedSeq[KBAErrorKey] = findValues
    case object QuestionsExpired extends KBAErrorKey
    case object UnknownError extends KBAErrorKey
  }
}

object CreateIDPVToken {
  final case class CreateIDPVTokenResult(
      token: TokenId,
      openKey: OpenKey,
      creationTime: TokenCreationTime,
      expirationTime: TokenExpirationTime)

  object CreateIDPVTokenWrongRequest
}

final case class IDPVUrl(value: String)

sealed trait IDPVTokenStatusResponse
object IDPVTokenStatusResponse {
  sealed trait Completed extends IDPVTokenStatusResponse
  case object Created extends IDPVTokenStatusResponse
  case object Activated extends IDPVTokenStatusResponse
  case object Archived extends IDPVTokenStatusResponse

  final case class FullMatch(
      firstName: Option[IDPVUserFields.FirstName],
      lastName: IDPVUserFields.LastName,
      givenName: Option[IDPVUserFields.GivenName],
      fullName: Option[IDPVUserFields.FullName],
      address: Option[IDPVUserFields.Address],
      city: Option[IDPVUserFields.City],
      zip: Option[IDPVUserFields.Zip],
      country: Option[IDPVUserFields.Country],
      idNumber: IDPVUserFields.IdNumber,
      idType: IDPVUserFields.IdType,
      dobDay: IDPVUserFields.DobDay,
      dobMonth: IDPVUserFields.DobMonth,
      dobYear: IDPVUserFields.DobYear,
      expirationDay: IDPVUserFields.ExpirationDay,
      expirationMonth: IDPVUserFields.ExpirationMonth,
      expirationYear: IDPVUserFields.ExpirationYear,
      issueDay: IDPVUserFields.IssueDay,
      issueMonth: IDPVUserFields.IssueMonth,
      issueYear: IDPVUserFields.IssueYear,
      ssn: IDPVUserFields.SSN)
      extends Completed
  case object PartialMatch extends Completed
  case object FailMatch extends Completed

  object IDPVUserFields {
    final case class FirstName(value: String)
    final case class LastName(value: String)
    final case class GivenName(value: String)
    final case class FullName(value: String)
    final case class Address(value: String)
    final case class City(value: String)
    final case class Zip(value: String)
    final case class Country(value: String)
    final case class IdNumber(value: String)
    final case class IdType(value: String)
    final case class DobDay(value: Int)
    final case class DobMonth(value: Int)
    final case class DobYear(value: Int)
    final case class ExpirationDay(value: String)
    final case class ExpirationMonth(value: String)
    final case class ExpirationYear(value: String)
    final case class IssueDay(value: String)
    final case class IssueMonth(value: String)
    final case class IssueYear(value: String)
    final case class SSN(value: String)
  }
}

sealed trait IDPVTokenStatus extends EnumEntry with UpperSnakecase
object IDPVTokenStatus extends Enum[IDPVTokenStatus] {
  lazy val values: immutable.IndexedSeq[IDPVTokenStatus] = findValues

  case object Completed extends IDPVTokenStatus
  case object Created extends IDPVTokenStatus
  case object Activated extends IDPVTokenStatus
  case object Archived extends IDPVTokenStatus

  def from(idpvTokenStatusResponse: IDPVTokenStatusResponse): IDPVTokenStatus =
    idpvTokenStatusResponse match {
      case _: IDPVTokenStatusResponse.Completed => Completed
      case IDPVTokenStatusResponse.Created      => Created
      case IDPVTokenStatusResponse.Activated    => Activated
      case IDPVTokenStatusResponse.Archived     => Archived
    }
}
