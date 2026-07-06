package phoenix.core.domain
import enumeratum.CirceEnum
import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

import phoenix.betgenius.domain.BetgeniusProvider
import phoenix.oddin.domain.OddinProvider

sealed abstract class DataProvider(val prefix: String) extends EnumEntry with UpperSnakecase
object DataProvider extends Enum[DataProvider] with CirceEnum[DataProvider] {
  override def values: IndexedSeq[DataProvider] = findValues
  case object Oddin extends DataProvider(OddinProvider.prefix)
  case object Betgenius extends DataProvider(BetgeniusProvider.prefix)
  case object Phoenix extends DataProvider("p")

  def unsafeWithPrefix(prefix: String) = withPrefix(prefix).get
  def withPrefix(prefix: String) = values.find(_.prefix == prefix)
}
