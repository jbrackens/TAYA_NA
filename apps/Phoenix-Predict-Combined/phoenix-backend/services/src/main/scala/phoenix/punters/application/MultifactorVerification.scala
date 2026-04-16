package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.punters.domain.MultiFactorAuthenticationService
import phoenix.punters.domain.MultifactorVerificationCode
import phoenix.punters.domain.MultifactorVerificationId
import phoenix.punters.domain.VerificationFailure

final class MultifactorVerification(multiFactorAuthenticationService: MultiFactorAuthenticationService)(implicit
    ec: ExecutionContext) {

  def withMultifactorVerification[A, B](
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode)(
      ifValid: => EitherT[Future, A, B],
      errorMapping: VerificationFailure => A) = {
    multiFactorAuthenticationService
      .approveVerification(verificationId, verificationCode)
      .leftMap(errorMapping)
      .flatMap(_ => ifValid)
  }
}
