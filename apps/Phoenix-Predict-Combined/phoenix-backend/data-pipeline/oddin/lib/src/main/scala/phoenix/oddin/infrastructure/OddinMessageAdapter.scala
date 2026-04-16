package phoenix.oddin.infrastructure

import scala.reflect.ClassTag

import akka.NotUsed
import akka.actor.typed.ActorSystem
import akka.stream.OverflowStrategy
import akka.stream.QueueOfferResult
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.SourceQueue
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.UnitUtils._
import phoenix.core.XmlUtils.XmlNodeReader
import phoenix.core.XmlUtils._
import phoenix.oddin.domain
import phoenix.oddin.domain.OddinMessageHandler
import phoenix.oddin.domain.OddinMessageHandler._
import phoenix.oddin.domain.OddinStreamingApi._
import phoenix.oddin.infrastructure.xml.FixtureChangeXmlReaders._
import phoenix.oddin.infrastructure.xml.MarketCancelXmlReaders._
import phoenix.oddin.infrastructure.xml.MarketSettlementXmlReaders._
import phoenix.oddin.infrastructure.xml.OddsChangeXmlReaders._
import phoenix.oddin.infrastructure.xml.TournamentChangeXmlReaders._
import phoenix.utils.UUIDGenerator

class OddinMessageAdapter(uuidGenerator: UUIDGenerator, clock: Clock)(implicit system: ActorSystem[_])
    extends OddinMessageHandler {

  implicit private val ec = system.executionContext

  private val log = LoggerFactory.getLogger(getClass)

  private val (oddsChangeQueue, oddsChangeSource) =
    Source.queue[OddsChangeMessage](bufferSize = 1000, OverflowStrategy.dropHead).preMaterialize()

  private val (fixtureChangeQueue, fixtureChangeSource) =
    Source.queue[FixtureChangeMessage](bufferSize = 1000, OverflowStrategy.dropHead).preMaterialize()

  private val (tournamentChangeQueue, tournamentChangeSource) =
    Source.queue[TournamentChangeMessage](bufferSize = 1000, OverflowStrategy.dropHead).preMaterialize()

  private val (marketSettlementQueue, marketSettlementSource) =
    Source.queue[MarketSettlementMessage](bufferSize = 1000, OverflowStrategy.dropHead).preMaterialize()

  private val (marketCancelQueue, marketCancelSource) =
    Source.queue[MarketCancelMessage](bufferSize = 1000, OverflowStrategy.dropHead).preMaterialize()

  val fixtureChanges: Source[FixtureChangeMessage, NotUsed] = fixtureChangeSource.log("fixture-change")

  val tournamentChanges: Source[TournamentChangeMessage, NotUsed] = tournamentChangeSource.log("tournament-change")

  val oddsChanges: Source[OddsChangeMessage, NotUsed] = oddsChangeSource.log("odds-change")

  val marketSettlements: Source[MarketSettlementMessage, NotUsed] =
    marketSettlementSource.log("market-settlement")

  val marketCancellations: Source[MarketCancelMessage, NotUsed] = marketCancelSource.log("market-cancel")

  override def onBetCancel(betCancel: BetCancel): Unit =
    readAndOffer(betCancel.value, marketCancelQueue)

  override def onBetSettlement(betSettlement: BetSettlement): Unit =
    readAndOffer(betSettlement.value, marketSettlementQueue)

  override def onBetStop(betStop: BetStop): Unit =
    log.warn(s"Received `BetStop` ${betStop.value}")

  override def onFixtureChange(fixtureChange: FixtureChange): Unit = {
    val xml = fixtureChange.value.parseXml
    xml
      .convertTo[domain.fixtureChange.FixtureChange]
      .map(fc => offer(fixtureChangeQueue, createOddinMessage(fc)))
      .orElse(
        xml
          .convertTo[domain.tournamentChange.TournamentChange]
          .map(tc => offer(tournamentChangeQueue, createOddinMessage(tc))))
      .leftMap { errors =>
        log.error(s"Failed to read/offer Oddin message string [FixtureChange]: '$errors'")
      }
      .toUnit()
  }

  override def onOddsChange(marketChange: OddsChange): Unit =
    readAndOffer(marketChange.value, oddsChangeQueue)

  private def readAndOffer[T](message: String, queue: SourceQueue[OddinMessage[T]])(implicit
      classTag: ClassTag[T],
      reader: XmlNodeReader[T]): Unit = {
    log.info(message)
    message.parseXml
      .convertTo[T]
      .map { result =>
        offer(queue, createOddinMessage(result))
      }
      .leftMap { errors =>
        log.error(s"Failed to read/offer Oddin message string as [${classTag.runtimeClass.getName}]: '$errors'")
      }
      .toUnit()
  }

  private def createOddinMessage[T](payload: T): OddinMessage[T] =
    OddinMessage(CorrelationId(uuidGenerator.generate()), ReceivedAt(clock.currentOffsetDateTime()), payload)

  private def offer[T](queue: SourceQueue[OddinMessage[T]], message: OddinMessage[T]): Unit = {
    val f = queue.offer(message).map {
      case QueueOfferResult.Enqueued    => log.debug(s"ENQUEUED $message")
      case QueueOfferResult.Dropped     => log.warn(s"DROPPED $message")
      case QueueOfferResult.Failure(ex) => log.error(s"FAILURE $message", ex)
      case QueueOfferResult.QueueClosed => log.warn(s"QUEUE CLOSED $message")
    }
    f.failed.foreach { t => log.error(s"QUEUE OFFER FAILED (message=$message) $t") }
    f.toUnit()
  }
}
