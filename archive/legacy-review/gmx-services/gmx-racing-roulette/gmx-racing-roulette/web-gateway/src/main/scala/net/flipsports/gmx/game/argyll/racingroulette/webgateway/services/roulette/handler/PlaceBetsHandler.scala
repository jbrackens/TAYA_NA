package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.handler

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.ErrorCode.{BetRejectedOddsChanged, BetRejectedRaceOff, Unexpected}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.ResponseMetadata
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.BusinessErrorFactory.{oddsChangedBettingError, raceOffBettingError, unexpectedBettingError}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.BusinessErrorSimulator
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.helper.{ChipOps, FailedOperation}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.stake.{SelectionStake, StakeDistribution}
import net.flipsports.gmx.webapiclient.sbtech.betting.BettingAPIClient
import net.flipsports.gmx.webapiclient.sbtech.betting.dto.{Bet, PlaceBetsRequest, SelectionMapped, Selection => BSelection}

import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Failure, Success, Try}

trait PlaceBetsHandler extends ChipOps with PlaceBetsErrorTransformer {

  def bettingAPIClient: BettingAPIClient

  def handlePlaceBet(msg: PlaceBetsReq)(implicit ec: ExecutionContext): Future[BaseResponse] = {
    logger.debug(s"Placing bet: $msg")

    msg.meta match {
      case x if BusinessErrorSimulator.shouldSimulateErrorForContext(BetRejectedRaceOff.toString)(x) =>
        Future(raceOffBettingError(msg.meta, Array("Simulated")))
      case x if BusinessErrorSimulator.shouldSimulateErrorForContext(BetRejectedOddsChanged.toString)(x) =>
        Future(oddsChangedBettingError(msg.meta, Array("Simulated")))
      case x if BusinessErrorSimulator.shouldSimulateErrorForContext(Unexpected.toString)(x) =>
        Future(unexpectedBettingError(msg.meta, Array("Simulated")))
      case _ =>
        val distributions = msg.placedChips.map(chip =>
          withCalculatedStake(chip)(getSelections))

        val combinedChips = combineChips(distributions)

        combinedChips match {
          case Left(failed) => Future(unexpectedBettingError(msg.meta, Array(failed.reason)))
          case Right(stakes) => placeMultiBet(msg, stakes)
        }
    }
  }

  private def getSelections(chip: UserChip, stake: StakeDistribution): Seq[SelectionStake] = {
    logger.info(s"Submitting chip ${chip.display} with stakes: ${describeSelections(stake.selections)}")
    stake.selections
  }

  private def combineChips(distributions: Seq[Either[FailedOperation, Seq[SelectionStake]]]): Either[FailedOperation, Seq[SelectionStake]] = {
    val eitherFlatten = distributions.reduce((either1, either2) =>
      for {
        a <- either1
        b <- either2
      } yield a ++ b)

    eitherFlatten.map(_
      .groupBy(_.participant.id)
      .mapValues(mergeRepeatedSelections)
      .values.toSeq)
  }

  private def mergeRepeatedSelections(distributions: Seq[SelectionStake]) =
    distributions.reduce((i1, i2) => createSelectionStake(i1.participant, MONEY.scaleToLong(i1.singleStake + i2.singleStake)))

  private def placeMultiBet(msg: PlaceBetsReq, selections: Seq[SelectionStake])
                           (implicit ec: ExecutionContext): Future[BaseResponse] = {

    val req = PlaceBetsRequest(selections.map(prepareSelection).sortBy(_.id),
      selections.map(prepareBet).sortBy(_.selectionsMapped.head.id)
    )

    bettingAPIClient.callPlaceBets(msg.userJWT, req)
      .transform {
        case Success(Right(response)) => Try(PlaceBetsResp(ResponseMetadata.success(msg.meta), response.id))
        case Success(Left(businessError)) => Try(handleBusinessError(msg.meta, businessError))
        case Failure(exception) => Try(unexpectedBettingError(msg.meta, Array(exception.getMessage)))
      }
  }

  private def prepareSelection(stake: SelectionStake) =
    BSelection(stake.participant.id, stake.participant.trueOdds, stake.participant.displayOdds)

  private def prepareBet(stake: SelectionStake) =
    Bet(stake.participant.trueOdds, stake.participant.displayOdds, Seq(SelectionMapped(stake.participant.id)), stake.singleStake, stake.singleReturn)

}
