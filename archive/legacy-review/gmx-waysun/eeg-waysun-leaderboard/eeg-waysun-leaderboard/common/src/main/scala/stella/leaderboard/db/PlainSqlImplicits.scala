package stella.leaderboard.db

import java.sql.JDBCType
import java.time.OffsetDateTime
import java.util.UUID

import slick.jdbc.GetResult
import slick.jdbc.PositionedParameters
import slick.jdbc.SetParameter

import stella.common.core.OffsetDateTimeUtils

import stella.leaderboard.models.AggregationResult

trait PlainSqlImplicits {

  implicit val getOptionalOffsetDateTimeResult: GetResult[Option[OffsetDateTime]] =
    GetResult(r => r.nextStringOption().map(parsePostgresDateTimeAsUtcOffsetDateTime))

  implicit val getOffsetDateTimeResult: GetResult[OffsetDateTime] =
    GetResult(r => parsePostgresDateTimeAsUtcOffsetDateTime(r.nextString()))

  implicit val getAggregationResultResult: GetResult[AggregationResult] =
    GetResult(r => AggregationResult(r.<<, r.<<, r.<<, r.<<, r.<<, r.<<, r.<<, r.<<, r.<<, r.<<, r.<<))

  implicit val setUuidParameter: SetParameter[UUID] = (id: UUID, params: PositionedParameters) =>
    params.setObject(id, JDBCType.BINARY.getVendorTypeNumber)

  implicit val setOffsetDateTimeParameter: SetParameter[OffsetDateTime] =
    (id: OffsetDateTime, params: PositionedParameters) => params.setObject(id, JDBCType.BINARY.getVendorTypeNumber)

  implicit val setStringListParameter: SetParameter[Seq[String]] =
    (strings: Seq[String], params: PositionedParameters) => strings.foreach(params.setString)

  private def parsePostgresDateTimeAsUtcOffsetDateTime(s: String) =
    OffsetDateTimeUtils.asUtc(OffsetDateTime.parse(s.replaceFirst(" ", "T")))
}
