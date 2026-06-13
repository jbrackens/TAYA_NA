package phoenix.betgenius.streamlets

import akka.NotUsed
import akka.kafka.ConsumerMessage.Committable
import akka.stream.ClosedShape
import akka.stream.contrib.PartitionWith
import akka.stream.scaladsl._
import cats.syntax.either._
import cloudflow.akkastream.AkkaStreamlet
import cloudflow.akkastream.AkkaStreamletLogic
import cloudflow.akkastream.scaladsl.RunnableGraphStreamletLogic
import cloudflow.streamlets.StreamletShape
import cloudflow.streamlets.avro.AvroOutlet
import cloudflow.streamlets.bytearray.ExternalInlet
import io.circe._
import io.circe.parser._

import phoenix.betgenius.domain.FixtureIngest
import phoenix.betgenius.domain.Ingest
import phoenix.dataapi.internal.oddin._

class BetgeniusIngestConverter extends AkkaStreamlet {

  val inlet: ExternalInlet = ExternalInlet("in")

  val fixtureEventsOut = AvroOutlet[FixtureChangedEvent]("fixture-events", _.fixtureId)

  override val shape: StreamletShape = StreamletShape(inlet).withOutlets(fixtureEventsOut)

  type WithContext[T] = (T, Committable)

  override def createLogic(): AkkaStreamletLogic =
    new RunnableGraphStreamletLogic() {
      override def runnableGraph(): RunnableGraph[_] =
        RunnableGraph.fromGraph(GraphDSL.create() { implicit builder: GraphDSL.Builder[NotUsed] =>
          import GraphDSL.Implicits._

          val betgeniusPayload = sourceWithCommittableContext(inlet)

          val parsePayload = builder.add(
            PartitionWith[WithContext[Array[Byte]], WithContext[Error], WithContext[Ingest]](
              {
                case (bytes, commitable) => decode[Ingest](new String(bytes)).bimap(_ -> commitable, _ -> commitable)
              },
              eagerCancel = true))

          val fixtures =
            FlowWithContext[Ingest, Committable].collect {
              case fixture: FixtureIngest => fixture.toFixtureChangedEvent
            }

          val logMalformedOrUnknownIngest =
            Sink.foreach[WithContext[Error]] {
              case (error, _) => log.info(s"Payload could not be parsed: ${error.getMessage}")
            }

          val fixtureChangeEvents = committableSink(fixtureEventsOut)

          val logOtherIngest =
            Sink.foreach[WithContext[Ingest]] { case (ingest, _) => log.info(s"Betgenius data: $ingest") }

          val ingestPartitioner: WithContext[Ingest] => Int = {
            case (_: FixtureIngest, _) => 0
            case _                     => 1
          }

          val partition = builder.add(Partition[WithContext[Ingest]](2, ingestPartitioner))

          // @formatter:off
          betgeniusPayload ~> parsePayload.in

          parsePayload.out0 ~> logMalformedOrUnknownIngest
          parsePayload.out1 ~> partition

          partition ~> fixtures ~> fixtureChangeEvents
          partition ~> logOtherIngest
          // @formatter:on
          ClosedShape
        })
    }
}
