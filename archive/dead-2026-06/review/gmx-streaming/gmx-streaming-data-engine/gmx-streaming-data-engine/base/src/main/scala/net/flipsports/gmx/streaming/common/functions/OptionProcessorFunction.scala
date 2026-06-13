package net.flipsports.gmx.streaming.common.functions
import net.flipsports.gmx.streaming.common._
import net.flipsports.gmx.streaming.common.conversion.OptionOps

object OptionProcessorFunction {

  def transformOrNull[IN, OUT](record: IN) (transform: IN => OUT): OUT =
    OptionOps.onNullOr[IN, OUT](record) (nullRecord) (transform)
}
