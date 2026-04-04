package phoenix.oddin.streamlets

import cloudflow.akkastream.AkkaStreamlet
import cloudflow.akkastream.scaladsl.{ FlowWithCommittableContext, RunnableGraphStreamletLogic }
import cloudflow.streamlets.StreamletShape
import cloudflow.streamlets.avro.AvroInlet
import phoenix.oddin.data.UnparsableOddinMessage

class UnparsableMessageHandler extends AkkaStreamlet {

  val inlet = AvroInlet[UnparsableOddinMessage]("in")

  override def shape() = StreamletShape.withInlets(inlet)

  override def createLogic =
    new RunnableGraphStreamletLogic() {
      def runnableGraph =
        sourceWithCommittableContext(inlet).via(flow).to(committableSink)

      val flow = FlowWithCommittableContext[UnparsableOddinMessage].map { data =>
        log.error(data.xml)
        data
      }
    }
}
