package net.flipsports.gmx.widget.argyll.betandwatch.events.api.exception

import net.flipsports.gmx.common.internal.scala.core.exception.{BaseException, NotLoggedException}

class VideoNotAvailableException(message: String) extends BaseException(message) with NotLoggedException {
  def this(message: String, cause: Throwable) {
    this(message)
    initCause(cause)
  }
}
