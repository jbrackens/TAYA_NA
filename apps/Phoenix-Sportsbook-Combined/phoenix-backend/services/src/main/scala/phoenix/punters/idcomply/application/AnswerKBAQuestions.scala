package phoenix.punters.idcomply.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.Clock
import phoenix.notes.application.InsertNotes
import phoenix.notes.domain.NoteRepository
import phoenix.notes.domain.NoteText
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.PuntersRepositoryErrors.PunterIdNotFoundInSettings
import phoenix.punters.domain.RegistrationOutcome
import phoenix.punters.idcomply.application.AnswerKBAQuestionsError.AnswerKBAFailed
import phoenix.punters.idcomply.application.AnswerKBAQuestionsError.IDPVFailed
import phoenix.punters.idcomply.application.AnswerKBAQuestionsError.PunterWasNotAskedForQuestions
import phoenix.punters.idcomply.application.AnswerKBAQuestionsOutput.AskMoreQuestions
import phoenix.punters.idcomply.application.AnswerKBAQuestionsOutput.UserVerifiedAndRegisteredCorrectly
import phoenix.punters.idcomply.domain.Answer
import phoenix.punters.idcomply.domain.CreateIDPVToken.CreateIDPVTokenWrongRequest
import phoenix.punters.idcomply.domain.Events
import phoenix.punters.idcomply.domain.IDPVUrl
import phoenix.punters.idcomply.domain.IdComplyService
import phoenix.punters.idcomply.domain.Question
import phoenix.punters.idcomply.domain.RegistrationEventRepository
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.KBAError
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.SubmitKBAAnswersResult
import phoenix.punters.idcomply.domain.TransactionId
import phoenix.utils.UUIDGenerator

final class AnswerKBAQuestions(
    puntersBoundedContext: PuntersBoundedContext,
    puntersRepository: PuntersRepository,
    registrationEventRepository: RegistrationEventRepository,
    idComplyService: IdComplyService,
    notesRepository: NoteRepository,
    uuidGenerator: UUIDGenerator,
    clock: Clock)(implicit ec: ExecutionContext) {

  private val requestIDPVFlow = new RequestIDPVProcess(idComplyService, registrationEventRepository, clock)
  private val insertNotesUseCase = new InsertNotes(notesRepository, clock, uuidGenerator)

  def handleAnswers(
      punterId: PunterId,
      answers: List[Answer]): EitherT[Future, AnswerKBAQuestionsError, AnswerKBAQuestionsOutput] =
    for {
      latestRegistrationEvent <- findLatestRegistrationEventOrFail(punterId)
      answerKBAQuestionsOutput <- decideNextStep(punterId, latestRegistrationEvent, answers)
    } yield answerKBAQuestionsOutput

  private def findLatestRegistrationEventOrFail(punterId: PunterId)
      : EitherT[Future, AnswerKBAQuestionsError.PunterWasNotAskedForQuestions.type, Events.RegistrationEvent] = {
    EitherT.fromOptionF(registrationEventRepository.latestEventForId(punterId), PunterWasNotAskedForQuestions)
  }

  private def decideNextStep(
      punterId: PunterId,
      latestRegistrationEvent: Events.RegistrationEvent,
      answers: List[Answer]): EitherT[Future, AnswerKBAQuestionsError, AnswerKBAQuestionsOutput] =
    latestRegistrationEvent match {
      case Events.PunterWasAskedQuestions(_, _, transactionId, _) =>
        for {
          submitKBAAnswersResult <- submitAnswers(punterId, transactionId, answers)
          output <- submitKBAAnswersResult match {
            case SubmitKBAAnswersResult.FullMatch =>
              confirmSuccessfulRegistration(punterId)

            case SubmitKBAAnswersResult.PartialMatch(transactionId, questions) =>
              askMoreQuestions(punterId, transactionId, questions)

            case SubmitKBAAnswersResult.FailMatch =>
              requestPhotoVerification(punterId)
          }
        } yield output
      case _ =>
        EitherT.leftT(PunterWasNotAskedForQuestions)
    }

  private def submitAnswers(
      punterId: PunterId,
      transactionId: TransactionId,
      answers: List[Answer]): EitherT[Future, AnswerKBAFailed, SubmitKBAAnswersResult] =
    for {
      _ <- EitherT.liftF(
        registrationEventRepository.save(
          Events.PunterAnsweredQuestions(punterId, clock.currentOffsetDateTime(), transactionId, answers)))
      submitKBAAnswersResult <- idComplyService.submitKBAAnswers(transactionId, answers).leftMap(AnswerKBAFailed)
    } yield submitKBAAnswersResult

  private def confirmSuccessfulRegistration(punterId: PunterId)
      : EitherT[Future, AnswerKBAQuestionsError, AnswerKBAQuestionsOutput.UserVerifiedAndRegisteredCorrectly.type] =
    for {
      _ <-
        puntersRepository
          .updateSettings(punterId, _.copy(isRegistrationVerified = true))
          .leftMap[AnswerKBAQuestionsError] {
            case PunterIdNotFoundInSettings => AnswerKBAQuestionsError.PunterNotFound
          }
      _ <-
        puntersBoundedContext
          .verifyPunter(punterId, ActivationPath.KBA)
          .leftMap[AnswerKBAQuestionsError](_ => AnswerKBAQuestionsError.PunterNotFound)
          .flatMap(_ =>
            EitherT.liftF[Future, AnswerKBAQuestionsError, Unit](
              insertNotesUseCase.insertSystemNote(punterId, NoteText.activeNote(exitPoint = "KBA"))))
      _ <-
        puntersRepository
          .markRegistrationFinished(punterId, RegistrationOutcome.Successful, clock.currentOffsetDateTime())
          .leftMap[AnswerKBAQuestionsError](_ => AnswerKBAQuestionsError.PunterNotFound)
    } yield UserVerifiedAndRegisteredCorrectly

  private def askMoreQuestions(
      punterId: PunterId,
      transactionId: TransactionId,
      questions: List[Question]): EitherT[Future, AnswerKBAQuestionsError, AskMoreQuestions] =
    EitherT
      .liftF[Future, AnswerKBAQuestionsError, Unit](
        registrationEventRepository.save(
          Events.PunterWasAskedQuestions(punterId, clock.currentOffsetDateTime(), transactionId, questions)))
      .map(_ => AskMoreQuestions(punterId, questions))

  private def requestPhotoVerification(punterId: PunterId)
      : EitherT[Future, AnswerKBAQuestionsError, AnswerKBAQuestionsOutput.RequireIdPhotoVerification] =
    requestIDPVFlow.requestIDPV(punterId).bimap(IDPVFailed, AnswerKBAQuestionsOutput.RequireIdPhotoVerification)
}

sealed trait AnswerKBAQuestionsOutput
object AnswerKBAQuestionsOutput {
  case object UserVerifiedAndRegisteredCorrectly extends AnswerKBAQuestionsOutput
  final case class AskMoreQuestions(punterId: PunterId, questions: List[Question]) extends AnswerKBAQuestionsOutput
  final case class RequireIdPhotoVerification(idpvRedirectUrl: IDPVUrl) extends AnswerKBAQuestionsOutput
}

sealed trait AnswerKBAQuestionsError
object AnswerKBAQuestionsError {
  case object PunterWasNotAskedForQuestions extends AnswerKBAQuestionsError
  final case class AnswerKBAFailed(error: KBAError) extends AnswerKBAQuestionsError
  case object PunterNotFound extends AnswerKBAQuestionsError
  final case class IDPVFailed(error: CreateIDPVTokenWrongRequest.type) extends AnswerKBAQuestionsError
}
