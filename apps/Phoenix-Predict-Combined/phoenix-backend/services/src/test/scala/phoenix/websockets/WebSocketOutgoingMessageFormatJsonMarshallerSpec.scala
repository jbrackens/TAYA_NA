package phoenix.websockets

import java.time.OffsetDateTime
import java.time.ZoneOffset

import io.circe.parser.parse
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetData
import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetStateUpdate
import phoenix.bets.BetStateUpdate.TargetState
import phoenix.bets.Stake
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.domain.DataProvider
import phoenix.core.error.PresentationErrorCode
import phoenix.core.odds.Odds
import phoenix.markets.LifecycleChangeReason.BackofficeChange
import phoenix.markets.MarketCategory
import phoenix.markets.MarketLifecycle
import phoenix.markets.MarketsBoundedContext.FixtureStateUpdate
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.MarketStateUpdate
import phoenix.markets.SelectionOdds
import phoenix.markets.domain.MarketType
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureScore
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.punters.PunterEntity.PunterId
import phoenix.support.UnsafeValueObjectExtensions.UnsafeValidationOps
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.Funds.BonusFunds
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.WalletStateUpdate
import phoenix.websockets.messages.BetUpdate
import phoenix.websockets.messages.BetsChannel
import phoenix.websockets.messages.CorrelationId
import phoenix.websockets.messages.FixtureChannel
import phoenix.websockets.messages.FixtureUpdate
import phoenix.websockets.messages.Heartbeat
import phoenix.websockets.messages.MarketChannel
import phoenix.websockets.messages.MarketUpdate
import phoenix.websockets.messages.SubscriptionFailure
import phoenix.websockets.messages.SubscriptionSuccess
import phoenix.websockets.messages.UnsubscriptionFailure
import phoenix.websockets.messages.UnsubscriptionSuccess
import phoenix.websockets.messages.WalletUpdate
import phoenix.websockets.messages.WalletsChannel
import phoenix.websockets.messages.WebSocketJsonFormats.OutgoingMessageCodec

final class WebSocketOutgoingMessageFormatJsonMarshallerSpec extends AnyWordSpecLike with Matchers {

  "it should marshall a Heartbeat message correctly" in {
    val message = Heartbeat()

    val expected =
      parse("""
        |{
        |  "channel": "heartbeat",
        |  "event": "heartbeat"
        |}
        |""".stripMargin)

    val marshalled = OutgoingMessageCodec.apply(message)

    expected shouldBe Right(marshalled)
  }

  "it should marshall an Error message correctly" in {
    val message = phoenix.websockets.messages.Error(PresentationErrorCode.MarketNotFound)

    val expected =
      parse("""
        |{
        |  "error": "marketNotFound",
        |  "event": "error"
        |}
        |""".stripMargin)

    val marshalled = OutgoingMessageCodec.apply(message)

    expected shouldBe Right(marshalled)
  }

  "it should marshall a SubscriptionSuccess message correctly" in {
    val message = SubscriptionSuccess(CorrelationId("7feffc64-bf2d-4af6-b9bb-816b1765a791"), BetsChannel())

    val expected =
      parse("""
        |{
        |  "channel": "bets",
        |  "correlationId": "7feffc64-bf2d-4af6-b9bb-816b1765a791",
        |  "event": "subscribe:success"
        |}
        |""".stripMargin)

    val marshalled = OutgoingMessageCodec.apply(message)

    expected shouldBe Right(marshalled)
  }

  "it should marshall a SubscriptionFailure message correctly" in {
    val message = SubscriptionFailure(
      CorrelationId("7feffc64-bf2d-4af6-b9bb-816b1765a791"),
      WalletsChannel(),
      PresentationErrorCode.WalletNotFound)

    val expected =
      parse("""
        |{
        |  "channel": "wallets",
        |  "correlationId": "7feffc64-bf2d-4af6-b9bb-816b1765a791",
        |  "error": "walletNotFound",
        |  "event": "subscribe:failure"
        |}
        |""".stripMargin)

    val marshalled = OutgoingMessageCodec.apply(message)

    expected shouldBe Right(marshalled)
  }

  "it should marshall a UnsubscriptionSuccess message correctly" in {
    val message = UnsubscriptionSuccess(CorrelationId("7feffc64-bf2d-4af6-b9bb-816b1765a791"), WalletsChannel())

    val expected =
      parse("""
        |{
        |  "channel": "wallets",
        |  "correlationId": "7feffc64-bf2d-4af6-b9bb-816b1765a791",
        |  "event": "unsubscribe:success"
        |}
        |""".stripMargin)

    val marshalled = OutgoingMessageCodec.apply(message)

    expected shouldBe Right(marshalled)
  }

  "it should marshall a UnsubscriptionFailure message correctly" in {
    val message = UnsubscriptionFailure(
      CorrelationId("7feffc64-bf2d-4af6-b9bb-816b1765a791"),
      WalletsChannel(),
      PresentationErrorCode.WalletNotFound)

    val expected =
      parse("""
        |{
        |  "channel": "wallets",
        |  "correlationId": "7feffc64-bf2d-4af6-b9bb-816b1765a791",
        |  "error": "walletNotFound",
        |  "event": "unsubscribe:failure"
        |}
        |""".stripMargin)

    val marshalled = OutgoingMessageCodec.apply(message)

    expected shouldBe Right(marshalled)
  }

  "it should marshall a FixtureUpdate message correctly" in {
    val message = FixtureUpdate(
      CorrelationId("7feffc64-bf2d-4af6-b9bb-816b1765a791"),
      FixtureChannel(SportId(DataProvider.Phoenix, "1"), FixtureId(DataProvider.Oddin, "fixture1")),
      FixtureStateUpdate(
        FixtureId(DataProvider.Oddin, "fixture1"),
        name = "Fixture Name",
        startTime = OffsetDateTime.of(2020, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC),
        FixtureLifecycleStatus.PreGame,
        FixtureScore(home = 0, away = 0)))

    val expected =
      parse("""
        |{
        |  "channel": "fixture^s:p:1^f:o:fixture1",
        |  "data": {
        |    "id": "f:o:fixture1",
        |    "name": "Fixture Name",
        |    "score": {
        |      "away": 0,
        |      "home": 0
        |    },
        |    "startTime": "2020-01-01T00:00:00Z",
        |    "status": "PRE_GAME"
        |  },
        |  "event": "update"
        |}
        |""".stripMargin)

    val marshalled = OutgoingMessageCodec.apply(message)

    expected shouldBe Right(marshalled)
  }

  "it should marshall a MarketUpdate message correctly" in {
    val message = MarketUpdate(
      CorrelationId("7feffc64-bf2d-4af6-b9bb-816b1765a791"),
      MarketChannel(MarketId(DataProvider.Oddin, "market1")),
      MarketStateUpdate(
        MarketId(DataProvider.Oddin, "market1"),
        marketName = "Market Name",
        marketType = MarketType.BeyondGodlike,
        marketCategory = MarketCategory(MarketType.BeyondGodlike.entryName),
        MarketLifecycle.NotBettable(BackofficeChange()),
        Map("specifier_key" -> "specifier_value"),
        selectionOdds = List(
          SelectionOdds(
            selectionId = "od:selection:1",
            selectionName = "first team wins",
            Some(Odds(21.37)),
            active = true))))

    val expected =
      parse("""
        |{
        |  "channel": "market^m:o:market1",
        |  "correlationId": "7feffc64-bf2d-4af6-b9bb-816b1765a791",
        |  "data": {
        |    "marketId": "m:o:market1",
        |    "marketName": "Market Name",
        |    "marketStatus": {
        |      "changeReason": {
        |        "reason": "Requested by backoffice",
        |        "type": "BACKOFFICE_CHANGE"
        |      },
        |      "type": "NOT_BETTABLE"
        |    },
        |    "marketType": "BEYOND_GODLIKE",
        |    "marketCategory": "BEYOND_GODLIKE",
        |    "selectionOdds": [
        |      {
        |        "active": true,
        |        "displayOdds": {
        |          "american": "+2000",
        |          "decimal": 21.37,
        |          "fractional": "20/1"
        |        },
        |        "selectionId": "od:selection:1",
        |        "selectionName": "first team wins"
        |      }
        |    ],
        |    "specifiers": {
        |      "specifier_key": "specifier_value"
        |    }
        |  },
        |  "event": "update"
        |}
        |""".stripMargin)

    val marshalled = OutgoingMessageCodec.apply(message)

    expected shouldBe Right(marshalled)
  }

  "it should marshall a BetUpdate message correctly" in {
    val message = BetUpdate(
      CorrelationId("7feffc64-bf2d-4af6-b9bb-816b1765a791"),
      BetsChannel(),
      BetStateUpdate(
        BetId("bet1"),
        TargetState.Opened,
        BetData(
          PunterId("punter1"),
          MarketId(DataProvider.Oddin, "market1"),
          selectionId = "selection1",
          Stake(DefaultCurrencyMoney(MoneyAmount(120.54))).unsafe(),
          Odds(2.34)),
        winner = true,
        reason = Some("Some reason")))

    val expected =
      parse("""
        |{
        |  "channel": "bets",
        |  "correlationId": "7feffc64-bf2d-4af6-b9bb-816b1765a791",
        |  "data": {
        |    "betData": {
        |      "marketId": "m:o:market1",
        |      "displayOdds": {
        |        "american": "+130",
        |        "decimal": 2.34,
        |        "fractional": "13/10"
        |      },
        |      "punterId": "punter1",
        |      "selectionId": "selection1",
        |      "stake": {
        |        "amount": 120.54,
        |        "currency": "USD"
        |      }
        |    },
        |    "betId": "bet1",
        |    "reason": "Some reason",
        |    "state": "OPENED",
        |    "winner": true
        |  },
        |  "event": "update"
        |}
        |""".stripMargin)

    val marshalled = OutgoingMessageCodec.apply(message)

    expected shouldBe Right(marshalled)
  }

  "it should marshall a WalletUpdate message correctly" in {
    val message = WalletUpdate(
      CorrelationId("7feffc64-bf2d-4af6-b9bb-816b1765a791"),
      WalletsChannel(),
      WalletStateUpdate(
        WalletId("wallet1"),
        Balance(
          RealMoney(MoneyAmount(987.32)),
          bonusFunds = List(BonusFunds(DefaultCurrencyMoney(MoneyAmount(223.12)))))))

    val expected =
      parse("""
        |{
        |  "channel": "wallets",
        |  "correlationId": "7feffc64-bf2d-4af6-b9bb-816b1765a791",
        |  "data": {
        |    "balance": {
        |      "bonusFunds": [
        |        {
        |          "value": {
        |            "amount": 223.12,
        |            "currency": "USD"
        |          }
        |        }
        |      ],
        |      "realMoney": {
        |        "value": {
        |          "amount": 987.32,
        |          "currency": "USD"
        |        }
        |      }
        |    },
        |    "walletId": "wallet1"
        |  },
        |  "event": "update"
        |}
        |""".stripMargin)

    val marshalled = OutgoingMessageCodec.apply(message)

    expected shouldBe Right(marshalled)
  }
}
