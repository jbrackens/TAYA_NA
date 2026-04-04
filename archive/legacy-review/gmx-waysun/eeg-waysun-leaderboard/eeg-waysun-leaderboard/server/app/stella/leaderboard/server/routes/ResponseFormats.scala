package stella.leaderboard.server.routes

import spray.json.DefaultJsonProtocol._
import spray.json.RootJsonFormat
import sttp.tapir.Schema

import stella.common.http.PaginatedResult
import stella.common.http.Response
import stella.common.http.error.ErrorOutput

import stella.leaderboard.models.AggregationResult
import stella.leaderboard.models.AggregationWindow

object ResponseFormats {

  val errorOutputFormats = new ErrorOutput.Formats()
  val errorOutputSchemas = new ErrorOutput.Schemas()

  implicit lazy val aggregationWindowSeqResponseFormat: RootJsonFormat[Response[Seq[AggregationWindow]]] =
    Response.responseFormat[Seq[AggregationWindow]]

  implicit lazy val aggregationResultsPageResponseFormat: RootJsonFormat[Response[PaginatedResult[AggregationResult]]] =
    Response.responseFormat[PaginatedResult[AggregationResult]]

  implicit lazy val aggregationResultSeqResponseFormat: RootJsonFormat[Response[Seq[AggregationResult]]] =
    Response.responseFormat[Seq[AggregationResult]]

  implicit lazy val aggregationResultsPageFormat: RootJsonFormat[PaginatedResult[AggregationResult]] = jsonFormat4(
    PaginatedResult[AggregationResult])

  implicit lazy val aggregationResultsPageSchema: Schema[PaginatedResult[AggregationResult]] =
    Schema.derived[PaginatedResult[AggregationResult]]
}
