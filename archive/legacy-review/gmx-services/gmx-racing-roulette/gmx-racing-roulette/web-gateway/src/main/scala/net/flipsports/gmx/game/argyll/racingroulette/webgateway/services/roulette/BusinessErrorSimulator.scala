package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.RequestMetadata

object BusinessErrorSimulator {

  def shouldSimulateErrorForContext(feature: String)(meta: RequestMetadata): Boolean =
    meta.simulateError.exists(_.equals(feature))

}
