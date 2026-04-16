package phoenix.punters.idcomply.infrastructure

import scala.collection.immutable
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.client.RequestBuilding.Get
import akka.http.scaladsl.client.RequestBuilding.Post
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.StatusCode
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.unmarshalling.Unmarshal
import cats.data.EitherT
import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase
import io.circe.Codec
import io.circe.Decoder
import io.circe.HCursor
import io.circe.Json
import io.circe.generic.extras.semiauto._
import io.circe.generic.semiauto.deriveCodec
import io.circe.generic.semiauto.deriveDecoder
import io.circe.parser.decode
import io.circe.syntax._
import org.slf4j.LoggerFactory

import phoenix.core.JsonFormats._
import phoenix.http.JsonMarshalling._
import phoenix.http.core.HttpClient
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.SocialSecurityNumber.First5DigitsOfSSN
import phoenix.punters.idcomply.domain.CreateIDPVToken.CreateIDPVTokenResult
import phoenix.punters.idcomply.domain.CreateIDPVToken.CreateIDPVTokenWrongRequest
import phoenix.punters.idcomply.domain.GetKBAQuestions.GetKBAQuestionsWrongRequest
import phoenix.punters.idcomply.domain.GetKBAQuestions.KBAQuestionsResult
import phoenix.punters.idcomply.domain.RequestKYC.KYCError
import phoenix.punters.idcomply.domain.RequestKYC.KYCErrorKey
import phoenix.punters.idcomply.domain.RequestKYC.KYCMatch
import phoenix.punters.idcomply.domain.RequestKYC.KYCResult
import phoenix.punters.idcomply.domain.RequestKYC.{RequestError => KYCRequestError}
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.KBAError
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.KBAErrorKey
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.SubmitKBAAnswersResult
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.{RequestError => KBARequestError}
import phoenix.punters.idcomply.domain.UserFields._
import phoenix.punters.idcomply.domain._
import phoenix.punters.idcomply.infrastructure.AkkaHttpIdComplyService._
import phoenix.punters.idcomply.infrastructure.IDPVJsonFormats._

final class AkkaHttpIdComplyService(httpClient: HttpClient, config: RegistrationConfig)(implicit system: ActorSystem[_])
    extends IdComplyService {
  private val log = LoggerFactory.getLogger(getClass)

  private implicit val ec: ExecutionContext = system.executionContext

  private def loggedHttpRequest[A: Codec](
      requestBody: A,
      buildHTTPRequest: Json => HttpRequest,
      loggingKey: String): Future[(StatusCode, String)] = {
    val requestBodyAsJson = requestBody.asJson
    val httpRequest = buildHTTPRequest(requestBodyAsJson)

    log.debug(
      s"$loggingKey request - method: {} - uri: {} - body: {}",
      httpRequest.method,
      httpRequest.uri.toString(),
      requestBodyAsJson.noSpacesSortKeys)

    httpClient.sendRequest(httpRequest).flatMap { response =>
      Unmarshal(response.entity).to[String].map { responseBodyAsString =>
        log.debug(
          s"$loggingKey response - status: {} - body: {}",
          response.status.value,
          responseBodyAsString: Any
        ) // Cast to Any due to ambiguous argument resolution in Scala.
        (response.status, responseBodyAsString)
      }
    }
  }

  private def decodeResponseUnsafe[T: Decoder](responseBody: String): T =
    decode[T](responseBody)
      .getOrElse(throw new RuntimeException(s"Error decoding HTTP response from IdComply: $responseBody"))

  override def requestKYC(userFields: UserFields): EitherT[Future, KYCError, KYCResult] = {
    EitherT {
      loggedHttpRequest(
        KnowYourCustomerRequest(config.apiKey, userFields),
        body => Post(uri = config.endpointPaths.knowYourCustomer.value, content = body),
        "request-kyc").map {
        case (StatusCodes.OK, responseBody) =>
          val kycResponse = decodeResponseUnsafe[KnowYourCustomerHTTPResponse](responseBody)
          Right(toKYCResult(kycResponse.result))
        case (StatusCodes.BadRequest, responseBody) =>
          val errorResponse = decodeResponseUnsafe[HTTPErrorResponse](responseBody)
          log.debug(s"KYC error: '$errorResponse'")
          val kycError = KYCError.WrongRequest(errorResponse.error.toKYCRequestError)
          if (kycError.error.key == KYCErrorKey.UnknownError)
            log.warn(s"Unknown KYC error: '${kycError.error}'")
          Left(kycError)
        case (status, _) =>
          throw new RuntimeException(
            s"Unexpected response from Know Your Customer verification call [status = $status]")
      }
    }
  }

  override def getKBAQuestions(
      transactionId: TransactionId,
      userFields: UserFields): EitherT[Future, GetKBAQuestionsWrongRequest.type, KBAQuestionsResult] =
    EitherT {
      loggedHttpRequest(
        GetKBAQuestionsRequest(config.apiKey, transactionId, userFields),
        body => Post(uri = config.endpointPaths.knowledgeBasedAuthentication.value, content = body),
        loggingKey = "get-kba-questions").map {
        case (StatusCodes.OK, responseBody) =>
          val getKBAQuestionsResponse = decodeResponseUnsafe[GetKBAQuestionsHTTPResponse](responseBody)
          Right(toKBAQuestionsResult(getKBAQuestionsResponse.result))
        case (StatusCodes.BadRequest, responseBody) =>
          val errorResponse = decodeResponseUnsafe[HTTPErrorResponse](responseBody)
          log.error(s"GET KBA QUESTIONS ERROR: '$errorResponse'")
          Left(GetKBAQuestionsWrongRequest)
        case (status, _) =>
          throw new RuntimeException(
            s"Unexpected response from Knowledge Based Authentication questions request [status = $status]")
      }
    }

  def submitKBAAnswers(
      questionsTransactionId: TransactionId,
      answers: List[Answer]): EitherT[Future, KBAError, SubmitKBAAnswersResult] =
    EitherT {
      loggedHttpRequest(
        SubmitKBAAnswersRequest(config.apiKey, questionsTransactionId, answers),
        body => Post(uri = config.endpointPaths.knowledgeBasedAuthentication.value, content = body),
        loggingKey = "submit-kba-answers").map {
        case (StatusCodes.OK, responseBody) =>
          val submitKBAAnswersResponse = decodeResponseUnsafe[SubmitKBAAnswersHTTPResponse](responseBody)
          Right(toKBAAnswersResult(submitKBAAnswersResponse.result))
        case (StatusCodes.BadRequest, responseBody) =>
          val errorResponse = decodeResponseUnsafe[HTTPErrorResponse](responseBody)
          log.error(s"SUBMIT KBA ANSWERS ERROR: '$errorResponse'")
          val kbaError = KBAError.WrongRequest(errorResponse.error.toKBARequestError)
          if (kbaError.error.key == KBAErrorKey.QuestionsExpired) {
            Left(KBAError.QuestionsExpired)
          } else Left(kbaError)
        case (status, _) =>
          throw new RuntimeException(
            s"Unexpected response from Knowledge Based Authentication answers request [status = $status]")
      }
    }

  override def createIDPVToken(
      punterId: PunterId): EitherT[Future, CreateIDPVTokenWrongRequest.type, CreateIDPVTokenResult] = {

    val request = CreateIDPVTokenHTTPRequest(
      config.apiKey,
      TokenData(
        endpoint = TokenEndpoint(config.idpvEndpoint.value),
        redirectUrl = TokenRedirectUrl(
          s"${config.frontEndRedirectionEndpoint.value}" +
          s"?showModal=IDCOMPLY&punterId=${punterId.value}"),
        userId = punterId))

    EitherT {
      loggedHttpRequest(
        request,
        body => Post(uri = config.endpointPaths.idPhotoVerificationToken.value, content = body),
        loggingKey = "create-idpv-token").map {
        case (StatusCodes.Created, responseBody) =>
          val createIDPVTokenResponse = decodeResponseUnsafe[CreateIDPVTokenHTTPResponse](responseBody)
          Right(toIDPVTokenResult(createIDPVTokenResponse.result))
        case (StatusCodes.BadRequest, responseBody) =>
          val errorResponse = decodeResponseUnsafe[HTTPErrorResponse](responseBody)
          log.error(s"CREATE IDPV TOKEN ERROR: '$errorResponse'")
          Left(CreateIDPVTokenWrongRequest)
        case (status, _) =>
          throw new RuntimeException(s"Unexpected response from create IDPV token request [status = $status]")
      }
    }
  }

  override def createIDPVUrl(token: TokenId, openKey: OpenKey): IDPVUrl =
    IDPVUrl(s"${config.photoVerificationBaseUrl.value}?token=${token.value}&oKey=${openKey.value}")

  override def getIDPVTokenStatus(tokenId: TokenId): Future[IDPVTokenStatusResponse] =
    loggedHttpRequest(
      GetIDPVTokenStatusHTTPRequest(config.apiKey),
      body =>
        Get(
          uri = config.endpointPaths.idPhotoVerificationTokenStatus.value.replace("tokenId", tokenId.value),
          content = body),
      loggingKey = "get-idpv-token-status").map {
      case (StatusCodes.OK, responseBody) => decodeResponseUnsafe[IDPVTokenStatusResponse](responseBody)
      case (status, _) =>
        throw new RuntimeException(s"Unexpected response from IDPV status check [status = $status]")
    }
}

private object AkkaHttpIdComplyService {
  def toKYCResult(result: IdComplyKYCResult): KYCResult = {
    val kycMatch = result.idComplyMatch match {
      case IdComplyMatch.FullMatch(firstFiveDigitsSSN) => KYCMatch.FullMatch(firstFiveDigitsSSN)
      case IdComplyMatch.PartialMatch                  => KYCMatch.PartialMatch
      case IdComplyMatch.FailMatch                     => KYCMatch.FailMatch
    }
    KYCResult(kycMatch, result.transactionId, result.alerts, result.details)
  }

  def toKBAQuestionsResult(result: IdComplyKBAQuestionsResult): KBAQuestionsResult =
    result match {
      case IdComplyKBAQuestionsResult.FullMatch(transactionId, questions) =>
        KBAQuestionsResult.FullMatch(transactionId, questions)
      case IdComplyKBAQuestionsResult.FailMatch(message) =>
        KBAQuestionsResult.FailMatch(message)
    }

  def toKBAAnswersResult(httpResult: SubmitKBAAnswersHTTPResult): SubmitKBAAnswersResult =
    httpResult.summary.`match` match {
      case KycMatch.Full => SubmitKBAAnswersResult.FullMatch
      case KycMatch.Partial =>
        SubmitKBAAnswersResult.PartialMatch(
          httpResult.transactionId,
          httpResult.questions.getOrElse(
            throw new RuntimeException("No questions found even though the match was a partial one.")))
      case KycMatch.Fail => SubmitKBAAnswersResult.FailMatch
    }

  def toIDPVTokenResult(httpResult: CreateIDPVTokenHTTPResult): CreateIDPVTokenResult =
    CreateIDPVTokenResult(httpResult.token, httpResult.openKey, httpResult.creationTime, httpResult.expirationTime)

  final case class KnowYourCustomerRequest(apiKey: ApiKey, userFields: UserFields)
  final case class KnowYourCustomerHTTPResponse(result: IdComplyKYCResult)
  final case class HTTPErrorResponse(error: HTTPError)
  final case class HTTPError(key: String, message: String) {
    def toKYCRequestError: KYCRequestError = {
      val errorKey = key match {
        case "userId.empty"                          => KYCErrorKey.UserIdInvalid
        case "city.invalid" | "city.empty"           => KYCErrorKey.CityInvalid
        case "country.invalid" | "country.empty"     => KYCErrorKey.CountryInvalid
        case "dob.invalid" | "dob.empty"             => KYCErrorKey.DobInvalid
        case "dobYear.invalid" | "dobYear.empty"     => KYCErrorKey.DobYearInvalid
        case "firstName.invalid" | "firstName.empty" => KYCErrorKey.FirstNameInvalid
        case "lastName.invalid" | "lastName.empty"   => KYCErrorKey.LastNameInvalid
        case "idNumber.invalid" | "idNumber.empty"   => KYCErrorKey.IdNumberInvalid
        case "ssn.invalid" | "ssn.empty"             => KYCErrorKey.SsnInvalid
        case "state.invalid" | "state.empty"         => KYCErrorKey.StateInvalid
        case "zip.invalid" | "zip.empty"             => KYCErrorKey.ZipInvalid
        case _                                       => KYCErrorKey.UnknownError
      }
      KYCRequestError(errorKey, message)
    }

    def toKBARequestError: KBARequestError = {
      val errorKey = key match {
        case "questions.expired" => KBAErrorKey.QuestionsExpired
        case _                   => KBAErrorKey.UnknownError
      }
      KBARequestError(errorKey, message)
    }
  }

  final case class GetKBAQuestionsRequest(apiKey: ApiKey, dataTransactionId: TransactionId, userFields: UserFields)
  final case class GetKBAQuestionsHTTPResponse(result: IdComplyKBAQuestionsResult)

  final case class SubmitKBAAnswersRequest(apiKey: ApiKey, questionsTransactionId: TransactionId, answers: List[Answer])
  final case class SubmitKBAAnswersHTTPResponse(result: SubmitKBAAnswersHTTPResult)
  final case class SubmitKBAAnswersHTTPResult(
      transactionId: TransactionId,
      summary: AnswersSummary,
      questions: Option[List[Question]])

  final case class TokenEndpoint(value: String)
  final case class TokenRedirectUrl(value: String)
  final case class TokenData(endpoint: TokenEndpoint, redirectUrl: TokenRedirectUrl, userId: PunterId)
  final case class CreateIDPVTokenHTTPRequest(apiKey: ApiKey, tokenData: TokenData)
  final case class CreateIDPVTokenHTTPResponse(result: CreateIDPVTokenHTTPResult)
  final case class CreateIDPVTokenHTTPResult(
      token: TokenId,
      openKey: OpenKey,
      creationTime: TokenCreationTime,
      expirationTime: TokenExpirationTime)
  final case class GetIDPVTokenStatusHTTPRequest(apiKey: ApiKey)

  sealed trait KycMatch extends EnumEntry with UpperSnakecase
  object KycMatch extends Enum[KycMatch] {
    override def values: immutable.IndexedSeq[KycMatch] = findValues

    final case object Full extends KycMatch
    final case object Partial extends KycMatch
    final case object Fail extends KycMatch
  }

  final case class AnswersSummary(`match`: KycMatch)

  final case class IdComplyKYCResult(
      idComplyMatch: IdComplyMatch,
      transactionId: TransactionId,
      alerts: List[Alert],
      details: List[Detail])

  sealed trait IdComplyMatch
  object IdComplyMatch {
    final object FailMatch extends IdComplyMatch
    final object PartialMatch extends IdComplyMatch
    final case class FullMatch(firstFiveDigitsSSN: First5DigitsOfSSN) extends IdComplyMatch
  }

  sealed trait IdComplyKBAQuestionsResult
  object IdComplyKBAQuestionsResult {
    final case class FullMatch(transactionId: TransactionId, questions: List[Question])
        extends IdComplyKBAQuestionsResult
    final case class FailMatch(message: String) extends IdComplyKBAQuestionsResult
  }

  implicit val tokenRedirectUrlCodec: Codec[TokenRedirectUrl] = deriveUnwrappedCodec
  implicit val tokenEndpointCodec: Codec[TokenEndpoint] = deriveUnwrappedCodec
  implicit val tokenDataCodec: Codec[TokenData] = deriveCodec

  implicit val httpErrorCodec: Codec[HTTPError] = deriveCodec
  implicit val httpErrorResponseCodec: Codec[HTTPErrorResponse] = deriveCodec

  implicit val knowYourCustomerRequestCodec: Codec[KnowYourCustomerRequest] = deriveCodec
  implicit val idComplyKYCResultCodec: Decoder[IdComplyKYCResult] =
    Decoder.instance[IdComplyKYCResult] { (c: HCursor) =>
      val summary = c.downField("summary")
      for {
        alerts <- c.downField("alerts").as[Option[List[Alert]]].map(_.getOrElse(List.empty))
        details <- c.downField("details").as[Option[List[Detail]]].map(_.getOrElse(List.empty))
        matchKey <- summary.downField("match").as[String]
        transactionId <- c.downField("transactionId").as[TransactionId]
        kycMatch <- matchKey match {
          case "full"          => summary.downField("ssn5").as[First5DigitsOfSSN].map(IdComplyMatch.FullMatch)
          case "partial"       => Right(IdComplyMatch.PartialMatch)
          case "fail"          => Right(IdComplyMatch.FailMatch)
          case unexpectedValue => c.fail(s"Expected valid `match` value but found '$unexpectedValue'")
        }
      } yield IdComplyKYCResult(kycMatch, transactionId, alerts, details)
    }
  implicit val kycResponseDecoder: Decoder[KnowYourCustomerHTTPResponse] = deriveDecoder
  implicit val getIDPVTokenStatusHTTPRequestCodec: Codec[GetIDPVTokenStatusHTTPRequest] = deriveCodec

  implicit val kbaResponseDecoder: Decoder[GetKBAQuestionsHTTPResponse] = deriveDecoder
  implicit val kbaQuestionsResultDecoder: Decoder[IdComplyKBAQuestionsResult] =
    Decoder.instance[IdComplyKBAQuestionsResult] { (c: HCursor) =>
      val summary = c.downField("summary")
      for {
        matchKey <- summary.downField("match").as[String]
        result <- matchKey match {
          case "full" =>
            for {
              transactionId <- c.downField("transactionId").as[TransactionId]
              questions <- c.downField("questions").as[List[Question]]
            } yield IdComplyKBAQuestionsResult.FullMatch(transactionId, questions)
          case "fail" =>
            summary.downField("message").as[String].map { message =>
              IdComplyKBAQuestionsResult.FailMatch(message)
            }
          case unexpectedValue =>
            c.fail[IdComplyKBAQuestionsResult](s"Expected valid `match` value but found '$unexpectedValue'")
        }
      } yield result
    }
  implicit val getKBAQuestionsRequestCodec: Codec[GetKBAQuestionsRequest] = deriveCodec
  implicit val submitKBAAnswersRequestCodec: Codec[SubmitKBAAnswersRequest] = deriveCodec
  implicit val submitKBAAnswersResultCodec: Codec[SubmitKBAAnswersHTTPResult] = deriveCodec
  implicit val submitKBAAnswersResponseCodec: Codec[SubmitKBAAnswersHTTPResponse] = deriveCodec
  implicit val idpvTokenHTTPRequestCodec: Codec[CreateIDPVTokenHTTPRequest] = deriveCodec
  implicit val createIDPVTokenHTTPResultCodec: Codec[CreateIDPVTokenHTTPResult] = deriveCodec
  implicit val createIDPVTokenHTTPResponseCodec: Codec[CreateIDPVTokenHTTPResponse] = deriveCodec
  implicit val tokenIdCodec: Codec[TokenId] = deriveUnwrappedCodec
  implicit val openKeyCodec: Codec[OpenKey] = deriveUnwrappedCodec
  implicit val tokenCreationTimeCodec: Codec[TokenCreationTime] =
    IdComplyOffsetDateTimeJsonCodec.bimap(_.value, TokenCreationTime.apply)
  implicit val tokenExpirationTimeCodec: Codec[TokenExpirationTime] =
    IdComplyOffsetDateTimeJsonCodec.bimap(_.value, TokenExpirationTime.apply)
  implicit val kycMatchCodec: Codec[KycMatch] = enumCodec(KycMatch)
  implicit val answersSummaryCodec: Codec[AnswersSummary] = deriveCodec
  implicit val questionTextCodec: Codec[QuestionText] = deriveUnwrappedCodec
  implicit val questionIdCodec: Codec[QuestionId] = deriveUnwrappedCodec
  implicit val answerChoicesCodec: Codec[AnswerChoices] = deriveUnwrappedCodec
  implicit val answerCodec: Codec[Answer] = deriveCodec
  implicit val questionCodec: Codec[Question] = deriveCodec
  implicit val detailFieldCodec: Codec[DetailField] = deriveUnwrappedCodec
  implicit val detailMessageCodec: Codec[DetailMessage] = deriveUnwrappedCodec
  implicit val detailDecoder: Decoder[Detail] = deriveDecoder
  implicit val alertKeyCodec: Codec[AlertKey] = deriveUnwrappedCodec
  implicit val alertMessageCodec: Codec[AlertMessage] = deriveUnwrappedCodec
  implicit val alertCodec: Codec[Alert] = deriveCodec
  implicit val transactionIdCodec: Codec[TransactionId] = deriveUnwrappedCodec
  implicit val punterIdCodec: Codec[PunterId] = deriveUnwrappedCodec
  implicit val firstNameCodec: Codec[FirstName] = deriveUnwrappedCodec
  implicit val lastNameCodec: Codec[LastName] = deriveUnwrappedCodec
  implicit val buildingNameCodec: Codec[BuildingName] = deriveUnwrappedCodec
  implicit val cityCodec: Codec[City] = deriveUnwrappedCodec
  implicit val stateCodec: Codec[State] = deriveUnwrappedCodec
  implicit val zipCodeCodec: Codec[ZipCode] = deriveUnwrappedCodec
  implicit val countryCodec: Codec[Country] = deriveUnwrappedCodec
  implicit val phoneNumberCodec: Codec[PhoneNumber] = deriveUnwrappedCodec
  implicit val dateOfBirthYearCodec: Codec[DateOfBirthYear] = deriveUnwrappedCodec
  implicit val dateOfBirthMonthCodec: Codec[DateOfBirthMonth] = deriveUnwrappedCodec
  implicit val dateOfBirthDayCodec: Codec[DateOfBirthDay] = deriveUnwrappedCodec
  implicit val lastFourDigitsOfSSNCodec: Codec[LastFourDigitsOfSocialSecurityNumber] = deriveUnwrappedCodec
  implicit val first5DigitsOfSSNCodec: Codec[First5DigitsOfSSN] = deriveUnwrappedCodec
  implicit val apiKeyCodec: Codec[ApiKey] = deriveUnwrappedCodec
  implicit val userFieldsCodec: Codec[UserFields] = deriveCodec

  implicit val idpvTokenStatusResponseCodec: Decoder[IDPVTokenStatusResponse] = new Decoder[IDPVTokenStatusResponse] {
    implicit val idpvTokenStatusResponseCompletedDecoder =
      Decoder.instance[IDPVTokenStatusResponse.Completed]((c: HCursor) =>
        c.downField("match").as[String].flatMap {
          case "full"          => c.downField("userFields").as[IDPVTokenStatusResponse.FullMatch]
          case "partial"       => Right(IDPVTokenStatusResponse.PartialMatch)
          case "fail"          => Right(IDPVTokenStatusResponse.FailMatch)
          case unexpectedMatch => c.fail(s"Unexpected IDPV token status match '$unexpectedMatch'")
        })
    override def apply(c: HCursor): Decoder.Result[IDPVTokenStatusResponse] = {
      val result = c.downField("result")
      result.downField("status").as[String].flatMap {
        case "complete"  => result.as[IDPVTokenStatusResponse.Completed]
        case "created"   => Right(IDPVTokenStatusResponse.Created)
        case "activated" => Right(IDPVTokenStatusResponse.Activated)
        case "archived"  => Right(IDPVTokenStatusResponse.Archived)
        case status      => c.fail(s"Unexpected IDPV token status '$status'")
      }
    }
  }
}
