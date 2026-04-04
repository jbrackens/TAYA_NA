package net.flipsports.gmx.streaming.common

import com.typesafe.scalalogging.Logger
import org.slf4j.event.Level

package object logging {

  def log(logger: Logger, message: String, level: Level): Unit = level match {
    case Level.DEBUG => logger.debug(message)
    case Level.INFO => logger.info(message)
    case Level.TRACE => logger.trace(message)
    case Level.ERROR => logger.error(message)
    case Level.WARN => logger.warn(message)
  }

}
