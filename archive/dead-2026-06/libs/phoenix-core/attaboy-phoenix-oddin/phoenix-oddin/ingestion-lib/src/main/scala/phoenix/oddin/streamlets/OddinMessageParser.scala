package phoenix.oddin.streamlets

import akka.NotUsed
import akka.stream.ClosedShape
import akka.stream.scaladsl.{ Flow, GraphDSL, Partition, RunnableGraph }
import cloudflow.akkastream.AkkaStreamlet
import cloudflow.akkastream.scaladsl.RunnableGraphStreamletLogic
import cloudflow.streamlets.StreamletShape
import cloudflow.streamlets.avro.{ AvroInlet, AvroOutlet }
import phoenix.oddin.data.{ FixtureChange, OddinMessage, OddsChange, UnparsableOddinMessage }

class OddinMessageParser extends AkkaStreamlet {
  import phoenix.oddin.OddinXmlParsing._

  val in = AvroInlet[OddinMessage]("in")
  val oddsChangesOut = AvroOutlet[OddsChange]("odds-changes")
  val fixtureChangesOut = AvroOutlet[FixtureChange]("fixture-changes")
  val unparsableMessagesOut = AvroOutlet[UnparsableOddinMessage]("unparsable-messages")

  override def shape() =
    StreamletShape.withInlets(in).withOutlets(oddsChangesOut, fixtureChangesOut, unparsableMessagesOut)

  override def createLogic() =
    new RunnableGraphStreamletLogic() {

      val oddinMessages = plainSource(in)

      override def runnableGraph(): RunnableGraph[_] = {
        RunnableGraph.fromGraph(GraphDSL.create() { implicit builder: GraphDSL.Builder[NotUsed] =>
          import GraphDSL.Implicits._
          import OddinIngestionStreamlet._

          val partition = builder.add(
            Partition[OddinMessage](
              3,
              elem =>
                if (elem.xml.startsWith(OddsChangeElem)) 0
                else if (elem.xml.startsWith(FixturesChangeElem)) 1
                else 2))

          val oddsChangeSink = Flow[OddinMessage]
            .map { elem => parseOddsChange(elem.correlationId, elem.xml) }
            .to(plainSink(oddsChangesOut))

          val fixtureChangeSink = Flow[OddinMessage]
            .map { elem => parseFixtureChange(elem.correlationId, elem.xml) }
            .to(plainSink(fixtureChangesOut))

          val unparsableSink =
            Flow[OddinMessage].map { elem => new UnparsableOddinMessage(elem.xml) }.to(plainSink(unparsableMessagesOut))

          oddinMessages ~> partition ~> oddsChangeSink
          partition ~> fixtureChangeSink
          partition ~> unparsableSink

          ClosedShape
        })
      }
    }
}

object OddinIngestionStreamlet {
  val OddsChangeElem = "<odds_change"
  val FixturesChangeElem = "<fixture_change"
}
