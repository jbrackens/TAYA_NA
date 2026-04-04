package net.flipsports.gmx.streaming.sbtech.streams.splits

import net.flipsports.gmx.streaming.sbtech.SideEffectsImplicits
import net.flipsports.gmx.streaming.sbtech.dto.Odds
import org.apache.flink.streaming.api.scala.OutputTag

object SideEffects {

  val events = OutputTag[Odds]("gmx-streaming.late-events")(SideEffectsImplicits.Events.keyWithValue)

  val markets = OutputTag[Odds]("gmx-streaming.late-markets")(SideEffectsImplicits.Markets.keyWithValue)

  val selections = OutputTag[Odds]("gmx-streaming.late-selections") (SideEffectsImplicits.Selections.keyWithValue)

}
