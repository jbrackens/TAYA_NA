package phoenix.oddin

import phoenix.oddin.data._

object OddinMarketFormatter {

  case class MissingMarketDescriptionException(marketId: Int)
      extends RuntimeException(s"Unable to locate a MarketDescription for market id $marketId")

  case class MissingOutcomeDescriptionException(marketId: Int, outcomeId: Int)
      extends RuntimeException(
        s"Unable to locate an OutcomeDescription with id $outcomeId for market description id $marketId")

  val Synonyms = Map("type" -> "kind")

  def synonymFor(key: String): String =
    Synonyms.get(key).getOrElse(key)

  def outcomeDescriptionForId(outcomeId: Int, description: MarketDescription): OutcomeDescription =
    description.outcomes
      .find(_.id == outcomeId)
      .getOrElse(throw MissingOutcomeDescriptionException(description.id, outcomeId))

  def marketDescriptionForId(
      marketId: Int,
      marketSpecifiers: Map[String, String],
      marketDescriptions: MarketDescriptions): MarketDescription =
    marketDescriptions.marketDescriptions
      .filter { description =>
        description.id == marketId &&
        marketSpecifiers.get("variant").map(_ == description.variant).getOrElse(true)
      }
      .headOption
      .getOrElse(throw MissingMarketDescriptionException(marketId))

  def formatMarketName(marketDescriptionName: String, specifiers: Map[String, String]): String = {
    val keys = marketDescriptionName.split('{').tail.map(_.split('}').head)
    keys.fold(marketDescriptionName)((prev, k) => {
      prev.replace(s"{$k}", specifiers(synonymFor(k)))
    })
  }

  def toMarketOddsChanges(
      oddsChange: OddsChange,
      fixture: Fixture,
      marketDescriptions: MarketDescriptions): List[MarketOddsChange] = {
    val sportId = fixture.tournament.sport.id
    val fixtureId = fixture.id
    oddsChange.odds.map { market => toMarketOddsChange(sportId, fixtureId, market, marketDescriptions) }.toList
  }

  def toMarketOddsChange(
      sportId: String,
      fixtureId: String,
      market: Market,
      marketDescriptions: MarketDescriptions): MarketOddsChange = {
    val marketDescription = marketDescriptionForId(market.id, market.specifiers, marketDescriptions)

    val marketId = s"${market.id}-${market.specifiers}"
    val marketName = formatMarketName(marketDescription.name, market.specifiers)
    val marketStatus = market.status.toString
    val timestamp = 1L

    val selectionOdds = market.outcomes.map { outcome =>
      val outcomeDescription = outcomeDescriptionForId(outcome.id, marketDescription)
      toSelectionOdds(sportId, fixtureId, marketId, outcome, outcomeDescription)
    }

    MarketOddsChange(
      sportId,
      fixtureId,
      marketId,
      marketName,
      marketStatus,
      market.specifiers,
      timestamp,
      selectionOdds)
  }

  def toSelectionOdds(
      sportId: String,
      fixtureId: String,
      marketId: String,
      outcome: Outcome,
      outcomeDescription: OutcomeDescription): SelectionOdds = {
    val selectionId = outcome.id.toString
    val selectionName = outcomeDescription.name
    val price = outcome.odds

    SelectionOdds(sportId, fixtureId, marketId, selectionId, selectionName, price.getOrElse("0"))
  }
}
