package phoenix.reports.unit

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetProtocol.Events.BetCancelled
import phoenix.bets.BetProtocol.Events.BetFailed
import phoenix.bets.BetProtocol.Events.BetOpened
import phoenix.bets.BetProtocol.Events.BetPushed
import phoenix.bets.BetProtocol.Events.BetSettled
import phoenix.bets.BetProtocol.Events.BetVoided
import phoenix.bets.BetValidator.PunterDoesNotExist
import phoenix.bets.CancellationReason
import phoenix.bets.Stake
import phoenix.bets.{BetData => PhoenixBetData}
import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.domain.DataProvider
import phoenix.core.odds.Odds
import phoenix.http.core.Geolocation
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.application.es.BetEventsMapper
import phoenix.reports.domain.model.bets.ESportEvents
import phoenix.reports.domain.model.bets.EventId
import phoenix.reports.domain.model.bets.{BetData => ReportingBetData}
import phoenix.support.DataGenerator.generateBetData
import phoenix.support.DataGenerator.generateBetId
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId

final class BetEventsMapperSpec extends AnyWordSpecLike with Matchers {

  private val clock: Clock = Clock.utcClock

  "Mapping phoenix bet events" should {

    "convert BetOpened event" in {
      // given
      val eventId = EventId("123")
      val createdAt = clock.currentOffsetDateTime()
      val event = BetOpened(
        betId = BetId("bet-2137"),
        betData = PhoenixBetData(
          punterId = PunterId("punter-2137"),
          marketId = MarketId(DataProvider.Oddin, "market-2137"),
          selectionId = "selection-2137",
          stake = Stake.unsafe(DefaultCurrencyMoney(2137)),
          odds = Odds(2.137)),
        reservationId = ReservationId("reservation-2137"),
        geolocation = Geolocation("21 37"),
        placedAt = createdAt)

      // when
      val conversionOutcome = BetEventsMapper.transform(event, eventId, createdAt)

      // then
      conversionOutcome shouldBe Some(
        ESportEvents.betOpened(
          eventId = eventId,
          betData = ReportingBetData(
            betId = BetId("bet-2137"),
            punterId = PunterId("punter-2137"),
            marketId = MarketId(DataProvider.Oddin, "market-2137"),
            selectionId = "selection-2137",
            stake = MoneyAmount(2137),
            odds = Odds(2.137)),
          operationTime = createdAt))
    }

    "convert BetSettled event - if punter won" in {
      // given
      val event = BetSettled(
        betId = BetId("bet-2137"),
        betData = PhoenixBetData(
          punterId = PunterId("punter-2137"),
          marketId = MarketId(DataProvider.Oddin, "market-2137"),
          selectionId = "selection-2137",
          stake = Stake.unsafe(DefaultCurrencyMoney(2137)),
          odds = Odds(2.137)),
        reservationId = ReservationId("reservation-2137"),
        winner = true)
      val eventId = EventId("123")
      val createdAt = clock.currentOffsetDateTime()

      // when
      val conversionOutcome = BetEventsMapper.transform(event, eventId, createdAt)

      // then
      conversionOutcome shouldBe Some(
        ESportEvents.betSettled(
          eventId = eventId,
          betData = ReportingBetData(
            betId = BetId("bet-2137"),
            punterId = PunterId("punter-2137"),
            marketId = MarketId(DataProvider.Oddin, "market-2137"),
            selectionId = "selection-2137",
            stake = MoneyAmount(2137),
            odds = Odds(2.137)),
          operationTime = createdAt,
          paidAmount = MoneyAmount(4566.769)))
    }

    "convert BetSettled event - if punter lost" in {
      // given
      val event = BetSettled(
        betId = BetId("bet-2137"),
        betData = PhoenixBetData(
          punterId = PunterId("punter-2137"),
          marketId = MarketId(DataProvider.Oddin, "market-2137"),
          selectionId = "selection-2137",
          stake = Stake.unsafe(DefaultCurrencyMoney(2137)),
          odds = Odds(2.137)),
        reservationId = ReservationId("reservation-2137"),
        winner = false)
      val eventId = EventId("123")
      val createdAt = clock.currentOffsetDateTime()

      // when
      val conversionOutcome = BetEventsMapper.transform(event, eventId, createdAt)

      // then
      conversionOutcome shouldBe Some(
        ESportEvents.betSettled(
          eventId = eventId,
          betData = ReportingBetData(
            betId = BetId("bet-2137"),
            punterId = PunterId("punter-2137"),
            marketId = MarketId(DataProvider.Oddin, "market-2137"),
            selectionId = "selection-2137",
            stake = MoneyAmount(2137),
            odds = Odds(2.137)),
          operationTime = createdAt,
          paidAmount = MoneyAmount.zero.get))
    }

    "convert BetVoided core domain event to BetCancelled reporting domain event" in {
      // given
      val event = BetVoided(
        betId = BetId("bet-2137"),
        betData = PhoenixBetData(
          punterId = PunterId("punter-2137"),
          marketId = MarketId(DataProvider.Oddin, "market-2137"),
          selectionId = "selection-2137",
          stake = Stake.unsafe(DefaultCurrencyMoney(2137)),
          odds = Odds(2.137)),
        reservationId = ReservationId("reservation-2137"))
      val eventId = EventId("123")
      val createdAt = clock.currentOffsetDateTime()

      // when
      val conversionOutcome = BetEventsMapper.transform(event, eventId, createdAt)

      // then
      conversionOutcome shouldBe Some(
        ESportEvents.betCancelled(
          eventId = eventId,
          betData = ReportingBetData(
            betId = BetId("bet-2137"),
            punterId = PunterId("punter-2137"),
            marketId = MarketId(DataProvider.Oddin, "market-2137"),
            selectionId = "selection-2137",
            stake = MoneyAmount(2137),
            odds = Odds(2.137)),
          operationTime = createdAt))
    }

    "convert BetPushed core domain event to BetPushed reporting domain event" in {
      // given
      val event = BetPushed(
        betId = BetId("bet-2137"),
        betData = PhoenixBetData(
          punterId = PunterId("punter-2137"),
          marketId = MarketId(DataProvider.Oddin, "market-2137"),
          selectionId = "selection-2137",
          stake = Stake.unsafe(DefaultCurrencyMoney(2137)),
          odds = Odds(2.137)),
        reservationId = ReservationId("reservation-2137"))
      val eventId = EventId("123")
      val createdAt = clock.currentOffsetDateTime()

      // when
      val conversionOutcome = BetEventsMapper.transform(event, eventId, createdAt)

      // then
      conversionOutcome shouldBe Some(
        ESportEvents.betPushed(
          eventId = eventId,
          betData = ReportingBetData(
            betId = BetId("bet-2137"),
            punterId = PunterId("punter-2137"),
            marketId = MarketId(DataProvider.Oddin, "market-2137"),
            selectionId = "selection-2137",
            stake = MoneyAmount(2137),
            odds = Odds(2.137)),
          operationTime = createdAt))
    }

    "convert BetCancelled core domain event to BetVoided reporting domain event" in {
      // given
      val event = BetCancelled(
        betId = BetId("bet-2137"),
        betData = PhoenixBetData(
          punterId = PunterId("punter-2137"),
          marketId = MarketId(DataProvider.Oddin, "market-2137"),
          selectionId = "selection-2137",
          stake = Stake.unsafe(DefaultCurrencyMoney(2137)),
          odds = Odds(2.137)),
        reservationId = ReservationId("reservation-2137"),
        adminUser = AdminId("admin1"),
        cancellationReason = CancellationReason.unsafe("reason"),
        betCancellationTimestamp = randomOffsetDateTime())
      val eventId = EventId("123")
      val createdAt = clock.currentOffsetDateTime()

      // when
      val conversionOutcome = BetEventsMapper.transform(event, eventId, createdAt)

      // then
      conversionOutcome shouldBe Some(
        ESportEvents.betVoided(
          eventId = eventId,
          betData = ReportingBetData(
            betId = BetId("bet-2137"),
            punterId = PunterId("punter-2137"),
            marketId = MarketId(DataProvider.Oddin, "market-2137"),
            selectionId = "selection-2137",
            stake = MoneyAmount(2137),
            odds = Odds(2.137)),
          operationTime = createdAt,
          adminUser = AdminId("admin1"),
          cancellationReason = CancellationReason.unsafe("reason")))
    }

    "ignore BetFailed event" in {
      // given
      val event = BetFailed(generateBetId(), generateBetData(), reasons = List(PunterDoesNotExist(generatePunterId())))

      // then
      BetEventsMapper.transform(event, EventId.random(), createdAt = clock.currentOffsetDateTime()) shouldBe None
    }
  }
}
