package phoenix.betgenius.infrastructure

import akka.NotUsed
import akka.stream._
import akka.stream.scaladsl._
import org.slf4j.LoggerFactory

import phoenix.betgenius.domain._
import phoenix.core.ScalaObjectUtils._
import phoenix.dataapi.shared.FixtureChange
import phoenix.dataapi.shared.FixtureResult
import phoenix.dataapi.shared.MarketChange
import phoenix.dataapi.shared.MatchStatusUpdate
import phoenix.streams.CommonFlows

case class BetgeniusIngestSourceShape(
    fixtureChangeOut: Outlet[FixtureChange],
    fixtureResultOut: Outlet[FixtureResult],
    matchStatusUpdateOut: Outlet[MatchStatusUpdate],
    marketChangeOut: Outlet[MarketChange])
    extends Shape {

  override def inlets: Seq[Inlet[_]] = Nil

  override def outlets: Seq[Outlet[_]] =
    fixtureChangeOut ::
    fixtureResultOut ::
    matchStatusUpdateOut ::
    marketChangeOut ::
    Nil

  override def deepCopy(): Shape =
    BetgeniusIngestSourceShape(
      fixtureChangeOut.carbonCopy(),
      fixtureResultOut.carbonCopy(),
      matchStatusUpdateOut.carbonCopy(),
      marketChangeOut.carbonCopy())
}

object BetgeniusIngestSource {

  type StreamSource = Graph[BetgeniusIngestSourceShape, NotUsed]

  private val log = LoggerFactory.getLogger(this.objectName)

  def apply()(implicit m: Materializer): (SourceQueueWithComplete[Ingest], StreamSource) = {
    val (queue, source) = Source.queue[Ingest](1000, OverflowStrategy.dropHead).preMaterialize()
    val graph = GraphDSL.create() { implicit builder: GraphDSL.Builder[NotUsed] =>
      import GraphDSL.Implicits._

      val partitioner = builder.add(BetgeniusMessagePartitioner())
      val toFixtureChangeTransformer = builder.add(CommonFlows.transform[FixtureIngest, FixtureChange])
      val toFixtureResultTransformer = builder.add(CommonFlows.transformConcat[ResultSetIngest, FixtureResult])
      val toMatchStatusUpdateTransformer = builder.add(CommonFlows.transform[MultiSportIngest, MatchStatusUpdate])
      val toMarketChangeTransformer = builder.add(CommonFlows.transformConcat[MarketSetIngest, MarketChange])

      def logSink[T](message: String) = Sink.foreach[T](ingest => log.info(s"$message $ingest"))

      // @formatter:off
      source ~> partitioner.ingestIn 
      partitioner.coverageIngestOut   ~> logSink[CoverageIngest]("Coverage ingest received: ")
      partitioner.fixtureIngestOut    ~> toFixtureChangeTransformer 
      partitioner.marketSetIngestOut  ~> toMarketChangeTransformer
      partitioner.resultSetIngestOut  ~> toFixtureResultTransformer 
      partitioner.multiSportIngestOut ~> toMatchStatusUpdateTransformer
      // @formatter:on
      BetgeniusIngestSourceShape(
        fixtureChangeOut = toFixtureChangeTransformer.out,
        fixtureResultOut = toFixtureResultTransformer.out,
        matchStatusUpdateOut = toMatchStatusUpdateTransformer.out,
        marketChangeOut = toMarketChangeTransformer.out)
    }
    (queue, graph)
  }

}
