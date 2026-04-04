package net.flipsports.gmx.widget.argyll.betandwatch.events.api.exception

import com.lightbend.lagom.scaladsl.api.deser.{DefaultExceptionSerializer, RawExceptionMessage}
import com.lightbend.lagom.scaladsl.api.transport.{ExceptionMessage, MessageProtocol, TransportErrorCode, TransportException}
import net.flipsports.gmx.common.internal.scala.core.exception.BaseException
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.exception.ErrorCodes._
import play.api.Environment

import scala.collection.immutable

class CustomExceptionSerializer(environment: Environment)
  extends DefaultExceptionSerializer(environment) {


  // TODO change to strategies/iterator on exceptions
  override def serialize(exception: Throwable, accept: immutable.Seq[MessageProtocol]): RawExceptionMessage = {
    val translated = exception match {
      case e: EventNotFoundException =>
        new TransportException(TransportErrorCode.NotFound, new ExceptionMessage(EVENT_NOT_FOUND, fullMessageStack(e)), e)
      case e: StreamingNotAvailableException =>
        new TransportException(TransportErrorCode.NotFound, new ExceptionMessage(STREAMING_NOT_AVAILABLE, fullMessageStack(e)), e)
      case e: InvalidUserCountryException =>
        new TransportException(TransportErrorCode.Forbidden, new ExceptionMessage(INVALID_USER_COUNTRY, fullMessageStack(e)), e)
      case e: NoQualifyingBetException =>
        new TransportException(TransportErrorCode.Forbidden, new ExceptionMessage(NO_QUALIFYING_BET, fullMessageStack(e)), e)
      case e: VideoNotAvailableException =>
        new TransportException(TransportErrorCode.NotFound, new ExceptionMessage(VIDEO_NOT_AVAILABLE, fullMessageStack(e)), e)
      case e: UnauthorizedException =>
        new TransportException(TransportErrorCode.Forbidden, new ExceptionMessage(UNAUTHORISED, fullMessageStack(e)), e)
      case e: BaseException =>
        new TransportException(TransportErrorCode.UnexpectedCondition, new ExceptionMessage(GENERIC_ERROR, fullMessageStack(e)), e)

      case e => e
    }

    super.serialize(translated, accept)
  }

  override protected def fromCodeAndMessage(transportErrorCode: TransportErrorCode, exceptionMessage: ExceptionMessage): Throwable = {
    (transportErrorCode, exceptionMessage.name) match {
      case (TransportErrorCode.NotFound, EVENT_NOT_FOUND) =>
        new EventNotFoundException(exceptionMessage.detail)
      case (TransportErrorCode.NotFound, STREAMING_NOT_AVAILABLE) =>
        new StreamingNotAvailableException(exceptionMessage.detail)
      case (TransportErrorCode.Forbidden, INVALID_USER_COUNTRY) =>
        new InvalidUserCountryException(exceptionMessage.detail)
      case (TransportErrorCode.Forbidden, NO_QUALIFYING_BET) =>
        new NoQualifyingBetException(exceptionMessage.detail)
      case (TransportErrorCode.NotFound, VIDEO_NOT_AVAILABLE) =>
        new VideoNotAvailableException(exceptionMessage.detail)
      case (TransportErrorCode.Forbidden, UNAUTHORISED) =>
        new UnauthorizedException(exceptionMessage.detail)
      case (TransportErrorCode.UnexpectedCondition, GENERIC_ERROR) =>
        new BaseException(exceptionMessage.detail)

      case _ => super.fromCodeAndMessage(transportErrorCode, exceptionMessage)
    }
  }

  private def fullMessageStack(exception: Throwable): String = {
    listCauses(exception).map(_.getMessage).mkString(" CAUSE: ")
  }

  private def listCauses(exception: Throwable): List[Throwable] = {
    if (exception == null) {
      Nil
    } else {
      exception :: listCauses(exception.getCause)
    }
  }
}
