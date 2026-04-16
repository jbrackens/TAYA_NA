package phoenix.betgenius.infrastructure

import scala.reflect.ClassTag

import akka.NotUsed
import akka.stream._
import akka.stream.scaladsl._

import phoenix.betgenius.domain._

case class BetgeniusMessagePartitionerShape(
    ingestIn: Inlet[Ingest],
    coverageIngestOut: Outlet[CoverageIngest],
    fixtureIngestOut: Outlet[FixtureIngest],
    marketSetIngestOut: Outlet[MarketSetIngest],
    resultSetIngestOut: Outlet[ResultSetIngest],
    multiSportIngestOut: Outlet[MultiSportIngest])
    extends Shape {
  override def inlets: Seq[Inlet[_]] = ingestIn :: Nil

  override def outlets: Seq[Outlet[_]] =
    coverageIngestOut :: fixtureIngestOut :: marketSetIngestOut :: resultSetIngestOut :: multiSportIngestOut :: Nil

  override def deepCopy(): Shape =
    BetgeniusMessagePartitionerShape(
      ingestIn.carbonCopy(),
      coverageIngestOut.carbonCopy(),
      fixtureIngestOut.carbonCopy(),
      marketSetIngestOut.carbonCopy(),
      resultSetIngestOut.carbonCopy(),
      multiSportIngestOut.carbonCopy())
}

object BetgeniusMessagePartitioner {

  def apply(): Graph[BetgeniusMessagePartitionerShape, NotUsed] = {
    GraphDSL.create() { implicit builder: GraphDSL.Builder[NotUsed] =>
      import GraphDSL.Implicits._

      val ingestPartitioner: Ingest => Int = {
        case _: CoverageIngest   => 0
        case _: FixtureIngest    => 1
        case _: MarketSetIngest  => 2
        case _: ResultSetIngest  => 3
        case _: MultiSportIngest => 4
      }

      val partitionIngest = builder.add(Partition[Ingest](5, ingestPartitioner))

      def collectIngest[T <: Ingest: ClassTag] =
        Flow[Ingest].collect {
          case value: T => value
        }

      val coverageIngestFlow = builder.add(collectIngest[CoverageIngest])
      val fixtureIngestFlow = builder.add(collectIngest[FixtureIngest])
      val marketSetIngestFlow = builder.add(collectIngest[MarketSetIngest])
      val resultSetIngestFlow = builder.add(collectIngest[ResultSetIngest])
      val multiSportIngestFlow = builder.add(collectIngest[MultiSportIngest])

      // @formatter:off
      partitionIngest.out(0) ~> coverageIngestFlow
      partitionIngest.out(1) ~> fixtureIngestFlow
      partitionIngest.out(2) ~> marketSetIngestFlow
      partitionIngest.out(3) ~> resultSetIngestFlow
      partitionIngest.out(4) ~> multiSportIngestFlow
      // @formatter:on

      BetgeniusMessagePartitionerShape(
        ingestIn = partitionIngest.in,
        coverageIngestOut = coverageIngestFlow.out,
        fixtureIngestOut = fixtureIngestFlow.out,
        marketSetIngestOut = marketSetIngestFlow.out,
        resultSetIngestOut = resultSetIngestFlow.out,
        multiSportIngestOut = multiSportIngestFlow.out)
    }
  }

}
