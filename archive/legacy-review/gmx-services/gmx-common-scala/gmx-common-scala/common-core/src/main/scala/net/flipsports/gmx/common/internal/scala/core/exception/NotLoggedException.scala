package net.flipsports.gmx.common.internal.scala.core.exception

/** Base exception for all exceptions that should not be logged by Lagom transport layer
 * <p>
 * We do not want to log business exceptions on ERROR level, but current implementation does not allow any customisation
 * <p>
 * There is open bug for this functionality until it's solved the only way to control logs is to filter in logback [[https://github.com/lagom/lagom/issues/425]]
 * <p>
 * To achieve that:
 * <ul>
 * <li>there is custom turbofilter (for performance) that rejects the entries for given logger and exception
 * <li>above filter is configured in logback.xml to DENY log entries for all exceptions that inherits from this class.
 * </ul>
 * @see [[com.lightbend.lagom.internal.scaladsl.server.ScaladslServiceRouter.maybeLogException]]
 * @see [[net.flipsports.gmx.common.internal.java.core.exception.RejectExceptionLogFilter]]
 */
trait NotLoggedException
