package net.flipsports.gmx.webapiclient.sbtech.betting

import net.flipsports.gmx.common.webapi.ExternalCallException
import net.flipsports.gmx.webapiclient.sbtech.betting.dto.{ PlaceBetsError, PlaceBetsRequest, PlaceBetsResponse }

import scala.concurrent.Future

trait BettingAPIClient {

  @throws(classOf[ExternalCallException])
  def callPlaceBets(playerToken: String, request: PlaceBetsRequest): Future[Either[PlaceBetsError, PlaceBetsResponse]]

}
