package phoenix.oddin.streamlets

import akka.stream.scaladsl.RunnableGraph
import akka.stream.scaladsl.Sink
import cloudflow.akkastream.AkkaStreamlet
import cloudflow.akkastream.AkkaStreamletLogic
import cloudflow.akkastream.scaladsl.RunnableGraphStreamletLogic
import cloudflow.streamlets.StreamletShape
import cloudflow.streamlets.avro.AvroInlet

import phoenix.dataapi.internal.oddin.MarketChangedEvent

class MarketChangedEventConsoleOutput extends AkkaStreamlet {

  val in = AvroInlet[MarketChangedEvent]("in")

  override def shape(): StreamletShape = StreamletShape.withInlets(in)

  override def createLogic(): AkkaStreamletLogic =
    new RunnableGraphStreamletLogic() {
      def runnableGraph(): RunnableGraph[_] =
        plainSource(in).to(Sink.foreach { elem => log.info(s"${classOf[MarketChangedEvent].getSimpleName} -> $elem") })
    }
}
