package phoenix.betgenius.domain

import java.util.UUID

import scala.util.Random

import com.github.javafaker.Faker

import phoenix.core.Clock

object BetgeniusDataGenerator {

  private val faker = new Faker()
  private val clock: Clock = Clock.utcClock

  def randomHeader: Header = Header(UUID.randomUUID(), clock.currentOffsetDateTime())

  def randomIdValue: Int = faker.random().nextInt(100000)

  def randomFixtureId: FixtureId = FixtureId(randomIdValue)
  def randomMarketId: MarketId = MarketId(randomIdValue)
  def randomSelectionId: SelectionId = SelectionId(randomIdValue)
  def randomSportId: SportId = SportId(randomIdValue)

  def randomName: String = faker.funnyName().name()

  def randomRegion: Region = Region(RegionId(randomIdValue), RegionName(randomName))

  def randomCompetition: Competition =
    Competition(CompetitionId(randomIdValue), CompetitionName(randomName), randomRegion)

  def randomCompetitor: Competitor =
    Competitor(CompetitorId(randomIdValue), CompetitorName(randomName), CompetitorSide.Home)

  def randomSeason: Season =
    Season(SeasonId(randomIdValue), SeasonName(randomName))

  def randomSport: Sport =
    Sport(randomSportId, SportName(randomName))

  def randomFixtureIngest: FixtureIngest =
    FixtureIngest(
      randomHeader,
      Fixture(
        randomFixtureId,
        FixtureName(randomName),
        clock.currentOffsetDateTime(),
        FixtureType.Match,
        FixtureStatus.Scheduled,
        randomCompetition,
        Seq(randomCompetitor, randomCompetitor),
        randomSeason,
        randomSport))

  def randomMarketSetIngest: MarketSetIngest =
    MarketSetIngest(
      randomHeader,
      MarketSet(
        randomFixtureId,
        Seq(
          Market(
            randomMarketId,
            clock.currentOffsetDateTime(),
            inPlay = true,
            MarketType(MarketTypeId(randomIdValue), MarketTypeName("Team to Score a Quadra Kill")),
            MarketName(randomName),
            Seq(
              Selection(
                randomSelectionId,
                CompetitorId(randomIdValue),
                DecimalOdds(17.0),
                Denominator(1),
                Numerator(16),
                Some(Outcome(randomIdValue, randomName)),
                None,
                SelectionStatus.Trading),
              Selection(
                randomSelectionId,
                CompetitorId(randomIdValue),
                DecimalOdds(1.0303),
                Denominator(33),
                Numerator(1),
                Some(Outcome(randomIdValue, randomName)),
                None,
                SelectionStatus.Trading)),
            None,
            TradingStatus.Suspended))))

  def randomResultSetIngest: ResultSetIngest =
    ResultSetIngest(
      randomHeader,
      ResultSet(
        randomFixtureId,
        Seq(
          MarketResult(
            randomMarketId,
            Seq(Result(randomSelectionId, ResultStatus.Loser), Result(randomSelectionId, ResultStatus.Winner))),
          MarketResult(
            randomMarketId,
            Seq(Result(randomSelectionId, ResultStatus.Loser), Result(randomSelectionId, ResultStatus.Winner))))))

  def randomMultiSportIngest: MultiSportIngest =
    MultiSportIngest(
      randomHeader,
      MultiSportMatchStateV2(
        Some("0"),
        randomFixtureId,
        bookmakerId = faker.random().nextInt(10000),
        homeScore = Some("0"),
        isReliable = true,
        PhaseType.InPlay,
        matchStatus = Some("1st Half  < 40mins"),
        clock.currentOffsetDateTime(),
        sportId = randomSportId))

  def randomFeed = Feed(Random.nextBoolean(), Random.shuffle(List("MatchState", "TradingState")).head)

  def randomCoverage =
    Coverage(randomFixtureId, Random.nextBoolean(), Seq(randomFeed, randomFeed))

  def randomCoverageIngest: CoverageIngest = CoverageIngest(randomHeader, randomCoverage)
}
