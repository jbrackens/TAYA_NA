package phoenix.betgenius.domain
import enumeratum.EnumEntry.Camelcase
import enumeratum._
import io.circe.generic.extras.ConfiguredJsonCodec
import io.scalaland.chimney.Transformer

import phoenix.dataapi.shared

@ConfiguredJsonCodec(decodeOnly = true)
case class ResultSet(fixtureId: FixtureId, results: Seq[MarketResult])

@ConfiguredJsonCodec(decodeOnly = true)
case class MarketResult(marketId: MarketId, results: Seq[Result])

@ConfiguredJsonCodec(decodeOnly = true)
case class Result(selectionId: SelectionId, resultStatus: ResultStatus)
object Result {
  implicit val toSelectionResultTransformer: Transformer[Result, shared.SelectionResult] =
    Transformer
      .define[Result, shared.SelectionResult]
      .withFieldComputed(_.selectionId, _.selectionId.namespaced)
      .withFieldRenamed(_.resultStatus, _.result)
      .buildTransformer

}

sealed trait ResultStatus extends EnumEntry with Camelcase
object ResultStatus extends Enum[ResultStatus] with CirceEnum[ResultStatus] {
  override def values: IndexedSeq[ResultStatus] = findValues

  final case object None extends ResultStatus
  final case object Winner extends ResultStatus
  final case object Pushed extends ResultStatus
  final case object Loser extends ResultStatus
  final case object Placed extends ResultStatus
  final case object Partial extends ResultStatus

  implicit val toSharedResultTransformer: Transformer[ResultStatus, shared.Result] = {
    case None    => shared.Result.None
    case Winner  => shared.Result.Winner
    case Pushed  => shared.Result.None
    case Loser   => shared.Result.Loser
    case Placed  => shared.Result.Placed
    case Partial => shared.Result.Partial
  }
}
