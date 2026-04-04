package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api

import net.flipsports.gmx.common.mdc.MDCCorrelationUUID

object Metadata {

  case class RequestMetadata(requestId: Option[String], operation: Operation, eventId: String, simulateError: Option[String] = None) extends MDCCorrelationUUID {
    override def extractUUID: String = requestId.getOrElse("NO_REQUEST_ID_UUID")
  }

  trait ResponseMetadata extends MDCCorrelationUUID {
    def requestId: Option[String]

    def operation: Operation

    def eventId: String

    def lastUpdated: Long

    override def extractUUID: String = requestId.getOrElse("NO_REQUEST_ID_UUID")
  }

  case class SuccessMetadata(requestId: Option[String], operation: Operation, eventId: String, lastUpdated: Long, result: String = "SUCCESS") extends ResponseMetadata

  case class FailureMetadata(requestId: Option[String], operation: Operation, eventId: String, lastUpdated: Long, result: String = "FAILED") extends ResponseMetadata

  object ResponseMetadata {
    def success(reqMeta: RequestMetadata): SuccessMetadata = {
      SuccessMetadata(reqMeta.requestId, reqMeta.operation, reqMeta.eventId, System.currentTimeMillis())
    }

    def failure(reqMeta: RequestMetadata): FailureMetadata = {
      FailureMetadata(reqMeta.requestId, reqMeta.operation, reqMeta.eventId, System.currentTimeMillis())
    }
  }

}
