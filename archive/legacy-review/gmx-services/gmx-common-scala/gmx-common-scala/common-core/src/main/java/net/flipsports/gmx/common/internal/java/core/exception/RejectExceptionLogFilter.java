package net.flipsports.gmx.common.internal.java.core.exception;


import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.turbo.MatchingFilter;
import ch.qos.logback.core.spi.FilterReply;
import org.slf4j.Marker;

/**
 * Allows rejecting log entries with specified exception (hierarchy) for given logger
 */
public class RejectExceptionLogFilter extends MatchingFilter {

  String loggerName;
  Class<?> exceptionClass;

  @Override
  public void start() {
    if (loggerName == null) {
      addError("The loggerName property must be set for [" + getName() + "]");
      return;
    }
    if (exceptionClass == null) {
      addError("The exceptionClass property must be set for [" + getName() + "]");
      return;
    }

    super.start();
  }

  @Override
  public FilterReply decide(Marker marker, Logger logger, Level level, String format, Object[] params, Throwable t) {
    if (!isStarted()) {
      return FilterReply.NEUTRAL;
    }

    if ((logger == null)
        || (t == null)) {
      return onMismatch;
    }

    if (loggerName.equals(logger.getName())
        && exceptionClass.isAssignableFrom(t.getClass())) {
      return onMatch;
    } else {
      return onMismatch;
    }
  }

  public void setLoggerName(String loggerName) {
    this.loggerName = loggerName;
  }

  public void setExceptionClass(String exceptionClass) throws ClassNotFoundException {
    if (exceptionClass != null) {
      this.exceptionClass = Class.forName(exceptionClass);
    }
  }
}
