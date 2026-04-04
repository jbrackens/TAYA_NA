package phoenix.betgenius.domain

object BetgeniusProvider {
  val prefix = "b"
}

trait BetgeniusId {
  def value: Int
  val prefix: String
  def namespaced = s"$prefix:${BetgeniusProvider.prefix}:$value"
}
