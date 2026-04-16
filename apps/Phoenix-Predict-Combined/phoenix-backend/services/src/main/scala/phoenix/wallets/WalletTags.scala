package phoenix.wallets

import phoenix.sharding.ProjectionTags.ProjectionTag

object WalletTags {

  val allWalletEventsNotSharded = ProjectionTag("all-wallet-events")

  val walletTags: Vector[ProjectionTag] = Vector(
    ProjectionTag("wallets-0"),
    ProjectionTag("wallets-1"),
    ProjectionTag("wallets-2"),
    ProjectionTag("wallets-3"),
    ProjectionTag("wallets-4"),
    ProjectionTag("wallets-5"),
    ProjectionTag("wallets-6"),
    ProjectionTag("wallets-7"),
    ProjectionTag("wallets-8"),
    ProjectionTag("wallets-9"))
}
