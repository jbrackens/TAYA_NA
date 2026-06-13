package phoenix.oddin.infrastructure.akkastreams

import scala.collection.immutable

import akka.NotUsed
import akka.stream.Inlet
import akka.stream.Outlet
import akka.stream.Shape
import akka.stream.scaladsl.Broadcast
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.Merge
import akka.stream.scaladsl.Source

import phoenix.oddin.domain.OddinStreamingApi.FixtureChangeMessage
import phoenix.oddin.domain.OddinStreamingApi.OddsChangeMessage
import phoenix.oddin.domain.fixtureChange.FixtureChange

/**
 * An <odd_change /> message has to trigger potentially both a FixtureChange and a MarketChange.
 * In order to do that we need to create a shape that allows one flow to "publish" an event into
 * the other one.
 */
object SportEventStatusFlows {

  case class SportEventStatusShape(
      oddsChangeEventIn: Inlet[OddsChangeMessage],
      fixtureChangeEventIn: Inlet[FixtureChangeMessage],
      oddsChangeEventOut: Outlet[OddsChangeMessage],
      fixtureChangeEventsOut: Outlet[FixtureChangeMessage])
      extends Shape {

    override val inlets: immutable.Seq[Inlet[_]] = oddsChangeEventIn :: fixtureChangeEventIn :: Nil
    override val outlets: immutable.Seq[Outlet[_]] = oddsChangeEventOut :: fixtureChangeEventsOut :: Nil

    override def deepCopy() =
      SportEventStatusShape(
        oddsChangeEventIn.carbonCopy(),
        fixtureChangeEventIn.carbonCopy(),
        oddsChangeEventOut.carbonCopy(),
        fixtureChangeEventsOut.carbonCopy())
  }

  def buildShape() =
    GraphDSL.create() { implicit builder: GraphDSL.Builder[NotUsed] =>
      import GraphDSL.Implicits._

      val split = builder.add(Broadcast[OddsChangeMessage](outputPorts = 2, eagerCancel = true))
      val merge = builder.add(Merge[FixtureChangeMessage](inputPorts = 2))

      val sportEventStatusFlow = builder.add(createSportEventStatusFlow())

      // @formatter:off
      split.out(0) ~> sportEventStatusFlow ~> merge.in(0)
      // @formatter:on

      SportEventStatusShape(split.in, merge.in(1), split.out(1), merge.out)
    }

  private def createSportEventStatusFlow(): Flow[OddsChangeMessage, FixtureChangeMessage, NotUsed] =
    Flow[OddsChangeMessage].flatMapConcat { oddsChange =>
      Source(oddsChange.payload.sportEventStatusChange.toList.map { sportEventStatusChange =>
        oddsChange.copy(payload = FixtureChange(sportEventStatusChange.sportEventId))
      })
    }
}
