package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.time.Seconds
import org.scalatest.time.Span
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.ActorBetsBoundedContext
import phoenix.bets.BetData
import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetState
import phoenix.bets.BetsBoundedContext
import phoenix.bets.BetsBoundedContext.BetHistoryQuery
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.Stake
import phoenix.bets.infrastructure.SlickMarketBetsRepository
import phoenix.bets.support.BetsBoundedContextMock
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.emailing.EmailSenderStub
import phoenix.core.emailing.EmailingModule
import phoenix.core.odds.Odds
import phoenix.core.pagination.Pagination
import phoenix.core.scheduler.SchedulerModule
import phoenix.http.core.Geolocation
import phoenix.markets.ActorMarketsBoundedContext
import phoenix.markets.LifecycleChangeReason.DataSupplierStatusChange
import phoenix.markets.MarketCategory
import phoenix.markets.MarketLifecycle
import phoenix.markets.MarketProtocol.Events.MarketEvent
import phoenix.markets.MarketVisibility
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.SelectionOdds
import phoenix.markets.UpdateFixtureRequest
import phoenix.markets.UpdateMarketRequest
import phoenix.markets.UpdateSportRequest
import phoenix.markets.domain.MarketType
import phoenix.markets.sports.Competitor
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.punters.ActorPuntersBoundedContext
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.generateRegisteredUserKeycloak
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.ReferralCode
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.PunterState.SelfExclusionDuration
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.PuntersConfig
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.DepositLimitAmount
import phoenix.punters.domain.Limits
import phoenix.punters.domain.PunterProfile
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.domain.SessionDuration
import phoenix.punters.domain.StakeLimitAmount
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.punters.support.TermsAndConditionsRepositoryMock
import phoenix.punters.support.TestAuthenticationRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.TestEventQueue
import phoenix.utils.RandomUUIDGenerator
import phoenix.wallets.WalletProjectionRunner
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId

class SelfExcludeSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with Eventually {

  implicit val eventuallyPatience = PatienceConfig(scaled(Span(30, Seconds)), scaled(Span(1, Seconds)))

  implicit val clock: Clock = Clock.utcClock
  val schedulerModule: SchedulerModule = SchedulerModule.init(clock)(system)
  val authenticationRepository: AuthenticationRepository = new TestAuthenticationRepository() {
    override def findUser(userId: AuthenticationRepository.UserLookupId): Future[Option[RegisteredUserKeycloak]] =
      Future.successful(Some(generateRegisteredUserKeycloak()))
  }

  val puntersBC: PuntersBoundedContext = ActorPuntersBoundedContext(
    PuntersConfig.of(system),
    system,
    authenticationRepository,
    new WalletContextProviderSuccess(clock),
    BetsBoundedContextMock.betsWithDomainFailureMock,
    EmailingModule.init(new EmailSenderStub()).mailer,
    new TermsAndConditionsRepositoryMock(),
    new InMemoryExcludedPlayersRepository(),
    new InMemoryPuntersRepository(),
    dbConfig,
    clock,
    schedulerModule.akkaJobScheduler,
    RandomUUIDGenerator,
    WalletProjectionRunner.build(system, dbConfig))

  val marketBetsRepository = new SlickMarketBetsRepository(dbConfig)

  val marketsBC: MarketsBoundedContext = ActorMarketsBoundedContext(system, dbConfig)
  val marketEventsQueue: TestEventQueue[MarketEvent] = TestEventQueue.instance
  val betsBC: BetsBoundedContext =
    ActorBetsBoundedContext(system, marketsBC, marketBetsRepository, dbConfig, marketEventsQueue)

  val selfExcludeUseCase = new SelfExclude(puntersBC, betsBC)

  "SelfExcluded" should {
    "cancel open bets for the self-excluded punter" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createActivePunterProfile(punterId))

      val (marketId, selectionId) = await(createMarket())

      eventually { awaitRight(marketsBC.getMarket(marketId)) }

      val betId = BetId.random()
      awaitRight(openBet(betId, punterId, marketId, selectionId))

      eventually {
        val bets = await(
          betsBC
            .searchForBets(punterId, BetHistoryQuery(statuses = Set(BetStatus.Open), pagination = Pagination(1, 1000))))
        bets.data.size should be > 0
      }

      // when
      awaitRight(selfExcludeUseCase.selfExclude(punterId, SelfExclusionDuration.FiveYears))

      // then
      eventually {
        val openBet = awaitRight(betsBC.betDetails(betId))
        openBet.status shouldBe BetState.Status.Cancelled
      }
    }

    "terminate the open session" in {
      // given
      val punterId = generatePunterId()
      awaitRight(createActivePunterProfile(punterId))

      awaitRight(
        puntersBC.startSession(
          punterId,
          SessionId(RandomUUIDGenerator.generate().toString),
          clock.currentOffsetDateTime(),
          ipAddress = None))

      // when
      awaitRight(selfExcludeUseCase.selfExclude(punterId, SelfExclusionDuration.FiveYears))

      // then
      eventually {
        val punterProfile = awaitRight(puntersBC.getPunterProfile(punterId))
        punterProfile.maybeCurrentSession shouldBe None
      }
    }
  }

  private def openBet(betId: BetId, punterId: PunterId, marketId: MarketId, selectionId: String) =
    betsBC.openBet(
      betId,
      BetData(
        punterId,
        marketId,
        selectionId,
        Stake.unsafe(DefaultCurrencyMoney(MoneyAmount(BigDecimal(1)))),
        Odds(2.0)),
      Geolocation.apply("US"),
      ReservationId("reservation"),
      clock.currentOffsetDateTime())

  private def createMarket() = {
    val sportId = SportId.unsafeParse("s:o:1")
    val marketId = MarketId.unsafeParse("m:o:1")
    val selectionId = "1"
    val selectionQualifier = "home"
    val marketCategory = MarketCategory("X kill")
    for {
      _ <- marketsBC.createOrUpdateSport(
        UpdateSportRequest(
          correlationId = "correlationId",
          receivedAtUtc = clock.currentOffsetDateTime(),
          sportId = sportId,
          sportName = "sportName",
          sportAbbreviation = "abbr",
          displayToPunters = Some(true)))
      _ <- marketsBC.createOrUpdateFixture(
        UpdateFixtureRequest(
          correlationId = "correlationId",
          receivedAtUtc = clock.currentOffsetDateTime(),
          sportId = SportId.unsafeParse("s:o:1"),
          sportName = "sportName",
          sportAbbreviation = "abbr",
          tournamentId = TournamentId.unsafeParse("t:o:1"),
          tournamentName = "tournament",
          tournamentStartTime = clock.currentOffsetDateTime(),
          fixtureId = FixtureId.unsafeParse("f:o:1"),
          fixtureName = "fixture",
          startTime = clock.currentOffsetDateTime(),
          competitors = Set(Competitor(CompetitorId.unsafeParse("c:o:1"), "competitor", selectionQualifier)),
          currentScore = None,
          fixtureStatus = FixtureLifecycleStatus.InPlay))
      _ <- marketsBC.createOrUpdateMarket(
        UpdateMarketRequest(
          correlationId = "correlationId",
          receivedAtUtc = clock.currentOffsetDateTime(),
          fixtureId = FixtureId.unsafeParse("f:o:1"),
          marketId = marketId,
          marketName = "market",
          Some(marketCategory),
          marketType = MarketType.NthKill,
          marketLifecycle = MarketLifecycle.Bettable(DataSupplierStatusChange),
          marketSpecifiers = Seq(),
          selectionOdds = Seq(SelectionOdds(selectionId, selectionQualifier, Some(Odds(2.0)), true))))
      _ <- marketsBC.changeVisibility(sportId, marketCategory, MarketVisibility.Enabled).value
    } yield (marketId, selectionId)
  }

  private def createActivePunterProfile(
      id: PunterId,
      depositLimits: Limits[DepositLimitAmount] = Limits.none,
      stakeLimits: Limits[StakeLimitAmount] = Limits.none,
      sessionLimits: Limits[SessionDuration] = Limits.none,
      referralCode: Option[ReferralCode] = None,
      isTestAccount: Boolean = false)(implicit ec: ExecutionContext): EitherT[Future, String, PunterProfile] =
    for {
      profile <-
        puntersBC
          .createUnverifiedPunterProfile(id, depositLimits, stakeLimits, sessionLimits, referralCode, isTestAccount)
          .leftMap(_.toString)
      _ <- puntersBC.verifyPunter(id, ActivationPath.IDPV).leftMap(_.toString)
    } yield profile
}
