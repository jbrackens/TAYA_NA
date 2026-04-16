package phoenix.punters.support

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.EitherTUtils._
import phoenix.punters.PunterDataGenerator
import phoenix.punters.domain.MobilePhoneNumber
import phoenix.punters.domain.MultiFactorAuthenticationService
import phoenix.punters.domain.MultifactorVerificationCode
import phoenix.punters.domain.MultifactorVerificationId
import phoenix.punters.domain.SendVerificationCodeFailure
import phoenix.punters.domain.VerificationFailure

class TestMultiFactorAuthenticationService(implicit ec: ExecutionContext) extends MultiFactorAuthenticationService {

  override def sendVerificationCode(
      mobilePhoneNumber: MobilePhoneNumber): EitherT[Future, SendVerificationCodeFailure, MultifactorVerificationId] =
    EitherT.safeRightT(PunterDataGenerator.generateTwilioVerificationId())

  override def approveVerification(
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode): EitherT[Future, VerificationFailure, Unit] =
    EitherT.safeRightT(())
}
