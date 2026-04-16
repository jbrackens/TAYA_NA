package phoenix.bets

import java.time.OffsetDateTime
import java.time.temporal.ChronoUnit

import org.scalatest.enablers.Emptiness.emptinessOfGenTraversable
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetsBoundedContext.BetHistory
import phoenix.bets.BetsBoundedContext.BetHistoryQuery
import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.BetsBoundedContext.BetSummary
import phoenix.core.Clock
import phoenix.core.domain.DataProvider
import phoenix.core.pagination.Pagination
import phoenix.http.routes.EndpointInputs.TimeRange
import phoenix.markets.MarketsBoundedContext.MarketAggregate.CompetitorSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.FixtureSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.MarketSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.SelectionSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.SportSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.TournamentSummary
import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.punters.PunterDataGenerator.Api._
import phoenix.punters.PunterEntity.PunterId
import phoenix.support.DataGenerator._
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext

final class PunterBetHistoryRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext {

  private implicit val clock: Clock = Clock.utcClock
  private val today: OffsetDateTime = clock.currentOffsetDateTime().truncatedTo(ChronoUnit.DAYS)
  private val yesterday: OffsetDateTime = today.minusDays(1)
  private val weekAgo: OffsetDateTime = today.minusWeeks(1)
  private val twoWeeksAgo: OffsetDateTime = today.minusWeeks(2)
  private val getAllRecordsOnSinglePage: Pagination = Pagination(1, 10000)

  withRepository { objectUnderTest =>
    "Punter bets repository" should {
      "be able to create and then retrieve bet by its id" in {
        // given
        val punterBet = randomBetHistoryWithoutCompetitor(generatePunterId())
        await(objectUnderTest.save(punterBet))

        // when
        val betFromDatabase = await(objectUnderTest.get(punterBet.bet.id))

        // then
        betFromDatabase shouldBe Some(punterBet)
      }

      "be able to store and retrieve voided bets" in {
        // given
        val voidedBet =
          randomBetHistory(
            generatePunterId(),
            status = BetStatus.Voided,
            voidedAt = Some(today),
            outcome = None,
            settledAt = None)
        await(objectUnderTest.save(voidedBet))

        // when
        val betFromDatabase = await(objectUnderTest.get(voidedBet.bet.id))

        // then
        betFromDatabase shouldBe Some(voidedBet)
      }

      "be able to store and retrieve cancelled bets" in {
        // given
        val cancelledBet =
          randomBetHistory(
            generatePunterId(),
            status = BetStatus.Cancelled,
            cancelledAt = Some(today),
            outcome = None,
            settledAt = None)
        await(objectUnderTest.save(cancelledBet))

        // when
        val betFromDatabase = await(objectUnderTest.get(cancelledBet.bet.id))

        // then
        betFromDatabase shouldBe Some(cancelledBet)
      }

      "be able to create and then retrieve bet without competitor" in {
        // given
        val punterBet = randomBetHistory(generatePunterId())
        await(objectUnderTest.save(punterBet))

        // when
        val betFromDatabase = await(objectUnderTest.get(punterBet.bet.id))

        // then
        betFromDatabase shouldBe Some(punterBet)
      }

      "be able to search bets by punter id" in {
        // given
        val punterId = generatePunterId()
        val expectedBet = randomBetHistory(punterId)
        val anotherPuntersBet = randomBetHistory(generatePunterId())

        await(objectUnderTest.save(expectedBet))
        await(objectUnderTest.save(anotherPuntersBet))

        // when
        val query =
          BetHistoryQuery(
            placedWithin = Some(TimeRange.lastDays(90)),
            statuses = BetStatus.values.toSet,
            pagination = getAllRecordsOnSinglePage)
        val bets = await(objectUnderTest.find(punterId, query))

        // then
        bets.data shouldBe List(expectedBet)
      }

      "be able to search bets by narrowing time range" in {
        // given
        val punterId = generatePunterId()
        val placedToday = randomBetHistory(punterId, placedAt = today)
        val placedYesterday = randomBetHistory(punterId, placedAt = yesterday)
        val placedTwoDaysAgo = randomBetHistory(punterId, placedAt = today.minusDays(2))
        val placedWeekAgo = randomBetHistory(punterId, placedAt = weekAgo)
        val placedTwoWeeksAgo = randomBetHistory(punterId, placedAt = twoWeeksAgo)

        await(objectUnderTest.save(placedToday))
        await(objectUnderTest.save(placedYesterday))
        await(objectUnderTest.save(placedTwoDaysAgo))
        await(objectUnderTest.save(placedWeekAgo))
        await(objectUnderTest.save(placedTwoWeeksAgo))

        // when
        val weekAgoTillYesterday = TimeRange(weekAgo, yesterday)
        val query = BetHistoryQuery(
          placedWithin = Some(weekAgoTillYesterday),
          statuses = BetStatus.values.toSet,
          pagination = getAllRecordsOnSinglePage)
        val bets = await(objectUnderTest.find(punterId, query))

        // then
        bets.data shouldBe List(placedYesterday, placedTwoDaysAgo, placedWeekAgo)
      }

      "be able to search bets by narrowing status" in {
        // given
        val punterId = generatePunterId()
        val openBet = randomBetHistory(punterId, status = BetStatus.Open)
        val settledBet =
          randomBetHistory(
            punterId,
            status = BetStatus.Settled,
            outcome = Some(BetOutcome.Won),
            settledAt = Some(today))
        val voidedBet =
          randomBetHistory(
            punterId,
            status = BetStatus.Voided,
            voidedAt = Some(today),
            outcome = None,
            settledAt = None)
        val cancelledBet =
          randomBetHistory(
            punterId,
            status = BetStatus.Cancelled,
            cancelledAt = Some(today),
            outcome = None,
            settledAt = None)

        await(objectUnderTest.save(openBet))
        await(objectUnderTest.save(settledBet))
        await(objectUnderTest.save(voidedBet))
        await(objectUnderTest.save(cancelledBet))

        // then
        val openQuery =
          BetHistoryQuery(
            placedWithin = Some(TimeRange.lastDays(90)),
            statuses = Set(BetStatus.Open),
            pagination = getAllRecordsOnSinglePage)
        val openBets = await(objectUnderTest.find(punterId, openQuery))
        openBets.data shouldBe List(openBet)

        // and
        val settledQuery =
          BetHistoryQuery(
            placedWithin = Some(TimeRange.lastDays(90)),
            statuses = Set(BetStatus.Settled),
            pagination = getAllRecordsOnSinglePage)
        val settledBets = await(objectUnderTest.find(punterId, settledQuery))

        settledBets.data shouldBe List(settledBet)
      }

      "be able to perform compound search" in {
        // given
        val punterId = generatePunterId()
        val placedByDifferentPunter = randomBetHistory(generatePunterId())
        val placeLongTimeAgo = randomBetHistory(punterId, placedAt = today.minusMonths(6))
        val alreadySettled = randomBetHistory(
          punterId,
          placedAt = twoWeeksAgo,
          settledAt = Some(weekAgo),
          outcome = Some(BetOutcome.Lost),
          status = BetStatus.Settled)
        val expectedBet = randomBetHistory(punterId, placedAt = weekAgo, status = BetStatus.Open)

        await(objectUnderTest.save(placedByDifferentPunter))
        await(objectUnderTest.save(placeLongTimeAgo))
        await(objectUnderTest.save(alreadySettled))
        await(objectUnderTest.save(expectedBet))

        // when
        val query = BetHistoryQuery(
          placedWithin = Some(TimeRange.lastDays(90)),
          statuses = Set(BetStatus.Open),
          pagination = getAllRecordsOnSinglePage)
        val bets = await(objectUnderTest.find(punterId, query))

        // then
        bets.data shouldBe List(expectedBet)
      }

      "properly implement pagination" in {
        // given
        val punterId = generatePunterId()
        val `5daysAgo` = randomBetHistory(punterId, placedAt = today.minusDays(5))
        val `4daysAgo` = randomBetHistory(punterId, placedAt = today.minusDays(4))
        val `3daysAgo` = randomBetHistory(punterId, placedAt = today.minusDays(3))
        val `2daysAgo` = randomBetHistory(punterId, placedAt = today.minusDays(2))
        val `1dayAgo` = randomBetHistory(punterId, placedAt = yesterday)

        await(objectUnderTest.save(`1dayAgo`))
        await(objectUnderTest.save(`2daysAgo`))
        await(objectUnderTest.save(`3daysAgo`))
        await(objectUnderTest.save(`4daysAgo`))
        await(objectUnderTest.save(`5daysAgo`))

        // then
        val firstPage = Pagination(currentPage = 1, itemsPerPage = 2)
        val query =
          BetHistoryQuery(
            placedWithin = Some(TimeRange.lastDays(90)),
            statuses = Set(BetStatus.Open),
            pagination = firstPage)
        val firstPageResult = await(objectUnderTest.find(punterId, query))

        firstPageResult.data shouldBe List(`1dayAgo`, `2daysAgo`)
        firstPageResult.hasNextPage shouldBe true

        // and
        val secondPage = Pagination(currentPage = 2, itemsPerPage = 2)
        val secondPageResult = await(objectUnderTest.find(punterId, query.copy(pagination = secondPage)))

        secondPageResult.data shouldBe List(`3daysAgo`, `4daysAgo`)
        secondPageResult.hasNextPage shouldBe true

        // and
        val thirdPage = Pagination(currentPage = 3, itemsPerPage = 2)
        val thirdPageResult = await(objectUnderTest.find(punterId, query.copy(pagination = thirdPage)))

        thirdPageResult.data shouldBe List(`5daysAgo`)
        thirdPageResult.hasNextPage shouldBe false

        // and
        val nonExistingPage = Pagination(currentPage = 2137, itemsPerPage = 2137)
        val nonExistingPageResult = await(objectUnderTest.find(punterId, query.copy(pagination = nonExistingPage)))

        nonExistingPageResult.data should be(empty)
        nonExistingPageResult.hasNextPage shouldBe false
      }

      "be able to search for settled bets with particular outcome" in {
        // given: 2 settled, winning bets and 2 settled, losing bets
        val punterId = generatePunterId()
        val winningBetPlacedToday = randomWinningBet(punterId, placedAndSettledAt = today)
        val winningBetPlacedYesterday = randomWinningBet(punterId, placedAndSettledAt = yesterday)
        val losingBetPlacedToday = randomLosingBet(punterId, placedAndSettledAt = today)
        val losingBetPlacedYesterday = randomLosingBet(punterId, placedAndSettledAt = yesterday)

        await(objectUnderTest.save(winningBetPlacedToday))
        await(objectUnderTest.save(winningBetPlacedYesterday))
        await(objectUnderTest.save(losingBetPlacedToday))
        await(objectUnderTest.save(losingBetPlacedYesterday))

        // when: searching for settled, winning bets
        val weekAgoTillToday = TimeRange(weekAgo, today)
        val winningBetsQuery = BetHistoryQuery(
          placedWithin = Some(weekAgoTillToday),
          statuses = Set(BetStatus.Settled),
          outcome = Some(BetOutcome.Won),
          pagination = getAllRecordsOnSinglePage)
        val winningBets = await(objectUnderTest.find(punterId, winningBetsQuery))

        // then: the expected bets are found
        winningBets.data shouldBe List(winningBetPlacedToday, winningBetPlacedYesterday)

        // when: searching for settled, losing bets
        val losingBetsQuery = BetHistoryQuery(
          placedWithin = Some(weekAgoTillToday),
          statuses = Set(BetStatus.Settled),
          outcome = Some(BetOutcome.Lost),
          pagination = getAllRecordsOnSinglePage)
        val losingBets = await(objectUnderTest.find(punterId, losingBetsQuery))

        // then: the expected bets are found
        losingBets.data shouldBe List(losingBetPlacedToday, losingBetPlacedYesterday)
      }

      "properly implement pagination when filtering by outcome" in {
        // given: 3 settled bets
        val punterId = generatePunterId()
        val winningBetPlacedToday = randomWinningBet(punterId, placedAndSettledAt = today)
        val winningBetPlacedYesterday = randomWinningBet(punterId, placedAndSettledAt = yesterday)
        val losingBetPlacedYesterday = randomLosingBet(punterId, placedAndSettledAt = yesterday)
        val winningBetPlacedWeekAgo = randomWinningBet(punterId, placedAndSettledAt = weekAgo)
        val winningBetPlacedTwoWeeksAgo = randomWinningBet(punterId, placedAndSettledAt = twoWeeksAgo)
        val openBetPlacedYesterday = randomBetHistory(punterId, placedAt = yesterday)

        await(objectUnderTest.save(winningBetPlacedToday))
        await(objectUnderTest.save(winningBetPlacedYesterday))
        await(objectUnderTest.save(losingBetPlacedYesterday))
        await(objectUnderTest.save(openBetPlacedYesterday))
        await(objectUnderTest.save(winningBetPlacedWeekAgo))
        await(objectUnderTest.save(winningBetPlacedTwoWeeksAgo))

        // when: trying to get first page with size 2
        val firstPage = Pagination(currentPage = 1, itemsPerPage = 2)
        val query =
          BetHistoryQuery(
            placedWithin = Some(TimeRange.lastDays(8)),
            statuses = BetStatus.values.toSet,
            outcome = Some(BetOutcome.Won),
            pagination = firstPage)
        val firstPageResult = await(objectUnderTest.find(punterId, query))

        // then: it contains result limited by page size
        firstPageResult.data shouldBe List(winningBetPlacedToday, winningBetPlacedYesterday)
        firstPageResult.hasNextPage shouldBe true

        // when: trying to get second page
        val secondPage = Pagination(currentPage = 2, itemsPerPage = 2)
        val secondPageResult =
          await(objectUnderTest.find(punterId, query.copy(pagination = secondPage)))

        // then: it contains remaining entries, below page size
        secondPageResult.data shouldBe List(winningBetPlacedWeekAgo)
        secondPageResult.hasNextPage shouldBe false

        // when: trying to get non-existent page
        val nonExistingPage = Pagination(currentPage = 3, itemsPerPage = 2)
        val nonExistingPageResult =
          await(objectUnderTest.find(punterId, query.copy(pagination = nonExistingPage)))

        // then: there are no entries
        nonExistingPageResult.data should be(empty)
        nonExistingPageResult.hasNextPage shouldBe false
      }
    }
  }

  private def randomBetHistory(
      punterId: PunterId,
      placedAt: OffsetDateTime = today,
      settledAt: Option[OffsetDateTime] = None,
      resettledAt: Option[OffsetDateTime] = None,
      voidedAt: Option[OffsetDateTime] = None,
      pushedAt: Option[OffsetDateTime] = None,
      cancelledAt: Option[OffsetDateTime] = None,
      outcome: Option[BetOutcome] = None,
      status: BetStatus = BetStatus.Open): BetHistory = {

    val bet =
      BetSummary(
        generateBetId(),
        generateStake(),
        generateOdds(),
        placedAt,
        settledAt = settledAt,
        resettledAt = resettledAt,
        voidedAt = voidedAt,
        cancelledAt = cancelledAt,
        outcome = outcome,
        status = status,
        pushedAt = pushedAt)
    val sport = SportSummary(generateSportId(), generateSportName())
    val tournament = TournamentSummary(generateTournamentId(), generateTournamentName())
    val fixture = FixtureSummary(
      generateFixtureId(),
      generateFixtureName(),
      clock.currentOffsetDateTime(),
      generateFixtureLifecycleStatus)
    val market = MarketSummary(generateMarketId(), generateMarketName())
    val selection = SelectionSummary(generateSelectionId(), generateSelectionName())
    val competitor = Some(
      CompetitorSummary(CompetitorId(DataProvider.Oddin, generateIdentifier()), generateSelectionName()))

    BetHistory(punterId, bet, sport, tournament, fixture, market, selection, competitor)
  }

  private def randomBetHistoryWithoutCompetitor(punterId: PunterId): BetHistory =
    randomBetHistory(punterId).copy(competitor = None)

  private def randomWinningBet(punterId: PunterId, placedAndSettledAt: OffsetDateTime): BetHistory =
    randomBetHistory(
      punterId,
      placedAt = placedAndSettledAt,
      settledAt = Some(placedAndSettledAt),
      status = BetStatus.Settled,
      outcome = Some(BetOutcome.Won))

  private def randomLosingBet(punterId: PunterId, placedAndSettledAt: OffsetDateTime): BetHistory =
    randomBetHistory(
      punterId,
      placedAt = placedAndSettledAt,
      settledAt = Some(placedAndSettledAt),
      status = BetStatus.Settled,
      outcome = Some(BetOutcome.Lost))

  private[this] def withRepository(f: PunterBetHistoryRepository => Any): Unit = {
    val repository = new PunterBetHistoryRepository(dbConfig)
    f(repository)
  }
}
