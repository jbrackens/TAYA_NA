package stella.leaderboard.models

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.LowerCamelcase
import enumeratum.PlayJsonEnum
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum

sealed trait PositionType extends EnumEntry with LowerCamelcase with TapirCodecEnumeratum {
  def sqlFunctionName: String
}

object PositionType extends Enum[PositionType] with PlayJsonEnum[PositionType] {
  override def values: IndexedSeq[PositionType] = findValues

  case object RowNumber extends PositionType {
    override val sqlFunctionName: String = "row_number"
  }

  case object Rank extends PositionType {
    override val sqlFunctionName: String = "rank"
  }

  case object DenseRank extends PositionType {
    override val sqlFunctionName: String = "dense_rank"
  }

  val description: String =
    s"""The window function used to compute the positions:
       |
       | - ${RowNumber.entryName} – each result has its unique, sequential position
       |
       | - ${Rank.entryName} – the same results have the same position, a next position is increased by the number of results for a previous position so there may be gaps
       |
       | - ${DenseRank.entryName} – the same results have the same position, there are not gaps between positions""".stripMargin
}
