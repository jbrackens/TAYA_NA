package phoenix.reports.infrastructure

import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

import scala.concurrent.Future

import akka.NotUsed
import akka.stream.Materializer
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import cats.data.OptionT

import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.reports.domain.FixtureMarketRepository
import phoenix.reports.domain.model.markets.Fixture
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.domain.model.markets.Market
import phoenix.reports.domain.model.markets.MarketSelection
import phoenix.shared.support.CsvReader
import phoenix.support.FutureSupport

final class CsvFixtureMarketRepository(csvReader: CsvReader, resourcePath: String)(implicit mat: Materializer)
    extends FixtureMarketRepository
    with FutureSupport {

  private val CSV_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mmxxx")

  private val marketIdColumn: String = "marketId"
  private val marketNameColumn: String = "marketName"
  private val fixtureIdColumn: String = "fixtureId"
  private val nameColumn: String = "name"
  private val startTimeColumn: String = "startTime"
  private val marketSelectionsColumn: String = "selectionNames"

  private val fixtureMarkets: Map[MarketId, FixtureMarket] = initMap()

  override def upsert(fixture: Fixture): Future[Unit] = ???
  override def upsert(market: Market): Future[Unit] = ???
  override def upsert(selections: Seq[MarketSelection]): Future[Unit] = ???

  override def get(marketId: MarketId): OptionT[Future, FixtureMarket] = {
    OptionT(Future.successful(fixtureMarkets.get(marketId)))
  }

  private def initMap(): Map[MarketId, FixtureMarket] = {
    val csvFixtures: Source[FixtureMarket, NotUsed] =
      csvReader.sourceCsvFile(resourcePath).map(buildFixtureMarket)
    val fixtures = csvFixtures.toMat(Sink.seq[FixtureMarket])(Keep.right).run()
    await(fixtures).map(elem => (elem.market.marketId, elem)).toMap
  }

  def buildFixtureMarket(input: Map[String, String]): FixtureMarket =
    // we control this file, we can fail hard on wrong data
    FixtureMarket(
      Fixture(
        FixtureId.unsafeParse(input(fixtureIdColumn)),
        input(nameColumn),
        OffsetDateTime.parse(input(startTimeColumn), CSV_DATE_FORMATTER)),
      Market(
        MarketId.unsafeParse(input(marketIdColumn)),
        input(marketNameColumn),
        FixtureId.unsafeParse(input(fixtureIdColumn))),
      parseSelections(MarketId.unsafeParse(input(marketIdColumn)), input(marketSelectionsColumn)))

  private def parseSelections(marketId: MarketId, selections: String): Seq[MarketSelection] =
    selections
      .split(" ")
      .collect {
        case line if line.nonEmpty && (line.split(":").size == 2) =>
          val splitedLine = line.split(":")
          val (selectionId, selectionName) = (splitedLine(0), splitedLine(1))
          MarketSelection(selectionId, selectionName, marketId)
      }
      .toSeq
}
