package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr

import net.flipsports.gmx.common.internal.scala.core.exception.BaseException

class ATRServiceException(message: String) extends BaseException(message) {
  def this(message: String, cause: Throwable) {
    this(message)
    initCause(cause)
  }
}
