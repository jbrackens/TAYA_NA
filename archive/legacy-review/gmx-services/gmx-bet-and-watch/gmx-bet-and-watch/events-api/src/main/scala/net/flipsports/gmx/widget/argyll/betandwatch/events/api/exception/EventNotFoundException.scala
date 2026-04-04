package net.flipsports.gmx.widget.argyll.betandwatch.events.api.exception

import net.flipsports.gmx.common.internal.scala.core.exception.{BaseException, NotLoggedException}

class EventNotFoundException(message: String) extends BaseException(message) with NotLoggedException
