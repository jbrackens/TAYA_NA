package phoenix.oddin

import akka.stream.scaladsl.SourceQueue
import com.oddin.oddsfeedsdk.api.entities.sportevent.SportEvent
import com.oddin.oddsfeedsdk.config.{ ExceptionHandlingStrategy, OddsFeedConfiguration, OddsFeedConfigurationBuilder }
import com.oddin.oddsfeedsdk.mq.{ MessageInterest, entities => oddin }
import com.oddin.oddsfeedsdk.schema.utils.URN
import com.oddin.oddsfeedsdk.subscribe.{ GlobalEventsListener, OddsFeedListener }
import com.oddin.oddsfeedsdk.{ OddsFeed, OddsFeedSession }
import org.slf4j.LoggerFactory

class OddinFeed(oddsFeed: OddsFeed) {
  def open(): Unit = oddsFeed.open()
  def close(): Unit = oddsFeed.close()
}
object OddinFeed {

  val log = LoggerFactory.getLogger(classOf[OddinFeed])

  implicit class OddsConfigBuilderExtension(val builder: OddsFeedConfigurationBuilder) extends AnyVal {
    def setOddsEnvironment(isProduction: Boolean): OddsFeedConfigurationBuilder =
      if (isProduction) builder.selectProduction()
      else builder.selectIntegration()
  }

  def apply(
      AccessToken: String,
      isProduction: Boolean,
      eventQueue: SourceQueue[oddin.EventMessage[SportEvent]]): OddinFeed = {
    log.info("initializing Oddin feed")

    val oddsFeedConfig: OddsFeedConfiguration = OddsFeed.getOddsFeedConfigurationBuilder
      .setOddsEnvironment(isProduction)
      .setExceptionHandlingStrategy(ExceptionHandlingStrategy.CATCH)
      .setAccessToken(AccessToken)
      .setSDKNodeId(1)
      .build()

    val oddsFeed: OddsFeed = new OddsFeed(
      new GlobalEventsListener() {
        override def onConnectionDown(): Unit =
          log.warn("Connection down")

        override def onEventRecoveryCompleted(eventId: URN, l: Long): Unit =
          log.info("Event recovery completed {}", eventId)

        override def onProducerStatusChange(producerStatus: oddin.ProducerStatus): Unit =
          log.info("Producer Status changed {}", producerStatus.getProducerStatusReason)
      },
      oddsFeedConfig)

    oddsFeed.getSessionBuilder
      .setMessageInterest(MessageInterest.ALL)
      .setListener(new OddsFeedListener() {
        override def onBetCancel(oddsFeedSession: OddsFeedSession, betCancel: oddin.BetCancel[SportEvent]): Unit = ()

        override def onBetSettlement(
            oddsFeedSession: OddsFeedSession,
            betSettlement: oddin.BetSettlement[SportEvent]): Unit =
          ()

        override def onBetStop(oddsFeedSession: OddsFeedSession, betStop: oddin.BetStop[SportEvent]): Unit = ()

        override def onFixtureChange(
            oddsFeedSession: OddsFeedSession,
            fixtureChange: oddin.FixtureChange[SportEvent]): Unit =
          eventQueue.offer(fixtureChange)

        override def onOddsChange(oddsFeedSession: OddsFeedSession, oddsChange: oddin.OddsChange[SportEvent]): Unit =
          eventQueue.offer(oddsChange)

        override def onUnparsableMessage(
            oddsFeedSession: OddsFeedSession,
            unparsableMessage: oddin.UnparsableMessage[SportEvent]): Unit =
          log.warn("Unparsable message received {}", unparsableMessage)
      })
      .build()

    new OddinFeed(oddsFeed)
  }
}
