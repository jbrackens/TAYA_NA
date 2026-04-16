package phoenix.oddin.infrastructure

import java.nio.charset.StandardCharsets

import com.oddin.oddsfeedsdk.OddsFeed
import com.oddin.oddsfeedsdk.OddsFeedSession
import com.oddin.oddsfeedsdk.api.entities.sportevent.SportEvent
import com.oddin.oddsfeedsdk.config.ExceptionHandlingStrategy
import com.oddin.oddsfeedsdk.config.OddsFeedConfiguration
import com.oddin.oddsfeedsdk.config.OddsFeedConfigurationBuilder
import com.oddin.oddsfeedsdk.mq.MessageInterest
import com.oddin.oddsfeedsdk.mq.entities
import com.oddin.oddsfeedsdk.mq.entities._
import com.oddin.oddsfeedsdk.schema.utils.URN
import com.oddin.oddsfeedsdk.subscribe.GlobalEventsListener
import com.oddin.oddsfeedsdk.subscribe.OddsFeedListener
import org.slf4j.LoggerFactory

import phoenix.core.UnitUtils._
import phoenix.oddin.domain.OddinMessageHandler
import phoenix.oddin.infrastructure.OddinEnvironment.isProduction

class OddinSdkConnection(oddsFeed: OddsFeed) {
  def open(): Unit = oddsFeed.open()
  def close(): Unit = oddsFeed.close()
}

object OddinSdkConnection {

  private val log = LoggerFactory.getLogger(getClass)

  type OddinMessageString = String

  implicit class OddsConfigBuilderOps(val builder: OddsFeedConfigurationBuilder) {
    def setOddsEnvironment(isProduction: Boolean): OddsFeedConfigurationBuilder =
      if (isProduction) builder.selectProduction()
      else builder.selectIntegration()
  }

  def apply(
      accessToken: String,
      nodeId: Int,
      environment: OddinEnvironment,
      listener: OddinMessageHandler): OddinSdkConnection = {
    log.info("initializing Oddin feed")

    val oddsFeedConfig: OddsFeedConfiguration = OddsFeed.getOddsFeedConfigurationBuilder
      .setOddsEnvironment(isProduction(environment))
      .setExceptionHandlingStrategy(ExceptionHandlingStrategy.CATCH)
      .setAccessToken(accessToken)
      .setSDKNodeId(nodeId)
      .build()

    val oddsFeed: OddsFeed = new OddsFeed(LoggingGlobalEventsListener, oddsFeedConfig)

    oddsFeed.getSessionBuilder
      .setMessageInterest(MessageInterest.ALL)
      .setListener(new OddinOddsFeedListener(listener))
      .build()

    new OddinSdkConnection(oddsFeed)
  }

  private class OddinOddsFeedListener(listener: OddinMessageHandler) extends OddsFeedListener {

    private val log = LoggerFactory.getLogger(getClass)

    override def onBetCancel(session: OddsFeedSession, betCancel: entities.BetCancel[SportEvent]): Unit =
      toUtf8String(betCancel).map(str => listener.onBetCancel(OddinMessageHandler.BetCancel(str))).toUnit()

    override def onBetSettlement(session: OddsFeedSession, betSettlement: entities.BetSettlement[SportEvent]): Unit =
      toUtf8String(betSettlement).map(str => listener.onBetSettlement(OddinMessageHandler.BetSettlement(str))).toUnit()

    override def onBetStop(session: OddsFeedSession, betStop: entities.BetStop[SportEvent]): Unit =
      toUtf8String(betStop).map(str => listener.onBetStop(OddinMessageHandler.BetStop(str))).toUnit()

    override def onFixtureChange(session: OddsFeedSession, fixtureChange: entities.FixtureChange[SportEvent]): Unit =
      toUtf8String(fixtureChange).map(str => listener.onFixtureChange(OddinMessageHandler.FixtureChange(str))).toUnit()

    override def onOddsChange(session: OddsFeedSession, oddsChange: entities.OddsChange[SportEvent]): Unit =
      toUtf8String(oddsChange).map(str => listener.onOddsChange(OddinMessageHandler.OddsChange(str))).toUnit()

    override def onUnparsableMessage(
        session: OddsFeedSession,
        unparsableMessage: entities.UnparsableMessage[SportEvent]): Unit =
      log.error(s"Received unparsable message '${toUtf8String(unparsableMessage.getRawMessage)}'")

    private def toUtf8String(message: EventMessage[_]): Option[String] =
      toUtf8String(message.getRawMessage)

    private def toUtf8String(bytes: Array[Byte]): Option[String] =
      try {
        Some(new String(bytes, StandardCharsets.UTF_8))
      } catch {
        case e: Exception =>
          log.error(s"Failed to parse Oddin message bytes to String '${e.getMessage}'")
          None
      }
  }

  private object LoggingGlobalEventsListener extends GlobalEventsListener {

    private val log = LoggerFactory.getLogger(getClass)

    override def onConnectionDown(): Unit =
      log.warn("Connection down")

    override def onEventRecoveryCompleted(eventId: URN, l: Long): Unit =
      log.info("Event recovery completed {}", eventId)

    override def onProducerStatusChange(producerStatus: ProducerStatus): Unit =
      log.info("Producer Status changed {}", producerStatus.getProducerStatusReason)
  }
}
