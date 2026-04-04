package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg

import net.flipsports.gmx.common.internal.scala.core.exception.BaseException

class RMGServiceException(message: String) extends BaseException(message) {
  def this(message: String, cause: Throwable) {
    this(message)
    initCause(cause)
  }
}
