package net.flipsports.gmx.streaming.sbtech.udf

import net.flipsports.gmx.streaming.sbtech.SourceTypes
import net.flipsports.gmx.streaming.sbtech.SourceTypes.Odds.Source
import org.apache.flink.streaming.api.functions.ProcessFunction
import org.apache.flink.util.Collector

class OddsProcessor extends ProcessFunction[SourceTypes.Odds.Source, SourceTypes.Odds.Source] {
  override def processElement(value: Source, ctx: ProcessFunction[Source, Source]#Context, out: Collector[Source]): Unit = {
    out.collect(value)
  }
}

object OddsProcessor {

  def apply(): ProcessFunction[SourceTypes.Odds.Source, SourceTypes.Odds.Source] = new OddsProcessor()

}