package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.RequestMetadata
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request.{PlaceBetsReq, UserChip}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response.Participant

object Factory {

  def samplePlaceBetsRequest: PlaceBetsReq = {
    PlaceBetsReq(RequestMetadata(Some("Req1"), Operation.PlaceBets, "123"), "JWT", Seq(
      UserChip("1", 4, Seq(
        Participant("id1", 1, "4/1", 5.0, SelectionStatus.Active)
      ))
    ))
  }
}
