package phoenix.markets

import cats.syntax.either._
import cats.syntax.traverse._
import pureconfig.ConfigReader
import pureconfig.error._
import pureconfig.generic.auto._

import phoenix.config.PhoenixProjectionConfig
import phoenix.core.config.BaseConfig
import phoenix.core.odds.Odds
import phoenix.markets.domain.MarketType
import phoenix.markets.sports.SportEntity.SportId

case class MarketsConfig(
    projections: MarketsProjectionConfig,
    oddinFeedEnabled: Boolean,
    selectionOddsUpperBoundInclusive: Odds,
    filters: FiltersConfig)

final case class MarketsProjectionConfig(
    allAvailableMarkets: PhoenixProjectionConfig,
    allAvailableSports: PhoenixProjectionConfig,
    allAvailableFixtures: PhoenixProjectionConfig)

case class FiltersConfig(
    sportsDisplayedToPuntersByDefault: Seq[SportId],
    marketTypesDisplayedToPunters: Seq[MarketType],
    tournamentsDisplayedToPuntersEnabled: Boolean)

object MarketsConfig {
  // This needs to be represented in the config file as a string
  // and only parsed to a Seq via a custom ConfigReader
  // since as of 2021, HOCON doesn't reasonably support passing arrays via env vars :/
  val seqOfStringsReader: ConfigReader[Seq[String]] =
    ConfigReader[String].map(_.split(",").map(_.trim).filter(_.nonEmpty).toSeq)

  implicit val seqOfSportsIdsReader: ConfigReader[Seq[SportId]] = seqOfStringsReader.map(_.map(SportId.unsafeParse))

  implicit val seqOfMarketTypeReader: ConfigReader[Seq[MarketType]] = seqOfStringsReader.emap { strings =>
    strings
      .traverse(raw => MarketType.fromString(raw))
      .leftMap(validationException =>
        CannotConvert(value = strings.toString, toType = MarketType.toString, because = validationException.getMessage))
  }

  object of extends BaseConfig[MarketsConfig]("phoenix.markets")

  implicit val oddsReader: ConfigReader[Odds] = ConfigReader[BigDecimal].map(Odds.apply)
}
