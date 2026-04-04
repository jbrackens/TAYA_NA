package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.handler

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.{RequestMetadata, ResponseMetadata}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request.{UserChip, _}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.BusinessErrorFactory
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.helper.{ChipOps, FailedOperation}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.stake.StakeDistribution

import scala.concurrent.{ExecutionContext, Future}

trait CalculateReturnHandler extends ChipOps {

  def handleCalculateReturn(msg: CalculateReturnReq)(implicit ec: ExecutionContext): Future[BaseResponse] = {
    val chipsResults = msg.placedChips.map(calculateSingleChip)
    Future.successful(withCombined(msg.meta, chipsResults)(createResponse))
  }

  private def calculateSingleChip(chip: UserChip)(implicit ec: ExecutionContext): Either[FailedOperation, CalculatedReturn] =
    withCalculatedStake(chip)(createReturn)

  private def createReturn(chip: UserChip, stake: StakeDistribution): CalculatedReturn =
    CalculatedReturn(chip.display, chip.totalStake, stake.potentialReturn, stake.selections.map(_.participant.position), stake.selections.nonEmpty)

  protected def withCombined[IN, OUT <: BaseResponse](reqMeta: RequestMetadata, results: Seq[Either[FailedOperation, IN]])
                                                     (block: (RequestMetadata, Seq[IN]) => OUT)
                                                     (implicit ec: ExecutionContext): BaseResponse = {
    val failures = results.collect { case Left(x) => x }
    val success = results.collect { case Right(x) => x }
    if (failures.isEmpty)
      block(reqMeta, success)
    else
      BusinessErrorFactory.unexpectedCalculateError(reqMeta,
        failures.map(describeFailure))
  }

  protected def describeFailure(input: FailedOperation): String = {
    s"Failed CHIP ${input.display} REASON: ${input.reason}"
  }

  private def createResponse(reqMeta: RequestMetadata, returns: Seq[CalculatedReturn]): CalculateReturnResp =
    CalculateReturnResp(
      ResponseMetadata.success(reqMeta),
      returns)

}
