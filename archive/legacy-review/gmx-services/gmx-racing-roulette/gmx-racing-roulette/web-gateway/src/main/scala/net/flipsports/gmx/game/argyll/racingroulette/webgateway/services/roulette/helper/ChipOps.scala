package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.helper

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request.UserChip
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.stake.{StakeCalculator, StakeDistribution}

import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}

trait ChipOps extends StakeCalculator {

  protected def withCalculatedStake[OUT](chip: UserChip)
                                        (block: (UserChip, StakeDistribution) => OUT)
                                        (implicit ec: ExecutionContext): Either[FailedOperation, OUT] = {
    val calculatedStakes = distributeStake(chip.totalStake, chip.selectedParticipants)

    calculatedStakes match {
      case Success(stake) =>
        val result = block(chip, stake)
        Right(result)
      case Failure(exception) =>
        Left(FailedOperation(chip.describe(), exception.getMessage))
    }
  }
}

