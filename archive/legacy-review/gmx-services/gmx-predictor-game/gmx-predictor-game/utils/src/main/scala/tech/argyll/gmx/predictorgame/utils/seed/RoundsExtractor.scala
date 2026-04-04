package tech.argyll.gmx.predictorgame.utils.seed

import java.sql.Timestamp
import java.time._
import java.time.temporal.{ChronoUnit, TemporalAdjusters}

import com.typesafe.scalalogging.LazyLogging
import tech.argyll.gmx.predictorgame.Tables.{Rounds, RoundsRow}
import tech.argyll.gmx.predictorgame.common.uuid.UUIDGenerator
import tech.argyll.gmx.predictorgame.domain.DbConfiguration
import tech.argyll.gmx.predictorgame.domain.model.LegacyConstants.COMPETITION_NFL2018

import scala.concurrent.Await
import scala.concurrent.duration.Duration

object RoundsExtractor extends App with LazyLogging with DbConfiguration {

  import config.profile.api._
  implicit val db = config.db

  val firstGameStartTime = LocalDateTime.of(2018, Month.SEPTEMBER, 6, 20, 20, 0).atZone(ZoneId.of("UTC-4"))
  val lastGameStartTime = LocalDateTime.of(2018, Month.DECEMBER, 30, 16, 25, 0).atZone(ZoneId.of("UTC-4"))

  def computeRounds(curr: ZonedDateTime, round: Int, res: List[RoundsRow]): List[RoundsRow] =
    if (!curr.isAfter(lastGameStartTime)) {
      val next = weekEndForDate(curr)
      val pickDeadline = pickDeadlineForDate(curr)
      logger.info(s"$round: $curr-$next")
      computeRounds(next, round + 1, res :+ RoundsRow(UUIDGenerator.uuid(), round, toTimestamp(curr), toTimestamp(next), Some(toTimestamp(pickDeadline)), COMPETITION_NFL2018.toString))
    } else {
      res
    }

  private def weekStartForDate(date: ZonedDateTime) =
    date.`with`(TemporalAdjusters.previous(DayOfWeek.TUESDAY)).truncatedTo(ChronoUnit.DAYS)

  private def weekEndForDate(date: ZonedDateTime) =
    date.`with`(TemporalAdjusters.next(DayOfWeek.TUESDAY)).truncatedTo(ChronoUnit.DAYS)

  private def pickDeadlineForDate(date: ZonedDateTime) =
    date.`with`(TemporalAdjusters.next(DayOfWeek.SUNDAY)).truncatedTo(ChronoUnit.DAYS).withHour(18).withZoneSameLocal(ZoneId.of("UTC+1"))

  private def toTimestamp(curr: ZonedDateTime) =
    Timestamp.from(curr.toInstant)


  val computed = computeRounds(weekStartForDate(firstGameStartTime), 1, Nil)

  Await.result(db.run(Rounds ++= computed), Duration.Inf)
}
