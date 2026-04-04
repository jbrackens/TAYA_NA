package net.flipsports.gmx.common.mdc

import akka.event.DiagnosticLoggingAdapter
import akka.event.Logging.{MDC, emptyMDC}

trait MDCOps {

  def logger: DiagnosticLoggingAdapter

  def extractCorrelationMDC(o: Any): MDC = o match {
    case item: MDCCorrelationUUID => buildCorrelationMDC(item.extractUUID)
    case _ => emptyMDC
  }

  private def buildCorrelationMDC(uuid: String) = {
    Map("correlation_uuid" -> uuid)
  }

  def putCorrelation(uuid: String): Unit = {
    logger.mdc(buildCorrelationMDC(uuid))
  }

  def clear(): Unit = {
    logger.clearMDC()
  }
}
