package net.flipsports.gmx.streaming.common.conversion

object OptionOps {

  def onNullOr[IN, R](value: IN)(onNull: IN => R) (or: IN => R) : R = Option(value) match {
    case None => onNull(value)
    case Some(_) => or(value)
  }
}
