package phoenix.support
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.data.NonEmptyList
import cats.syntax.functor._
import org.scalatest.concurrent.Eventually
import org.scalatest.concurrent.PatienceConfiguration.Interval
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.matchers.should.Matchers
import org.scalatest.time.Millis
import org.scalatest.time.Seconds
import org.scalatest.time.Span

import phoenix.bets.BetData
import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetState
import phoenix.bets.BetsBoundedContext
import phoenix.bets.BetsBoundedContext.BetDetails
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.BetsDomainConfig
import phoenix.bets.GeolocationValidator
import phoenix.bets.Stake
import phoenix.bets.application.PlaceBet
import phoenix.bets.application.PlaceBetError
import phoenix.bets.domain.MarketBet
import phoenix.bets.domain.MarketBetsRepository
import phoenix.bets.domain.PunterStakeRepository
import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.http.core.Geolocation
import phoenix.markets.LifecycleChangeReason.DataSupplierStatusChange
import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketLifecycle.NotBettable
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.MarketStateUpdate
import phoenix.markets._
import phoenix.markets.domain.MarketType
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.punters.KeycloakDataConverter
import phoenix.punters.PunterDataGenerator.generateLastSignIn
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.Limits
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.UserDetails
import phoenix.punters.support.PunterConverters
import phoenix.support.DataGenerator._
import phoenix.support.TestScenarios.RandomMarket
import phoenix.support.TestScenarios.RandomPunter
import phoenix.support.TestScenarios.RandomSport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.support.UserGenerator.generateRemainingFirstFive
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.ConfirmationOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalOutcome.Confirmed
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalReservation
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod.CreditCardPaymentMethod

final class MarketScenarios(markets: MarketsBoundedContext)(implicit ec: ExecutionContext)
    extends FutureSupport
    with Eventually
    with Matchers {

  private val eventuallyTimeout: Timeout = Timeout(Span(60, Seconds))
  private val eventuallyInterval: Interval = Interval(Span(10, Millis))

  def bettableMarket(
      odds: NonEmptyList[SelectionOdds] = NonEmptyList.one(generateSelectionOdds()),
      displayToPunters: Option[Boolean] = Some(true)): RandomMarket =
    randomMarket(odds.toList, Bettable(DataSupplierStatusChange), displayToPunters)

  def notBettableMarket(
      odds: NonEmptyList[SelectionOdds] = NonEmptyList.one(generateSelectionOdds()),
      reason: LifecycleOperationalChangeReason = DataSupplierStatusChange): RandomMarket =
    randomMarket(odds.toList, NotBettable(reason), displayToPunters = None)

  def randomSport(): RandomSport = {
    val randomSport = generateSportRequest()
    markets.createOrUpdateSport(randomSport)
    ensureSportAvailable(randomSport.sportId)
    RandomSport(randomSport.sportId)
  }

  def randomFixture(fixtureStatus: FixtureLifecycleStatus = FixtureLifecycleStatus.InPlay): UpdateFixtureRequest = {
    val randomSport = generateSportRequest()
    val randomFixture = {
      val randomTournament = generateTournament()
      generateFixtureRequest().copy(
        sportId = randomSport.sportId,
        sportName = randomSport.sportName,
        sportAbbreviation = randomSport.sportAbbreviation,
        tournamentId = randomTournament.tournamentId,
        tournamentName = randomTournament.name,
        tournamentStartTime = randomTournament.startTime,
        fixtureStatus = fixtureStatus)
    }

    await(for {
      _ <- markets.createOrUpdateSport(randomSport)
      _ <- markets.createOrUpdateFixture(randomFixture)
    } yield ())

    ensureFixtureAvailable(randomFixture.fixtureId, randomFixture.fixtureStatus)
    randomFixture
  }

  private def randomMarket(
      selectionOdds: List[SelectionOdds],
      lifecycle: MarketLifecycle,
      displayToPunters: Option[Boolean]): RandomMarket = {
    val randomSport = generateSportRequest(displayToPunters = displayToPunters)
    val randomFixture = {
      val randomTournament = generateTournament()
      generateFixtureRequest().copy(
        sportId = randomSport.sportId,
        sportName = randomSport.sportName,
        sportAbbreviation = randomSport.sportAbbreviation,
        tournamentId = randomTournament.tournamentId,
        tournamentName = randomTournament.name,
        tournamentStartTime = randomTournament.startTime)
    }
    val randomMarket = generateMarketRequest().copy(
      fixtureId = randomFixture.fixtureId,
      marketLifecycle = lifecycle,
      selectionOdds = selectionOdds)

    createMarket(randomSport, randomFixture, randomMarket)
  }

  def createMarkets(
      sportRequest: UpdateSportRequest,
      fixtureRequest: UpdateFixtureRequest,
      marketRequests: Seq[UpdateMarketRequest]): Seq[RandomMarket] = {
    marketRequests.map { marketRequest =>
      createMarket(sportRequest, fixtureRequest, marketRequest)
    }
  }

  private def createMarket(
      sportRequest: UpdateSportRequest,
      fixtureRequest: UpdateFixtureRequest,
      marketRequest: UpdateMarketRequest): RandomMarket = {
    val marketCategory = marketRequest.marketCategory.getOrElse(MarketCategory(marketRequest.marketType.entryName))
    val market = await(
      for {
        sportId <- markets.createOrUpdateSport(sportRequest)
        fixtureCreated <- markets.createOrUpdateFixture(fixtureRequest)
        marketId <- markets.createOrUpdateMarket(marketRequest)
        _ <- markets.changeVisibility(sportId, marketCategory, MarketVisibility.Featured).value
        _ <- markets.makeTournamentDisplayable(fixtureRequest.tournamentId)
      } yield RandomMarket(
        sportId,
        fixtureCreated.tournamentId,
        fixtureCreated.fixtureId,
        marketId,
        marketRequest.marketName,
        marketRequest.marketType,
        marketCategory,
        marketRequest.marketLifecycle,
        marketRequest.marketSpecifiers,
        marketRequest.selectionOdds))

    // because we're using projections within BC...
    ensureMarketAvailable(market.marketId, marketRequest.marketLifecycle)
    market
  }

  private def ensureMarketAvailable(marketId: MarketId, expectedLifecycle: MarketLifecycle): Unit =
    eventually(eventuallyTimeout, eventuallyInterval) {
      val market = awaitRight(markets.getMarket(marketId))
      market.currentLifecycle shouldBe expectedLifecycle
    }

  private def ensureFixtureAvailable(fixtureId: FixtureId, expectedLifecycle: FixtureLifecycleStatus): Unit =
    eventually(eventuallyTimeout, eventuallyInterval) {
      val fixture = awaitRight(markets.getFixtureDetails(fixtureId, MarketVisibility.values.toSet))
      fixture.status shouldBe expectedLifecycle
    }

  private def ensureSportAvailable(sportId: SportId): Unit =
    eventually(eventuallyTimeout, eventuallyInterval) {
      val sports = await(markets.listAllSports())
      sports.map(_.id) should contain(sportId)
    }
}

final class PunterScenarios(
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    clock: Clock)(implicit ec: ExecutionContext)
    extends FutureSupport {

  def punterWithWallet(
      initialBalance: DefaultCurrencyMoney = DefaultCurrencyMoney(generateMoneyAmount().amount),
      punterId: PunterId = PunterId(UUID.randomUUID().toString)): RandomPunter = {
    val walletId = WalletId.deriveFrom(punterId)
    val balance = Balance(RealMoney(initialBalance))

    awaitRight(
      punters.createUnverifiedPunterProfile(
        punterId,
        depositLimits = Limits.none,
        stakeLimits = Limits.none,
        sessionLimits = Limits.none,
        referralCode = None,
        isTestAccount = false))
    awaitRight(punters.verifyPunter(punterId, ActivationPath.IDPV))
    awaitRight(wallets.createWallet(walletId, balance))
    RandomPunter(punterId, walletId, balance)
  }

  def punterWithRegisteredUserAndWallet(
      initialBalance: DefaultCurrencyMoney = DefaultCurrencyMoney(generateMoneyAmount().amount)): RandomPunter = {
    val userDetails = UserGenerator.generateUserDetails()
    val ssn = generateRemainingFirstFive(userDetails.ssn)
    val lastSignIn = Some(generateLastSignIn())
    val punterId = await(
      authenticationRepository.register(KeycloakDataConverter.fromUserDetails(userDetails), randomValidPassword()))
    awaitRight(
      puntersRepository.register(
        PunterConverters.createPunter(punterId, userDetails, Right(ssn), lastSignIn, isAccountVerified = true),
        clock.currentOffsetDateTime()))
    punterWithWallet(initialBalance, punterId)
  }

  def punterAccount(initialBalance: DefaultCurrencyMoney = DefaultCurrencyMoney(generateMoneyAmount().amount))
      : (RandomPunter, UserDetails) = {
    val userDetails = UserGenerator.generateUserDetails()
    val ssn = generateRemainingFirstFive(userDetails.ssn)
    val lastSignIn = Some(generateLastSignIn())
    val punterId = await(
      authenticationRepository.register(KeycloakDataConverter.fromUserDetails(userDetails), randomValidPassword()))
    awaitRight(
      puntersRepository.register(
        PunterConverters.createPunter(punterId, userDetails, Right(ssn), lastSignIn, isAccountVerified = true),
        clock.currentOffsetDateTime()))

    val punter = punterWithWallet(initialBalance, punterId)

    punter -> userDetails
  }
}

final class BetScenarios(
    bets: BetsBoundedContext,
    wallets: WalletsBoundedContext,
    markets: MarketsBoundedContext,
    marketBetsRepository: MarketBetsRepository,
    punterStakeRepository: PunterStakeRepository,
    geolocationValidator: GeolocationValidator,
    betsDomainConfig: BetsDomainConfig,
    clock: Clock)(implicit ec: ExecutionContext)
    extends FutureSupport
    with Eventually
    with Matchers {

  private val eventuallyTimeout: Timeout = Timeout(Span(30, Seconds))
  private val eventuallyInterval: Interval = Interval(Span(10, Millis))

  private val placeBetsUseCase =
    new PlaceBet(
      bets,
      wallets,
      markets,
      marketBetsRepository,
      punterStakeRepository,
      geolocationValidator,
      betsDomainConfig.maximumAllowedStakeAmount,
      clock)

  def placeBet(betId: BetId, betData: BetData, geolocation: Geolocation): EitherT[Future, PlaceBetError, Unit] =
    placeBetsUseCase.placeBet(betId, betData, geolocation)

  def placedBet(punterId: PunterId, marketId: MarketId, selection: SelectionOdds, stake: Stake): BetId = {
    val betId = BetId.random()
    awaitRight(
      placeBet(
        betId,
        BetData(punterId, marketId, selection.selectionId, stake, selection.odds.get),
        generateGeolocation()))
    betId
  }

  def settledBet(punterId: PunterId, marketId: MarketId, selection: SelectionOdds, stake: Stake): BetId = {
    val betId = placedBet(punterId, marketId, selection, stake)
    awaitRight(bets.settleBets(marketId, winningSelectionId = selection.selectionId))

    eventually(eventuallyTimeout, eventuallyInterval) {
      getBetDetails(betId, bets).status shouldBe BetState.Status.Settled
      await(marketBetsRepository.settledBetsForMarket(marketId)) should contain only MarketBet(
        betId,
        marketId,
        BetStatus.Settled)
      betId
    }
  }

  def getBetDetails(betId: BetId, betsBoundedContext: BetsBoundedContext): BetDetails =
    awaitRight(betsBoundedContext.betDetails(betId))
}

final class WalletScenarios(wallets: WalletsBoundedContext)(implicit ec: ExecutionContext) extends FutureSupport {
  private val paymentMethod = CreditCardPaymentMethod

  def deposit(walletId: WalletId, amount: MoneyAmount): Unit =
    awaitRight(
      wallets
        .deposit(walletId, PositiveAmount.ensure(RealMoney(amount)).unsafe(), CreditFundsReason.Deposit, paymentMethod)
        .void)

  def pendingWithdrawal(walletId: WalletId, amount: MoneyAmount): ReservationId = {
    val reservationResponse = awaitRight(wallets.reserveForWithdrawal(
      walletId,
      WithdrawalReservation(generateReservationId(), PositiveAmount.ensure(RealMoney(amount)).unsafe(), paymentMethod)))
    reservationResponse.reservationId
  }

  def confirmedWithdrawal(walletId: WalletId, amount: MoneyAmount): Unit = {
    val reservationId = pendingWithdrawal(walletId, amount)
    awaitRight(wallets.finalizeWithdrawal(walletId, reservationId, Confirmed(ConfirmationOrigin.PaymentGateway)).void)
  }
}

object TestScenarios {

  final case class RandomSport(sportId: SportId)

  final case class RandomMarket(
      sportId: SportId,
      tournamentId: TournamentId,
      fixtureId: FixtureId,
      marketId: MarketId,
      marketName: String,
      marketType: MarketType,
      marketCategory: MarketCategory,
      marketLifecycle: MarketLifecycle,
      marketSpecifiers: Seq[MarketSpecifier],
      selections: Seq[SelectionOdds]) {

    def toMarketStateUpdate: MarketStateUpdate =
      MarketStateUpdate(
        marketId,
        marketName,
        marketType,
        marketCategory,
        marketLifecycle,
        MarketDataConverters.marketSpecifiersToMap(marketSpecifiers),
        selections)
  }

  final case class RandomPunter(punterId: PunterId, walletId: WalletId, balance: Balance)
}
