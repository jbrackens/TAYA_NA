package phoenix.bets.support

import phoenix.bets.BetProtocol.BetRequest
import phoenix.bets.BetProtocol.Events.BetCancelled
import phoenix.bets.BetProtocol.Events.BetFailed
import phoenix.bets.BetProtocol.Events.BetOpened
import phoenix.bets.BetProtocol.Events.BetPushed
import phoenix.bets.BetProtocol.Events.BetResettled
import phoenix.bets.BetProtocol.Events.BetSettled
import phoenix.bets.BetProtocol.Events.BetVoided
import phoenix.bets.BetValidator
import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.BetsDomainConfig
import phoenix.bets.CancellationReason
import phoenix.bets.MaximumAllowedStakeAmount
import phoenix.bets.domain.PunterStake
import phoenix.punters.PunterDataGenerator.Api.generateAdminId
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.support.DataGenerator.generateBetData
import phoenix.support.DataGenerator.generateBetId
import phoenix.support.DataGenerator.generateGeolocation
import phoenix.support.DataGenerator.generateMarketId
import phoenix.support.DataGenerator.generateMoneyAmount
import phoenix.support.DataGenerator.generateOdds
import phoenix.support.DataGenerator.generateReservationId
import phoenix.support.DataGenerator.generateSelectionId
import phoenix.support.DataGenerator.generateStake
import phoenix.support.DataGenerator.randomBoolean
import phoenix.support.DataGenerator.randomElement
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DataGenerator.randomString

object BetDataGenerator {
  def generateCancellationReason(): CancellationReason =
    CancellationReason.unsafe(randomString(length = 100))

  def generateBetOpenedEvent(): BetOpened =
    BetOpened(
      generateBetId(),
      generateBetData(),
      generateReservationId(),
      generateGeolocation(),
      placedAt = randomOffsetDateTime())

  def generateBetSettledEvent(): BetSettled =
    BetSettled(generateBetId(), generateBetData(), generateReservationId(), winner = randomBoolean())

  def generateBetResettledEvent(): BetResettled =
    BetResettled(generateBetId(), generateBetData(), winner = randomBoolean(), randomOffsetDateTime())

  def generateBetVoidedEvent(): BetVoided =
    BetVoided(generateBetId(), generateBetData(), generateReservationId())

  def generateBetPushedEvent(): BetPushed =
    BetPushed(generateBetId(), generateBetData(), generateReservationId())

  def generateBetCancelledEvent(): BetCancelled =
    BetCancelled(
      generateBetId(),
      generateBetData(),
      generateReservationId(),
      generateAdminId(),
      generateCancellationReason(),
      randomOffsetDateTime())

  def generateBetFailedEventWithMarketDoesNotExistReason(): BetFailed = {
    val betData = generateBetData()
    BetFailed(generateBetId(), betData, List(BetValidator.MarketDoesNotExist(betData.marketId)))
  }

  def generateBetStatus(): BetStatus =
    randomElement(BetStatus.values)

  def generateBetOutcome(): BetOutcome =
    randomElement(BetOutcome.values)

  def generateMaximumAllowedStakeAmount(): MaximumAllowedStakeAmount =
    MaximumAllowedStakeAmount(generateMoneyAmount(minimumAmountInclusive = 10000))

  def generateBetsDomainConfig(): BetsDomainConfig = BetsDomainConfig(generateMaximumAllowedStakeAmount())

  private[bets] def generatePunterStake(betStatus: BetStatus = generateBetStatus()): PunterStake =
    PunterStake(
      generateBetId(),
      generatePunterId(),
      generateStake(),
      generateOdds(),
      randomOffsetDateTime(),
      betStatus,
      outcome = betStatus match {
        case BetStatus.Open      => None
        case BetStatus.Settled   => Some(generateBetOutcome())
        case BetStatus.Resettled => Some(generateBetOutcome())
        case BetStatus.Voided    => None
        case BetStatus.Pushed    => None
        case BetStatus.Cancelled => None
      })

  private[bets] def generateBetRequest(): BetRequest =
    BetRequest(
      generateMarketId(),
      generateSelectionId(),
      generateStake(),
      generateOdds(),
      acceptBetterOdds = randomBoolean())
}
