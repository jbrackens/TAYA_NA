package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request.PlaceBetsReq
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response.{BaseResponse, FailureResp, PlaceBetsResp}
import org.scalatest.{Assertion, Matchers}

object Assertions extends Matchers {

  def checkSuccessMetadata(givenRequest: PlaceBetsReq, betsResponse: PlaceBetsResp): Assertion = {
    checkMetaMatchRequest(givenRequest, betsResponse)
    betsResponse.meta.result should be("SUCCESS")
  }

  def checkFailedMetadata(givenRequest: PlaceBetsReq, failed: FailureResp): Assertion = {
    checkMetaMatchRequest(givenRequest, failed)
    failed.meta.result should be("FAILED")
  }

  private def checkMetaMatchRequest(givenRequest: PlaceBetsReq, betsResponse: BaseResponse) = {
    betsResponse.meta.requestId should be(givenRequest.meta.requestId)
    betsResponse.meta.operation should be(givenRequest.meta.operation)
    betsResponse.meta.eventId should be(givenRequest.meta.eventId)
    betsResponse.meta.lastUpdated should not be (0)
  }

}
