package phoenix.punters.support

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.EitherTUtils._
import phoenix.punters.domain.TermsAndConditionsRepository.TermsAndConditionsErrors.WrongTermsValue
import phoenix.punters.domain._

class TermsAndConditionsRepositoryMock(implicit ec: ExecutionContext) extends TermsAndConditionsRepository {
  override def getCurrentTerms(): Future[Terms] =
    Future(
      Terms(CurrentTermsVersion(0), TermsContent("these are our terms, like them or leave"), TermsDaysThreshold(10)))

  override def insert(terms: Terms): EitherT[Future, WrongTermsValue.type, Unit] = EitherT.safeRightT(())
}
