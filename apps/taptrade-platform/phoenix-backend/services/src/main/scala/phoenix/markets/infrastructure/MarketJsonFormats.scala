package phoenix.markets.infrastructure

import enumeratum.Circe
import io.circe.Codec
import io.circe.Decoder
import io.circe.HCursor
import io.circe.Json
import io.circe.KeyDecoder
import io.circe.KeyEncoder
import io.circe.generic.extras.Configuration
import io.circe.generic.extras.semiauto.deriveConfiguredCodec
import io.circe.generic.semiauto.deriveCodec
import io.circe.syntax._

import phoenix.core.JsonFormats._
import phoenix.core.odds.OddsJsonFormats.formattedOddsCodec
import phoenix.http.routes.dev.DevMarketEndpoints.CreateMarketForm
import phoenix.markets.LifecycleChangeReason.BackofficeCancellation
import phoenix.markets.LifecycleChangeReason.BackofficeChange
import phoenix.markets.LifecycleChangeReason.DataSupplierCancellation
import phoenix.markets.LifecycleChangeReason.DataSupplierPush
import phoenix.markets.LifecycleChangeReason.DataSupplierStatusChange
import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketLifecycle.Cancelled
import phoenix.markets.MarketLifecycle.NotBettable
import phoenix.markets.MarketLifecycle.Resettled
import phoenix.markets.MarketLifecycle.Settled
import phoenix.markets.MarketsBoundedContext.MarketAggregate._
import phoenix.markets.MarketsBoundedContext._
import phoenix.markets.MarketsRepository.MarketLifecycleChange
import phoenix.markets._
import phoenix.markets.domain.MarketType
import phoenix.markets.infrastructure.MarketJsonFormats.MarketLifecycleCodec._
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureScore
import phoenix.markets.sports.SportJsonFormats._

object MarketJsonFormats {
  implicit val configuration: Configuration = Configuration.default

  implicit val marketIdCodec: Codec[MarketId] = Codec[String].bimap(_.value, MarketId.unsafeParse)
  implicit val fixtureLifecycleStatusCodec: Codec[FixtureLifecycleStatus] = enumCodec(FixtureLifecycleStatus)

  implicit val sportSummaryCodec: Codec[SportSummary] = deriveCodec
  implicit val tournamentSummaryCodec: Codec[TournamentSummary] = deriveCodec
  implicit val fixtureSummaryCodec: Codec[FixtureSummary] = deriveCodec
  implicit val marketSummaryCodec: Codec[MarketSummary] = deriveCodec
  implicit val selectionSummaryCodec: Codec[SelectionSummary] = deriveCodec
  implicit val competitorSummaryCodec: Codec[CompetitorSummary] = deriveCodec

  implicit val selectionOddsCodec: Codec[SelectionOdds] =
    deriveConfiguredCodec[SelectionOdds]

  implicit val marketSettlingRequestCodec: Codec[MarketSettlingRequest] = deriveCodec
  implicit val marketResettlingRequestCodec: Codec[MarketResettlingRequest] = deriveCodec

  implicit val marketSpecifierCodec: Codec[MarketSpecifier] = deriveCodec

  implicit val lifecycleCancellationReasonCodec: Codec[LifecycleCancellationReason] =
    new Codec[LifecycleCancellationReason] {
      private implicit val backofficeCancellationCodec: Codec[BackofficeCancellation] = deriveCodec
      private implicit val dataSourceCancellationChangeCodec: Codec[DataSupplierCancellation] = deriveCodec
      private implicit val dataSupplierPushCodec: Codec[DataSupplierPush] = deriveCodec

      override def apply(reason: LifecycleCancellationReason): Json =
        reason match {
          case cancellation: DataSupplierCancellation =>
            Codec[DataSupplierCancellation]
              .apply(cancellation)
              .mapObject(_.add("type", Json.fromString("DATA_SUPPLIER_CANCELLATION")))
          case push: DataSupplierPush =>
            Codec[DataSupplierPush].apply(push).mapObject(_.add("type", Json.fromString("DATA_SUPPLIER_PUSH")))
          case backofficeCancellation: BackofficeCancellation =>
            Codec[BackofficeCancellation]
              .apply(backofficeCancellation)
              .mapObject(_.add("type", Json.fromString("BACKOFFICE_CANCELLATION")))
        }

      override def apply(c: HCursor): Decoder.Result[LifecycleCancellationReason] =
        for {
          tpe <- c.downField("type").as[String]
          result <- tpe match {
            case "DATA_SUPPLIER_CANCELLATION" => c.as[DataSupplierCancellation]
            case "DATA_SUPPLIER_PUSH"         => c.as[DataSupplierPush]
            case "BACKOFFICE_CANCELLATION"    => c.as[BackofficeCancellation]
            case _                            => c.fail(s"Cannot match type for ${classOf[LifecycleCancellationReason].getName}")
          }
        } yield result
    }

  implicit val lifecycleOperationalChangeReasonCodec: Codec[LifecycleOperationalChangeReason] =
    new Codec[LifecycleOperationalChangeReason] {
      private implicit val backofficeChangeCodec: Codec[BackofficeChange] = deriveCodec

      override def apply(reason: LifecycleOperationalChangeReason): Json =
        reason match {
          case DataSupplierStatusChange => Json.obj("type" -> Json.fromString("DATA_SUPPLIER_CHANGE"))
          case backofficeChange: BackofficeChange =>
            Codec[BackofficeChange]
              .apply(backofficeChange)
              .mapObject(_.add("type", Json.fromString("BACKOFFICE_CHANGE")))
        }

      override def apply(c: HCursor): Decoder.Result[LifecycleOperationalChangeReason] =
        for {
          tpe <- c.downField("type").as[String]
          result <- tpe match {
            case "DATA_SUPPLIER_CHANGE" => Right(DataSupplierStatusChange)
            case "BACKOFFICE_CHANGE"    => c.as[BackofficeChange]
            case _                      => c.fail(s"Cannot match type for ${classOf[LifecycleChangeReason].getName}")
          }
        } yield result

    }

  object MarketLifecycleCodec {
    val BETTABLE = "BETTABLE"
    val NOT_BETTABLE = "NOT_BETTABLE"
    val SETTLED = "SETTLED"
    val RESETTLED = "RESETTLED"
    val CANCELLED = "CANCELLED"
    val TYPE = "type"
  }

  implicit val marketLifecycleCodec: Codec[MarketLifecycle] = new Codec[MarketLifecycle] {
    private implicit val bettableCodec: Codec[Bettable] = deriveCodec
    private implicit val notBettableCodec: Codec[NotBettable] = deriveCodec
    private implicit val settledCodec: Codec[Settled] = deriveCodec
    private implicit val resettledCode: Codec[Resettled] = deriveCodec
    private implicit val cancelledCodec: Codec[Cancelled] = deriveCodec

    override def apply(lifecycle: MarketLifecycle): Json =
      lifecycle match {
        case lifecycle: Bettable    => lifecycle.asJson.mapObject(_.add(TYPE, Json.fromString(BETTABLE)))
        case lifecycle: NotBettable => lifecycle.asJson.mapObject(_.add(TYPE, Json.fromString(NOT_BETTABLE)))
        case lifecycle: Settled     => lifecycle.asJson.mapObject(_.add(TYPE, Json.fromString(SETTLED)))
        case lifecycle: Resettled   => lifecycle.asJson.mapObject(_.add(TYPE, Json.fromString(RESETTLED)))
        case lifecycle: Cancelled   => lifecycle.asJson.mapObject(_.add(TYPE, Json.fromString(CANCELLED)))
      }

    override def apply(c: HCursor): Decoder.Result[MarketLifecycle] =
      for {
        tpe <- c.downField(TYPE).as[String]
        result <- tpe match {
          case BETTABLE     => c.as[Bettable]
          case SETTLED      => c.as[Settled]
          case RESETTLED    => c.as[Resettled]
          case NOT_BETTABLE => c.as[NotBettable]
          case CANCELLED    => c.as[Cancelled]
          case _            => c.fail(s"Cannot match type for ${classOf[MarketLifecycle].getName}")
        }
      } yield result
  }

  implicit val marketLifecycleChangeCodec: Codec[MarketLifecycleChange] = deriveCodec
  implicit val marketCreateRequestCodec: Codec[CreateMarketForm] = deriveCodec

  implicit val fixtureScoreCodec: Codec[FixtureScore] = deriveCodec
  implicit val fixtureScoreChangeCodec: Codec[FixtureScoreChange] = deriveCodec
  implicit val fixtureStatusChangeCodec: Codec[FixtureLifecycleStatusChange] = deriveCodec

  implicit val marketTypeCodec: Codec[MarketType] = enumCodec(MarketType)
  implicit val marketTypeKeyEncoder: KeyEncoder[MarketType] = Circe.keyEncoder(MarketType)
  implicit val marketTypeKeyDecoder: KeyDecoder[MarketType] = Circe.keyDecoder(MarketType)
  implicit val marketCategoryCodec: Codec[MarketCategory] = Codec[String].bimap(_.value, MarketCategory)
  implicit val competitorCodec: Codec[Competitor] = deriveCodec
  implicit val competitorWithScoreCodec: Codec[CompetitorWithScore] = deriveCodec
  implicit val sportCodec: Codec[Sport] = deriveCodec
  implicit val tournamentCodec: Codec[Tournament] = deriveCodec
  implicit val marketStateUpdateCodec: Codec[MarketStateUpdate] = deriveCodec
  implicit val tradingMarketDataCodec: Codec[TradingMarketData] = deriveCodec
  implicit val tradingFixtureDetailsCodec: Codec[TradingFixtureDetails] = deriveCodec
  implicit val fixtureDetailDataCodec: Codec[FixtureDetailData] = deriveCodec
  implicit val fixtureNavigationDataCodec: Codec[FixtureNavigationData] = deriveCodec
  implicit val tradingMarketNavigationDataCodec: Codec[TradingMarketNavigationData] = deriveCodec

  implicit val marketInfoUpdateRequestCodec: Codec[MarketInfoUpdateRequest] = deriveCodec
  implicit val marketChangeVisibilityRequestCodec: Codec[MarketChangeVisibilityRequest] = deriveCodec
  implicit val marketCategoryVisibilityCodec: Codec[MarketCategoryVisibility] = deriveCodec
  implicit val fixtureInfoUpdateRequestCodec: Codec[FixtureInfoUpdateRequest] = deriveCodec

  implicit val tournamentViewCodec: Codec[TournamentView] = deriveCodec
  implicit val sportViewCodec: Codec[SportView] = deriveCodec
  implicit val fixtureSocketSummaryCodec: Codec[FixtureStateUpdate] = deriveCodec
}
