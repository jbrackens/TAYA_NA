package phoenix.oddin.streamlets

import cloudflow.akkastream.AkkaStreamlet
import cloudflow.akkastream.scaladsl.{ FlowWithCommittableContext, RunnableGraphStreamletLogic }
import cloudflow.streamlets.StreamletShape
import cloudflow.streamlets.avro.AvroInlet
import phoenix.oddin.data.MarketOddsChange

class OddsChangeConsoleOutput extends AkkaStreamlet {

  val inlet = AvroInlet[MarketOddsChange]("in")

  override def shape() = StreamletShape.withInlets(inlet)

  override def createLogic =
    new RunnableGraphStreamletLogic() {
      def runnableGraph =
        sourceWithCommittableContext(inlet).via(flow).to(committableSink)

      val flow = FlowWithCommittableContext[MarketOddsChange].map { data =>
        log.info(s"$data")
        data
      }
    }
}
