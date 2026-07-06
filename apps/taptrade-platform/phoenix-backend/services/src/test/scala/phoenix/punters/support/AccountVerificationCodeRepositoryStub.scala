package phoenix.punters.support

import java.util.UUID

import scala.concurrent.Future
import scala.concurrent.duration.FiniteDuration

import phoenix.core.Clock
import phoenix.core.TimeUtils._
import phoenix.punters.domain.AccountVerificationCode
import phoenix.punters.domain.AccountVerificationCodeRepository
import phoenix.support.DataGenerator

class AccountVerificationCodeRepositoryStub(clock: Clock)(
    var accountVerificationCodes: Map[UUID, AccountVerificationCode] = Map.empty)
    extends AccountVerificationCodeRepository {

  def generateUUID() = DataGenerator.randomUUID()

  override def create(userID: UUID, expiry: FiniteDuration): Future[AccountVerificationCode] =
    Future.successful {
      val token =
        AccountVerificationCode(id = generateUUID(), userID = userID, expiry = clock.currentOffsetDateTime() + expiry)
      accountVerificationCodes = accountVerificationCodes + (token.id -> token)
      token
    }

  override def validate(id: UUID): Future[Option[AccountVerificationCode]] = {
    Future.successful(accountVerificationCodes.get(id))
  }

  override def cleanExpired(): Future[Seq[AccountVerificationCode]] =
    Future.successful {
      val tokensToReturn = accountVerificationCodes.values.toSeq
      accountVerificationCodes = Map.empty
      tokensToReturn
    }
}
