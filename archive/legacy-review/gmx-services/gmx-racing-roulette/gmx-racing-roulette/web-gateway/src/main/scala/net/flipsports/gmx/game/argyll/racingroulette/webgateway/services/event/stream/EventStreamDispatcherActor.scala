package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.stream

import java.time.{LocalDateTime, ZoneOffset}

import akka.actor.{ActorRef, DiagnosticActorLogging, Timers}
import akka.event.Logging.MDC
import akka.event.{DiagnosticLoggingAdapter, Logging, LoggingReceive}
import akka.pattern.{ask, pipe}
import akka.stream.Materializer
import akka.util.Timeout
import net.flipsports.gmx.common.mdc.MDCOps
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements.StateUpdate
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.EventActor
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.Messages._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.stream.Messages.Cleanup

import scala.concurrent.ExecutionContext
import scala.concurrent.duration._

class EventStreamDispatcherActor()
                                (implicit mat: Materializer, ec: ExecutionContext)
  extends DiagnosticActorLogging with MDCOps with Timers {

  implicit val logger: DiagnosticLoggingAdapter = Logging(this)
  implicit val childTimeout: Timeout = Timeout(50.millis)

  // Make a map which will store child actors
  private var children = Map.empty[String, ActorRef]

  timers.startPeriodicTimer(Cleanup, Cleanup, 1.minutes)

  override def mdc(currentMessage: Any): MDC = extractCorrelationMDC(currentMessage)


  def receive: Receive = LoggingReceive {
    case msg: StateUpdate =>
      logger.debug(s"Dispatching change: ${msg.getClass.getSimpleName} for event: ${msg.eventId}")
      val future = getDedicatedChild(msg.eventId) ? msg
      val ack = future.recover {
        case e =>
          logger.error(s"Updating state: $msg FAILED with error: ${e.getMessage}")
          StreamLifecycle.Ack // ack to allow the stream to proceed sending more elements
      }
      pipe(ack) to sender()

    case msg: GetEventStream =>
      logger.info(s"Connecting to event: ${msg.eventId}")
      val future = getDedicatedChild(msg.eventId) ? msg
      pipe(future.mapTo[GetEventStreamResult]) to sender()

    case msg: GetEventState =>
      logger.info(s"Get event: ${msg.eventId}")
      val future = getDedicatedChild(msg.eventId) ? msg
      pipe(future.mapTo[GetEventStateResult]) to sender()

    case GetAllEvents =>
      logger.info(s"Get ALL events")
      sender() ! children.keys.toList

    case Cleanup =>
      logger.info(s"Cleanup EventActors started")
      stopOlderChildren()

    case msg: Stopped =>
      removeChild(msg)

    case msg => handleStreamLifecycle(msg)
  }

  private def handleStreamLifecycle(msg: Any) = msg match {
    case StreamLifecycle.StreamInitialized =>
      logger.info("Stream initialized!")
      sender() ! StreamLifecycle.Ack // ack to allow the stream to proceed sending more elements
    case StreamLifecycle.StreamCompleted =>
      logger.info("Stream completed!")
    case StreamLifecycle.StreamFailure(ex) =>
      logger.error(ex, "Stream failed!")
    case x: Any =>
      logger.error(s"UNSUPPORTED!! $x")
  }

  private def getDedicatedChild(eventId: String): ActorRef = {
    val name = getRoute(eventId)

    context.child(name).getOrElse(createChild(eventId, name))
  }

  private def getRoute(eventId: String): String = {
    s"eventStreamActor-$eventId"
  }

  def createChild(eventId: String, name: String): ActorRef = {
    val child = context.actorOf(EventActor.props(eventId, name), name)
    children += (eventId -> child)
    logger.info(s"After create - children size ${children.size}")
    child
  }

  def stopOlderChildren(): Unit = {
    val referenceDate = LocalDateTime.now().atZone(ZoneOffset.UTC).minusDays(1).toEpochSecond
    context.children.foreach(child => child ! StopIfOlder(referenceDate))
  }

  def removeChild(msg: Stopped): Unit = {
    logger.info(s"Event stopped, remove from map ${msg.eventId}")
    children -= msg.eventId
    logger.info(s"After remove - children size ${children.size}")
  }
}

object EventStreamDispatcherActor {

  trait Type

}
