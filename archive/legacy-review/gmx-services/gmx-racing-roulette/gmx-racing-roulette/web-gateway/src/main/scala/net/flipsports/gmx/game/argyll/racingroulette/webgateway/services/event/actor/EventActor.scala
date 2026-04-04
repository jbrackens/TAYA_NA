package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor

import akka.NotUsed
import akka.actor.{ActorRef, DiagnosticActorLogging, Props}
import akka.event.Logging.MDC
import akka.event.{DiagnosticLoggingAdapter, Logging, LoggingReceive}
import akka.stream._
import akka.stream.scaladsl.{BroadcastHub, Keep, Sink, Source}
import net.flipsports.gmx.common.mdc.MDCOps
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements.{EventsUpdate, MarketUpdate, SelectionUpdate, StateUpdate}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.Messages._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.actor.state.{EventStorage, InGameEvent}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.stream.StreamLifecycle

import scala.util.{Failure, Success, Try}

class EventActor(eventId: String, name: String)
                (implicit mat: Materializer)
  extends DiagnosticActorLogging
    with MDCOps {

  implicit val logger: DiagnosticLoggingAdapter = Logging(this)

  private lazy val (eventBroadcastIn, eventBroadcastOut, killSwitch): (ActorRef, Source[InGameEvent, NotUsed], KillSwitch) = buildEventStream()

  private var eventState: EventStorage = EventStorage.apply

  override def mdc(currentMessage: Any): MDC = extractCorrelationMDC(currentMessage)

  override def receive: Receive = LoggingReceive {
    case msg: StateUpdate =>
      handleStateUpdate(msg)
      sender() ! StreamLifecycle.Ack // ack to allow the stream to proceed sending more elements

    case _: GetEventStream =>
      sender() ! GetEventStreamResult(eventBroadcastOut)

    case _: GetEventState =>
      sender() ! GetEventStateResult(eventState.inGameEvent.copy())

    case msg: StopIfOlder =>
      logger.debug(s"Received cleanup notification $name")
      val stopped = stopIfOlder(msg)
      if (stopped) {
        logger.debug(s"Stopping $name")
        sender() ! Stopped(eventId)
      }

    case x: Any =>
      logger.error(s"UNSUPPORTED!! $x")
  }

  //POST STOP!!

  private def handleStateUpdate(msg: StateUpdate): Unit = {
    //TODO GM-921: check SelectionUpdate market
    Try(updateState(msg)) match {
      case Failure(resp) =>
        logger.error(resp, s"Could not update state: $msg")

      case Success(_) =>
        if (!eventState.isReady) {
          logger.info(s"Event not ready yet: ${msg.eventId} - skipping propagation")
        } else {
          logger.info(s"Event completed: ${msg.eventId} - propagate changes")
          eventBroadcastIn ! eventState.inGameEvent.copy()
        }
    }
  }

  private def updateState(message: StateUpdate): Unit = {
    val stateUpdated: EventStorage = message match {
      case e: SelectionUpdate => eventState.copyWithSelection(e)
      case e: MarketUpdate => eventState.copyWithMarket(e)
      case e: EventsUpdate => eventState.copyWithEvents(e)
    }
    eventState = stateUpdated
  }

  private def stopIfOlder(msg: StopIfOlder): Boolean = {
    val shouldStop = isOlder(msg.referenceTime)
    if (shouldStop) {
      context.stop(self)
    }
    shouldStop
  }

  private def isOlder(referenceTime: Long): Boolean = {
    if (eventState.isReady)
      eventState.inGameEvent.event.get.startEventDate.toEpochSecond < referenceTime
    else
      eventState.lastUpdate < referenceTime
  }

  override def postStop(): Unit = {
    killSwitch.shutdown()
  }

  private def buildEventStream(): (ActorRef, Source[InGameEvent, NotUsed], SharedKillSwitch) = {
    val flowName = s"flow-$name"
    logger.info(s"Starting eventStream: $flowName")

    val sharedKillSwitch = KillSwitches.shared(s"killswitch-$name")

    val (in, out) = Source.actorRef[InGameEvent](Int.MaxValue, OverflowStrategy.dropHead)
      .log(name)
      .via(sharedKillSwitch.flow)
      .toMat(BroadcastHub.sink(bufferSize = 16))(Keep.both)
      .named(flowName)
      .run()

    out
      .via(sharedKillSwitch.flow)
      .to(Sink.ignore)
      .named(s"$flowName-drainSink")
      .run()

    (in, out, sharedKillSwitch)
  }
}

object EventActor {

  def props(eventId: String, name: String)
           (implicit mat: Materializer) = Props(new EventActor(eventId, name))

}
