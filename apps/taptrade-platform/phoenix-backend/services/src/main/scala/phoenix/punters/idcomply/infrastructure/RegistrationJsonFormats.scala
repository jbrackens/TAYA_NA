package phoenix.punters.idcomply.infrastructure

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

import scala.util.Try

import cats.syntax.either._
import io.circe.Codec
import io.circe.Decoder
import io.circe.HCursor
import io.circe.Json
import io.circe.generic.semiauto.deriveCodec
import io.circe.syntax._

import phoenix.core.JsonFormats._
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.idcomply.application.AnswerKBAQuestionsOutput
import phoenix.punters.idcomply.application.AnswerKBAQuestionsOutput.AskMoreQuestions
import phoenix.punters.idcomply.application.AskKnowledgeBasedAuthenticationQuestions
import phoenix.punters.idcomply.application.RegistrationResponse
import phoenix.punters.idcomply.application.RequireIdPhotoVerification
import phoenix.punters.idcomply.domain.Events
import phoenix.punters.idcomply.domain.Events.PunterFailedPhotoVerification
import phoenix.punters.idcomply.domain.Events._
import phoenix.punters.idcomply.domain.RequestKYC.KYCError
import phoenix.punters.idcomply.domain.RequestKYC.KYCError.WrongRequest
import phoenix.punters.idcomply.domain.RequestKYC.KYCErrorKey
import phoenix.punters.idcomply.domain.RequestKYC.RequestError
import phoenix.punters.idcomply.domain.UserFields._
import phoenix.punters.idcomply.domain._
import phoenix.punters.infrastructure.PunterJsonFormats._
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.AnswerKBAQuestionsRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.CheckIDPVStatusRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.StartIDPVResponse

object RegistrationJsonFormats {

  implicit val apiKeyCodec: Codec[ApiKey] = Codec[String].bimap(_.value, ApiKey.apply)

  implicit val firstNameCodec: Codec[FirstName] = Codec[String].bimap(_.value, FirstName.apply)
  implicit val lastNameCodec: Codec[LastName] = Codec[String].bimap(_.value, LastName.apply)
  implicit val buildingNameCodec: Codec[BuildingName] = Codec[String].bimap(_.value, BuildingName.apply)
  implicit val cityCodec: Codec[City] = Codec[String].bimap(_.value, City.apply)
  implicit val stateCodec: Codec[State] = Codec[String].bimap(_.value, State.apply)
  implicit val zipcodeCodec: Codec[ZipCode] = Codec[String].bimap(_.value, ZipCode.apply)
  implicit val countryCodec: Codec[Country] = Codec[String].bimap(_.value, Country.apply)
  implicit val dateOfBirthDayCodec: Codec[DateOfBirthDay] = Codec[Int].bimap(_.value, DateOfBirthDay.apply)
  implicit val dateOfBirthMonthCodec: Codec[DateOfBirthMonth] = Codec[Int].bimap(_.value, DateOfBirthMonth.apply)
  implicit val dateOfBirthYearCodec: Codec[DateOfBirthYear] = Codec[Int].bimap(_.value, DateOfBirthYear.apply)
  implicit val lastFourDigitsOfSocialSecurityNumberCodec: Codec[LastFourDigitsOfSocialSecurityNumber] =
    Codec[String].bimap(_.value, LastFourDigitsOfSocialSecurityNumber.apply)

  implicit val transactionIdCodec: Codec[TransactionId] = Codec[String].bimap(_.value, TransactionId.apply)

  implicit val alertKeyCodec: Codec[AlertKey] = Codec[String].bimap(_.value, AlertKey.apply)
  implicit val alertMessageCodec: Codec[AlertMessage] = Codec[String].bimap(_.value, AlertMessage.apply)
  implicit val alertCodec: Codec[Alert] = deriveCodec

  implicit val detailKeyCodec: Codec[DetailField] = Codec[String].bimap(_.value, DetailField.apply)
  implicit val detailMessageCodec: Codec[DetailMessage] = Codec[String].bimap(_.value, DetailMessage.apply)
  implicit val detailCodec: Codec[Detail] = deriveCodec

  implicit val activationPathCodec: Codec[ActivationPath] = deriveCodec

  implicit val questionTextCodec: Codec[QuestionText] = Codec[String].bimap(_.value, QuestionText.apply)
  implicit val questionIdCodec: Codec[QuestionId] = Codec[String].bimap(_.value, QuestionId.apply)
  implicit val answerChoicesCodec: Codec[AnswerChoices] = Codec[List[String]].bimap(_.value, AnswerChoices.apply)
  implicit val questionCodec: Codec[Question] = deriveCodec

  implicit val answerCodec: Codec[Answer] = deriveCodec

  implicit val tokenIdCodec: Codec[TokenId] = Codec[String].bimap(_.value, TokenId.apply)
  implicit val openKeyCodec: Codec[OpenKey] = Codec[String].bimap(_.value, OpenKey.apply)
  implicit val tokenCreationTimeCodec: Codec[TokenCreationTime] =
    IdComplyOffsetDateTimeJsonCodec.bimap(_.value, TokenCreationTime.apply)
  implicit val tokenExpirationTimeCodec: Codec[TokenExpirationTime] =
    IdComplyOffsetDateTimeJsonCodec.bimap(_.value, TokenExpirationTime.apply)

  implicit val idpvTokenStatusCodec: Codec[IDPVTokenStatus] = enumCodec(IDPVTokenStatus)

  implicit val kycResultCodec: Codec[KYCResultEventData] = new Codec[KYCResultEventData] {
    private val TypeConstant = "type"
    private val FailMatchConstant = "FAIL_MATCH"
    private val PartialMatchConstant = "PARTIAL_MATCH"
    private val FullMatchConstant = "FULL_MATCH"

    implicit val fullMatchCodec: Codec[KYCResultEventData.FullMatchEventData] = deriveCodec

    override def apply(kr: KYCResultEventData): Json =
      kr match {
        case KYCResultEventData.FailMatchEventData(_, _) => Json.obj(TypeConstant -> Json.fromString(FailMatchConstant))
        case KYCResultEventData.PartialMatchEventData(_, _) =>
          Json.obj(TypeConstant -> Json.fromString(PartialMatchConstant))
        case fullMatch: KYCResultEventData.FullMatchEventData =>
          Codec[Events.KYCResultEventData.FullMatchEventData]
            .apply(fullMatch)
            .mapObject(_.add(TypeConstant, Json.fromString(FullMatchConstant)))
      }
    override def apply(c: HCursor): Decoder.Result[KYCResultEventData] =
      for {
        tpe <- c.downField(TypeConstant).as[String]
        result <- tpe match {
          case FailMatchConstant    => Right(KYCResultEventData.FailMatchEventData(List.empty, List.empty))
          case PartialMatchConstant => Right(KYCResultEventData.PartialMatchEventData(List.empty, List.empty))
          case FullMatchConstant    => Codec[KYCResultEventData.FullMatchEventData].apply(c)
          case other                => c.fail(s"Cannot match type '$TypeConstant' - $other")
        }
      } yield result
  }

  implicit val requestErrorCodec: Codec[RequestError] = deriveCodec
  implicit val requestErrorKeyCodec: Codec[KYCErrorKey] = Codec[String].bimap(_.entryName, KYCErrorKey.withName)

  implicit val kycErrorCodec: Codec[KYCError] = new Codec[KYCError] {
    private val TypeConstant = "type"
    private val WrongRequestConstant = "WRONG_REQUEST"

    private implicit val wrongRequestFormat: Codec[WrongRequest] = deriveCodec

    override def apply(ke: KYCError): Json =
      ke match {
        case wrongRequest: KYCError.WrongRequest =>
          Codec[KYCError.WrongRequest]
            .apply(wrongRequest)
            .mapObject(_.add(TypeConstant, Json.fromString(WrongRequestConstant)))
      }

    override def apply(c: HCursor): Decoder.Result[KYCError] =
      for {
        tpe <- c.downField(TypeConstant).as[String]
        result <- tpe match {
          case WrongRequestConstant => Codec[KYCError.WrongRequest].apply(c)
          case other                => c.fail(s"Cannot match type '$TypeConstant' - $other")
        }
      } yield result
  }

  implicit val signUpEventDataCodec: Codec[SignUpEventData] = deriveCodec
  implicit val punterSignUpStartedCodec: Codec[PunterSignUpStarted] = deriveCodec
  implicit val punterGotSuccessfulKycResponseCodec: Codec[PunterGotSuccessfulKYCResponse] = deriveCodec
  implicit val punterGotFailedKYCResponseCodec: Codec[PunterGotFailedKYCResponse] = deriveCodec
  implicit val punterWasAskedQuestionsCodec: Codec[PunterWasAskedQuestions] = deriveCodec
  implicit val punterAnsweredQuestionsCodec: Codec[PunterAnsweredQuestions] = deriveCodec
  implicit val punterWasAskedForPhotoVerificationCodec: Codec[PunterWasAskedForPhotoVerification] = deriveCodec
  implicit val punterFailedPhotoVerificationCodec: Codec[PunterFailedPhotoVerification] = deriveCodec
  implicit val punterPhotoVerificationTokenStatusWasCheckedCodec: Codec[PunterPhotoVerificationTokenStatusWasChecked] =
    deriveCodec
  implicit val punterGotFailMatchQuestionsResponseCodec: Codec[PunterGotFailMatchQuestionsResponse] = deriveCodec

  implicit val registrationEventCodec: Codec[RegistrationEvent] = new Codec[RegistrationEvent] {

    private val punterSignUpStartedConstant = "punterSignUpStarted"
    private val punterGotSuccessfulKycResponseConstant = "punterGotSuccessfulKycResponse"
    private val punterGotFailedKycResponseConstant = "punterGotFailedKycResponse"
    private val punterWasAskedQuestionsConstant = "punterWasAskedQuestions"
    private val punterAnsweredQuestionsConstant = "punterAnsweredQuestions"
    private val punterWasAskedForPhotoVerificationConstant = "punterWasAskedForPhotoVerification"
    private val punterFailedPhotoVerificationConstant = "punterFailedPhotoVerification"
    private val punterPhotoVerificationTokenStatusWasCheckedConstant = "punterPhotoVerificationTokenStatusWasChecked"
    private val punterGotFailMatchQuestionsResponseConstant = "punterGotFailMatchQuestionsResponse"
    private val typeConstant = "type"

    override def apply(event: RegistrationEvent): Json =
      event match {
        case e: PunterSignUpStarted            => writeWithType(e, punterSignUpStartedConstant)
        case e: PunterGotSuccessfulKYCResponse => writeWithType(e, punterGotSuccessfulKycResponseConstant)
        case e: PunterGotFailedKYCResponse     => writeWithType(e, punterGotFailedKycResponseConstant)
        case e: PunterWasAskedQuestions        => writeWithType(e, punterWasAskedQuestionsConstant)
        case e: PunterAnsweredQuestions        => writeWithType(e, punterAnsweredQuestionsConstant)
        case e: PunterWasAskedForPhotoVerification =>
          writeWithType(e, punterWasAskedForPhotoVerificationConstant)
        case e: PunterFailedPhotoVerification => writeWithType(e, punterFailedPhotoVerificationConstant)
        case e: PunterPhotoVerificationTokenStatusWasChecked =>
          writeWithType(e, punterPhotoVerificationTokenStatusWasCheckedConstant)
        case e: PunterGotFailMatchQuestionsResponse =>
          writeWithType(e, punterGotFailMatchQuestionsResponseConstant)
      }

    private def writeWithType[T: Codec](e: T, typeKey: String): Json =
      e.asJson.mapObject(_.add(typeConstant, Json.fromString(typeKey)))

    override def apply(c: HCursor): Decoder.Result[RegistrationEvent] =
      for {
        eventType <- c.downField(typeConstant).as[String]
        result <- readFromType(eventType, c)
      } yield result

    private def readFromType(eventType: String, c: HCursor): Decoder.Result[RegistrationEvent] =
      eventType match {
        case `punterSignUpStartedConstant`                => c.as[PunterSignUpStarted]
        case `punterGotSuccessfulKycResponseConstant`     => c.as[PunterGotSuccessfulKYCResponse]
        case `punterGotFailedKycResponseConstant`         => c.as[PunterGotFailedKYCResponse]
        case `punterWasAskedQuestionsConstant`            => c.as[PunterWasAskedQuestions]
        case `punterAnsweredQuestionsConstant`            => c.as[PunterAnsweredQuestions]
        case `punterWasAskedForPhotoVerificationConstant` => c.as[PunterWasAskedForPhotoVerification]
        case `punterFailedPhotoVerificationConstant`      => c.as[PunterFailedPhotoVerification]
        case `punterPhotoVerificationTokenStatusWasCheckedConstant` =>
          c.as[PunterPhotoVerificationTokenStatusWasChecked]
        case `punterGotFailMatchQuestionsResponseConstant` =>
          c.as[PunterGotFailMatchQuestionsResponse]
        case _ => c.fail(s"Unexpected `type` field '$eventType'")
      }
  }

  implicit val idpvUrlCodec: Codec[IDPVUrl] = Codec[String].bimap(_.value, IDPVUrl)

  implicit val registrationResponseCodec: Codec[RegistrationResponse] = new Codec[RegistrationResponse] {
    private implicit val askKnowledgeBasedAuthenticationQuestionsCodec
        : Codec[AskKnowledgeBasedAuthenticationQuestions] = deriveCodec
    private implicit val requireIdPhotoVerificationCodec: Codec[RequireIdPhotoVerification] = deriveCodec

    private val typeConstant = "type"

    override def apply(response: RegistrationResponse): Json =
      response match {
        case askKBAQuestions: AskKnowledgeBasedAuthenticationQuestions =>
          Codec[AskKnowledgeBasedAuthenticationQuestions]
            .apply(askKBAQuestions)
            .mapObject(_.add(typeConstant, Json.fromString(RegistrationResponsesConstants.askKBAQuestions)))
        case requireIDPV: RequireIdPhotoVerification =>
          Codec[RequireIdPhotoVerification]
            .apply(requireIDPV)
            .mapObject(_.add(typeConstant, Json.fromString(RegistrationResponsesConstants.requireIDPV)))
      }

    override def apply(c: HCursor): Decoder.Result[RegistrationResponse] =
      c.fail("Read not needed / not supported right now. We're lazy. Sorry.")
  }

  implicit val answerKBAQuestionsRequestCodec: Codec[AnswerKBAQuestionsRequest] = deriveCodec

  implicit val answerKBAQuestionsOutputCodec: Codec[AnswerKBAQuestionsOutput] = new Codec[AnswerKBAQuestionsOutput] {

    private implicit val askMoreQuestionsCodec: Codec[AskMoreQuestions] = deriveCodec
    private implicit val requireIdPhotoVerificationCodec: Codec[AnswerKBAQuestionsOutput.RequireIdPhotoVerification] =
      deriveCodec

    private val typeConstant = "type"

    override def apply(response: AnswerKBAQuestionsOutput): Json =
      response match {
        case AnswerKBAQuestionsOutput.UserVerifiedAndRegisteredCorrectly =>
          Json.obj(typeConstant -> Json.fromString(RegistrationResponsesConstants.userVerifiedAndRegisteredCorrectly))
        case askMoreQuestions: AskMoreQuestions =>
          Codec[AskMoreQuestions]
            .apply(askMoreQuestions)
            .mapObject(_.add(typeConstant, Json.fromString(RegistrationResponsesConstants.askKBAQuestions)))
        case requireIDPV: AnswerKBAQuestionsOutput.RequireIdPhotoVerification =>
          Codec[AnswerKBAQuestionsOutput.RequireIdPhotoVerification]
            .apply(requireIDPV)
            .mapObject(_.add(typeConstant, Json.fromString(RegistrationResponsesConstants.requireIDPV)))
      }

    override def apply(c: HCursor): Decoder.Result[AnswerKBAQuestionsOutput] =
      c.fail("Read not needed / not supported right now. We're lazy. Sorry.")
  }

  implicit val checkIDPVStatusRequestCodec: Codec[CheckIDPVStatusRequest] = deriveCodec

  implicit val startIDPVResponseCodec: Codec[StartIDPVResponse] = deriveCodec
}

private object RegistrationResponsesConstants {
  val askKBAQuestions = "KBA_QUESTIONS"
  val userVerifiedAndRegisteredCorrectly: String = "SUCCESSFUL_REGISTRATION_AND_VERIFICATION"
  val requireIDPV: String = "REQUIRE_IDPV"
}

private object IdComplyOffsetDateTimeJsonCodec extends Codec[OffsetDateTime] {
  // ID Comply sends dates in a weird format such as 2021-05-28T12:01:28+0000, so we need a custom serializer for them.
  // We cannot use DateTimeFormatter.ISO_OFFSET_DATE_TIME.
  private val idComplyFormatter =
    DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssxx")

  override def apply(odt: OffsetDateTime): Json =
    Json.fromString(idComplyFormatter.format(odt.atZoneSameInstant(ZoneOffset.UTC)))

  override def apply(c: HCursor): Decoder.Result[OffsetDateTime] =
    c.as[String]
      .flatMap(s =>
        Try(OffsetDateTime.parse(s, idComplyFormatter)).toEither.leftFlatMap { _ =>
          val example = idComplyFormatter.format(OffsetDateTime.of(2012, 1, 1, 12, 34, 56, 0, ZoneOffset.UTC))
          c.fail(
            s"'$s' is not a valid date-time value. Date-times must be in the correct ID Comply format, e.g. '$example'")
        })
}
