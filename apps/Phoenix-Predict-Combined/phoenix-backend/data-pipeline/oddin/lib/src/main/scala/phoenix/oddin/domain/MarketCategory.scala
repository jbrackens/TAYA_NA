package phoenix.oddin.domain

import phoenix.oddin.domain.marketDescription.MarketDescription

final case class MarketCategory(value: String)

object MarketCategory {
  def fromMarketDescription(
      marketDescription: MarketDescription,
      marketSpecifiers: MarketSpecifiers): MarketCategory = {
    val description = marketDescription.marketDescriptionName.value
    val descriptionNoMap = description.stripSuffix(" - map {map}")
    val descriptionNoHandicap = descriptionNoMap.replace(" {handicap}", "")
    val descriptionWithSubstitutions =
      descriptionNoHandicap
        .replace("{threshold}", "X")
        .replace("{map}", "X")
        .replace("{order}", "X")
        .replace("{round}", "X")
        .replace("{side}", "X")
        .replace("{kind}", "X")
        .replace("{time} {time_unit}", "time")

    MarketCategory(marketSpecifiers.formatMarketName(descriptionWithSubstitutions))
  }
}
