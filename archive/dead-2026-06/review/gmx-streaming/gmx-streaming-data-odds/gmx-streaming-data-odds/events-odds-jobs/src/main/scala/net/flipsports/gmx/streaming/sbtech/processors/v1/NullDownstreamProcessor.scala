package net.flipsports.gmx.streaming.sbtech.processors.v1

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.sbtech.dto.{Id, Kind, Odds}
import net.flipsports.gmx.streaming.sbtech.SourceTypes
import net.flipsports.gmx.streaming.common.conversion.DateFormats
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.functions.ProcessFunction
import org.apache.flink.util.Collector

abstract class NullDownstreamProcessor[K, V ,S <: Tuple2[K, V]](kind: String) extends ProcessFunction[S, Odds]
  with LazyLogging {

  override def processElement(value: S, ctx: ProcessFunction[S, Odds]#Context, out: Collector[Odds]): Unit = {
    val id = Id(getKey(value.f0))
    val odds = if (!isNull(value)) {
      buildOdds(id, value)
    } else {
      Odds(id, getKind, DateFormats.nowEpochInMiliAtUtc())
    }
    out.collect(odds)
  }

  def getKind: Kind

  def getKey(source: K): String

  def isNull(source: S): Boolean  = Option(source.f1).isEmpty

  def buildOdds(id: Id, source: S): Odds

}

object NullDownstreamProcessor {

  def events() = new NullDownstreamProcessor[SourceTypes.Event.KeyType, SourceTypes.Event.ValueType, SourceTypes.Event.Source](Kind.Event.name) {
    override def getKey(source: SourceTypes.Event.KeyType): String = source.getId.toString

    override def getKind: Kind = Kind.Event

    override def buildOdds(id: Id, source:  SourceTypes.Event.Source): Odds = Odds(id = id,
      kind = getKind,
      eventTimestamp = source.f1.getLastUpdateDateTime,
      event = Some(source.f1)
    )
  }

  def markets() = new NullDownstreamProcessor[SourceTypes.Market.KeyType, SourceTypes.Market.ValueType, SourceTypes.Market.Source](Kind.Markets.name) {
    override def getKey(source: SourceTypes.Market.KeyType): String = source.getId.toString

    override def getKind: Kind = Kind.Markets

    override def buildOdds(id: Id, source:  SourceTypes.Market.Source): Odds = Odds(id = id,
      kind = getKind,
      eventTimestamp = source.f1.getLastUpdateDateTime,
      market = Some(source.f1)
    )
  }

  def selections() = new NullDownstreamProcessor[SourceTypes.Selection.KeyType, SourceTypes.Selection.ValueType, SourceTypes.Selection.Source](Kind.Selection.name) {
    override def getKey(source: SourceTypes.Selection.KeyType): String = source.getId.toString

    override def getKind: Kind = Kind.Selection

    override def buildOdds(id: Id, source:  SourceTypes.Selection.Source): Odds = Odds(id = id,
      kind = getKind,
      eventTimestamp = source.f1.getLastUpdateDateTime,
      selection = Some(source.f1)
    )
  }

}
