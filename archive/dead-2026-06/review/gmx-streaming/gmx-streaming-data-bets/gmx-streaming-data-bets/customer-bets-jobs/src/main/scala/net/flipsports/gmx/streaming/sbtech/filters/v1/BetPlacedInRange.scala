package net.flipsports.gmx.streaming.sbtech.filters.v1

import java.time.ZonedDateTime

import org.apache.flink.api.common.functions.FilterFunction
import net.flipsports.gmx.streaming.sbtech.Types
import net.flipsports.gmx.streaming.sbtech.Types.Bets.Source
import net.flipsports.gmx.streaming.sbtech.mappers.DateFormats

class BetPlacedInRange(val leftIso: ZonedDateTime, val rightIso: ZonedDateTime) extends FilterFunction[Types.Bets.Source]{

  override def filter(value: Source): Boolean =  {
    val betCreatedDate = DateFormats.long2ZonedDateTime(value.f1.creationDate)
    val between = betCreatedDate.isAfter(leftIso) && betCreatedDate.isBefore(rightIso)
    val equals = betCreatedDate.isEqual(leftIso) || betCreatedDate.isEqual(rightIso)
    between || equals

  }
}

object BetPlacedInRange {

  def apply(leftIso: ZonedDateTime, rightIso: ZonedDateTime): FilterFunction[Types.Bets.Source] = new BetPlacedInRange(leftIso, rightIso)
}
