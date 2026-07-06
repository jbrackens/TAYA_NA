package phoenix.punters.domain

import scala.concurrent.Future

import cats.data.EitherT

import phoenix.punters.domain.TermsAndConditionsRepository.TermsAndConditionsErrors.WrongTermsValue

trait TermsAndConditionsRepository {
  def getCurrentTerms(): Future[Terms]

  def insert(terms: Terms): EitherT[Future, WrongTermsValue.type, Unit]
}

final case class CurrentTermsVersion(value: Int)
final case class TermsContent(value: String)
final case class TermsDaysThreshold(value: Int)
final case class Terms(
    currentTermsVersion: CurrentTermsVersion,
    termsContent: TermsContent,
    termsDaysThreshold: TermsDaysThreshold)

object TermsAndConditionsRepository {
  object TermsAndConditionsErrors {
    case object WrongTermsValue
  }
}
