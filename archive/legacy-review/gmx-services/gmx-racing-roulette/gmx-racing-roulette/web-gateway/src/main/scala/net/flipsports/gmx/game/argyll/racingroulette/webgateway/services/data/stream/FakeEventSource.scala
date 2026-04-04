package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream

import java.time.{LocalDateTime, ZoneOffset}
import java.util.UUID

import akka.NotUsed
import akka.actor.ActorSystem
import akka.event.{Logging, LoggingAdapter}
import akka.stream.ThrottleMode
import akka.stream.scaladsl.{Concat, Merge, Source}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements._

import scala.concurrent.duration._

class FakeEventSource(implicit val system: ActorSystem) extends EventSource {

  implicit val logger: LoggingAdapter = Logging(system, this.getClass)

  private val MAX_PARTICIPANTS = 20

  private def randomEventId: Int = scala.util.Random.nextInt(MAX_PARTICIPANTS)

  private def randomLineId: Int = scala.util.Random.nextInt(MAX_PARTICIPANTS)

  private def randomPriceNumerator: Int = scala.util.Random.nextInt(5)

  private def randomPriceDenominator: Int = scala.util.Random.nextInt(20)

  private def randomEventUpdate: EventsUpdate = {
    generateEventUpdate(randomEventId + 1)
  }

  private def generateEventUpdate(eventId: Int): EventsUpdate = {
    val participantsCount = eventId

    EventsUpdate(UUID.randomUUID().toString,
      buildEventId(eventId),
      "DayOfEventRace",
      "Celtic Contracts Handicap",
      "Kempton",
      LocalDateTime.now().plusDays(1).atZone(ZoneOffset.UTC).toEpochSecond,
      "NotStarted",
      (1 to participantsCount)
        .map(position => ParticipantUpdate(UUID.randomUUID().toString,
          s"ID_$position",
          "Presence Process",
          position.toString,
          "DOE ")
        ),
      System.currentTimeMillis() / 1000,
      System.currentTimeMillis() / 1000
    )
  }

  private def randomMarketUpdate: MarketUpdate = {
    generateMarketsUpdate(randomEventId + 1)
  }

  private def generateMarketsUpdate(eventId: Int): MarketUpdate = {
    MarketUpdate(UUID.randomUUID().toString,
      "market" + eventId,
      buildEventId(eventId),
      "RaceCard",
      System.currentTimeMillis() / 1000,
      System.currentTimeMillis() / 1000)
  }

  private def randomSelectionUpdate: SelectionUpdate = {
    generateSelectionUpdate(randomEventId + 1)
  }

  private def generateSelectionUpdate(eventId: Int): SelectionUpdate = {
    val participantId = (randomLineId % eventId) + 1
    val numerator = randomPriceNumerator + 1
    val denominator = randomPriceDenominator + 1
    val displayOdds = s"$numerator/$denominator"
    val trueOdds = roundTwo(numerator.toDouble / denominator)

    SelectionUpdate(UUID.randomUUID().toString,
      buildEventId(eventId),
      s"BettingID_${participantId}",
      s"ID_${participantId}",
      "market" + eventId,
      "Active",
      trueOdds,
      Map("Fractional" -> displayOdds),
      System.currentTimeMillis() / 1000,
      System.currentTimeMillis() / 1000
    )
  }

  private def roundTwo(in: Double): Double = {
    BigDecimal(in).setScale(2, BigDecimal.RoundingMode.HALF_DOWN).toDouble
  }

  private def buildEventId(eventId: Int) = {
    s"EVENT_$eventId"
  }

  def provide: Source[StateUpdate, Any] = {
    val initSource = Source.combine(eventsInitSource(), marketsInitSource(), selectionsInitSource())(Concat(_))

    val generatorSource = Source.combine(eventsUpdateSource(), marketsUpdateSource(), selectionsUpdateSource())(Merge(_))

    initSource.concat(generatorSource)
      .log("mockUpdateSource")
  }

  private def eventsInitSource(): Source[StateUpdate, NotUsed] =
    Source(1 to MAX_PARTICIPANTS).map(generateEventUpdate)

  private def marketsInitSource(): Source[StateUpdate, NotUsed] =
    Source(1 to MAX_PARTICIPANTS).map(generateMarketsUpdate)

  private def selectionsInitSource(): Source[StateUpdate, NotUsed] =
    Source(1 to MAX_PARTICIPANTS).map(generateSelectionUpdate)


  private def eventsUpdateSource(): Source[StateUpdate, NotUsed] =
    generateWithFunction(randomEventUpdate _, 2.minutes)

  private def marketsUpdateSource(): Source[StateUpdate, NotUsed] =
    generateWithFunction(randomMarketUpdate _, 2.hours)

  private def selectionsUpdateSource(): Source[StateUpdate, NotUsed] =
    generateWithFunction(randomSelectionUpdate _, 2.seconds)

  private def generateWithFunction(generator: () => StateUpdate, interval: FiniteDuration): Source[StateUpdate, NotUsed] = {
    Source.unfold(generator.apply()) { _: StateUpdate =>
      val next = generator.apply()
      Some((next, next))
    }.throttle(elements = 1, per = interval, maximumBurst = 1, ThrottleMode.shaping)
  }
}