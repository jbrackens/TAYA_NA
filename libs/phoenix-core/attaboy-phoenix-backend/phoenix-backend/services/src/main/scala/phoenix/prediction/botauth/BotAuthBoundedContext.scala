package phoenix.prediction.botauth

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.prediction.common.BotAccountId

final case class BotApiKeyId(value: String) extends AnyVal

final case class CreateBotAccountCommand(
    accountKey: String,
    displayName: String,
    createdBy: String)

final case class IssueBotApiKeyCommand(
    accountId: BotAccountId,
    scopes: Set[String],
    expiresAt: Option[OffsetDateTime])

final case class IssuedApiKey(
    keyId: BotApiKeyId,
    token: String)

trait BotAuthBoundedContext {
  def createBotAccount(command: CreateBotAccountCommand)(implicit ec: ExecutionContext): Future[BotAccountId]

  def issueApiKey(command: IssueBotApiKeyCommand)(implicit ec: ExecutionContext): Future[IssuedApiKey]

  def revokeApiKey(accountId: BotAccountId, keyId: BotApiKeyId, revokedBy: String)(implicit
      ec: ExecutionContext): Future[Unit]
}
