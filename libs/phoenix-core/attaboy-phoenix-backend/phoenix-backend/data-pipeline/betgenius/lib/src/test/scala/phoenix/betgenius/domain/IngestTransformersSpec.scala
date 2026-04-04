package phoenix.betgenius.domain

import java.time.Instant

import io.circe.parser.decode
import io.scalaland.chimney.dsl._
import monocle.syntax.all._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.dataapi.shared._
import phoenix.support.FileSupport

class IngestTransformersSpec extends AnyWordSpec with Matchers with FileSupport {

  "FixtureIngest" should {
    "correctly transform into FixtureUpdate" in {
      val fixtureIngest =
        BetgeniusDataGenerator.randomFixtureIngest.focus(_.fixture.competition.region.id).replace(RegionId(3795069))
      fixtureIngest.transformInto[FixtureChange] shouldEqual FixtureChange(
        Header(fixtureIngest.header.messageGuid.toString, fixtureIngest.header.timeStampUtc.toInstant, "betgenius"),
        fixtureIngest.fixture.id.namespaced,
        fixtureIngest.fixture.name.value,
        fixtureIngest.fixture.status.transformInto[FixtureStatus],
        fixtureIngest.fixture.startTimeUtc.toInstant.toEpochMilli,
        Sport(fixtureIngest.fixture.competition.region.id.asSportId.namespaced, "Starcraft 2", "SC2"),
        Competition(fixtureIngest.fixture.season.id.namespaced, fixtureIngest.fixture.season.name.value),
        fixtureIngest.fixture.competitors.map(c =>
          Competitor(c.id.namespaced, c.name.value, c.homeAway.transformInto[CompetitorSide])))
    }

    "correctly transform into FixtureUpdate from specific event" in {
      val fixtureIngest = decode[Seq[FixtureIngest]](stringFromResource("betgenius", "fixtures.json")).toOption.get(1)
      fixtureIngest.transformInto[FixtureChange] shouldEqual FixtureChange(
        Header("07cc4989-b597-42f9-862e-14071dc80ccb", Instant.parse("2021-10-20T08:11:06.3964438Z"), "betgenius"),
        "f:b:8571625",
        "mousesports v Unicorns Of Love Sexy Edition (Bo5)",
        FixtureStatus.PreGame,
        Instant.parse("2021-10-19T16:00:00Z").toEpochMilli,
        Sport("s:b:3795068", "League of Legends", "LoL"),
        Competition("t:b:117076", "2021 [LoL] Prime League Pro Winter"),
        Seq(
          Competitor("c:b:863929", "mousesports", CompetitorSide.Home),
          Competitor("c:b:1122097", "Unicorns Of Love Sexy Edition", CompetitorSide.Away)))
    }

    "use Unknown sport if it cannot be mapped" in {
      val fixtureIngest =
        BetgeniusDataGenerator.randomFixtureIngest.focus(_.fixture.competition.region.id).replace(RegionId(1))
      val fixtureChange = fixtureIngest.transformInto[FixtureChange]
      fixtureChange.sport.name shouldEqual "Unknown"
      fixtureChange.sport.abbreviation shouldEqual "N/A"
    }
  }

  "MarketSetIngest" should {
    "correctly transform into FixtureResult" in {
      val resultSetIngest = BetgeniusDataGenerator.randomResultSetIngest
      val expectedHeader =
        Header(resultSetIngest.header.messageGuid.toString, resultSetIngest.header.timeStampUtc.toInstant, "betgenius")

      def expectedSelectionResult(result: phoenix.betgenius.domain.Result) =
        SelectionResult(result.selectionId.namespaced, result.resultStatus.transformInto[Result])

      resultSetIngest.transformInto[Seq[FixtureResult]] shouldEqual Seq(
        FixtureResult(
          expectedHeader,
          resultSetIngest.resultSet.results(0).marketId.namespaced,
          resultSetIngest.resultSet.results(0).results.map(expectedSelectionResult(_))),
        FixtureResult(
          expectedHeader,
          resultSetIngest.resultSet.results(1).marketId.namespaced,
          resultSetIngest.resultSet.results(1).results.map(expectedSelectionResult(_))))
    }
  }
}
