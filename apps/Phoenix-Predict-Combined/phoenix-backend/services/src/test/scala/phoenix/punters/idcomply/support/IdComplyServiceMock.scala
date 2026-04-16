package phoenix.punters.idcomply.support

import scala.concurrent.Future

import cats.data.EitherT
import org.scalatest.Assertions.fail

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.idcomply.domain.CreateIDPVToken.CreateIDPVTokenResult
import phoenix.punters.idcomply.domain.CreateIDPVToken.CreateIDPVTokenWrongRequest
import phoenix.punters.idcomply.domain.GetKBAQuestions.GetKBAQuestionsWrongRequest
import phoenix.punters.idcomply.domain.GetKBAQuestions.KBAQuestionsResult
import phoenix.punters.idcomply.domain.RequestKYC.KYCError
import phoenix.punters.idcomply.domain.RequestKYC.KYCResult
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.KBAError
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.SubmitKBAAnswersResult
import phoenix.punters.idcomply.domain._

object IdComplyServiceMock {

  def apply(
      requestKYCFn: UserFields => EitherT[Future, KYCError, KYCResult] = _ => fail(),
      getKBAQuestionsFn: (
          TransactionId,
          UserFields) => EitherT[Future, GetKBAQuestionsWrongRequest.type, KBAQuestionsResult] = (_, _) => fail(),
      submitKBAAnswersFn: (TransactionId, List[Answer]) => EitherT[Future, KBAError, SubmitKBAAnswersResult] = (_, _) =>
        fail(),
      requestIDPVFn: PunterId => EitherT[Future, CreateIDPVTokenWrongRequest.type, CreateIDPVTokenResult] = _ => fail(),
      createIDPVUrlFn: (TokenId, OpenKey) => IDPVUrl = (_, _) => fail(),
      getIDPVTokenStatusFn: TokenId => Future[IDPVTokenStatusResponse] = _ => fail()): IdComplyService =
    new IdComplyService {
      override def requestKYC(userFields: UserFields): EitherT[Future, KYCError, KYCResult] =
        requestKYCFn(userFields)
      override def getKBAQuestions(
          transactionId: TransactionId,
          personalData: UserFields): EitherT[Future, GetKBAQuestionsWrongRequest.type, KBAQuestionsResult] =
        getKBAQuestionsFn(transactionId, personalData)
      override def submitKBAAnswers(
          questionsTransactionId: TransactionId,
          answers: List[Answer]): EitherT[Future, KBAError, SubmitKBAAnswersResult] =
        submitKBAAnswersFn(questionsTransactionId, answers)
      override def createIDPVToken(
          punterId: PunterId): EitherT[Future, CreateIDPVTokenWrongRequest.type, CreateIDPVTokenResult] =
        requestIDPVFn(punterId)
      override def createIDPVUrl(token: TokenId, openKey: OpenKey): IDPVUrl = createIDPVUrlFn(token, openKey)
      override def getIDPVTokenStatus(tokenId: TokenId): Future[IDPVTokenStatusResponse] = getIDPVTokenStatusFn(tokenId)
    }

  def failing(): IdComplyService =
    IdComplyServiceMock()
}
