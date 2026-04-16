package phoenix.punters.domain

import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.OffsetDateTime
import java.util.UUID

import scala.concurrent.Future
import scala.concurrent.duration.FiniteDuration
import scala.concurrent.duration._

trait AccountVerificationCodeRepository {

  def create(userID: UUID, expiry: FiniteDuration = 5.minutes): Future[AccountVerificationCode]

  /**
   * @param id The token ID to validate.
   */
  def validate(id: UUID): Future[Option[AccountVerificationCode]]

  def cleanExpired(): Future[Seq[AccountVerificationCode]]
}

final case class AccountVerificationCode(id: UUID, userID: UUID, expiry: OffsetDateTime) {
  lazy val urlEncodedId: String = URLEncoder.encode(id.toString, StandardCharsets.UTF_8)
}
