package stella.wallet.services.projections

import stella.wallet.models.Ids.WalletKey

class WalletTags(numberOfShards: Int) {
  require(numberOfShards > 0, "Number of shards must be positive")

  val walletTags: Seq[WalletTag] = (0 to numberOfShards).map(i => WalletTag(s"wallet-tx-$i"))

  def from(walletKey: WalletKey): WalletTag = walletTags(math.abs(walletKey.hashCode % walletTags.length))
}

object WalletTags {
  // in case at some point we'd need to process all events
  val allWalletTransactionsTag = WalletTag("all-wallet-txs")
}

final case class WalletTag(value: String)
