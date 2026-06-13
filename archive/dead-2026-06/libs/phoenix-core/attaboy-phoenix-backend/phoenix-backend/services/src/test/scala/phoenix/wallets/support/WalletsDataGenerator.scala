package phoenix.wallets.support

import phoenix.support.DataGenerator
import phoenix.support.DataGenerator.generateIdentifier
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DataGenerator.randomUUID
import phoenix.wallets.WalletActorProtocol.events.ResponsibilityCheckAccepted
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.ResponsibilityCheckStatus
import phoenix.wallets.domain.ResponsibilityCheckTask
import phoenix.wallets.domain.ResponsibilityCheckTaskId

object WalletsDataGenerator {
  def generateWalletId(): WalletId =
    WalletId(generateIdentifier())

  def generateResponsibilityCheckStatus(): ResponsibilityCheckStatus =
    DataGenerator.randomElement(ResponsibilityCheckStatus.values)

  def generateResponsibilityCheckTask(): ResponsibilityCheckTask =
    ResponsibilityCheckTask(
      ResponsibilityCheckTaskId(randomUUID()),
      generateWalletId(),
      scheduledFor = randomOffsetDateTime())

  private[wallets] def generateResponsibilityCheckAccepted(): ResponsibilityCheckAccepted =
    ResponsibilityCheckAccepted(generateWalletId())
}
