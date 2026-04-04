package phoenix.oddin.streamlets

import akka.stream.scaladsl.Sink
import cloudflow.akkastream.AkkaStreamlet
import cloudflow.akkastream.AkkaStreamletLogic
import cloudflow.akkastream.scaladsl.RunnableGraphStreamletLogic
import cloudflow.streamlets.StreamletShape
import cloudflow.streamlets.avro.AvroInlet

import phoenix.dataapi.internal.oddin.OddinMessage

class OddinMessageConsoleOutput extends AkkaStreamlet {

  val in = AvroInlet[OddinMessage]("in")

  override def shape() = StreamletShape(in)

  override protected def createLogic(): AkkaStreamletLogic =
    new RunnableGraphStreamletLogic() {
      override def runnableGraph() =
        plainSource(in).to(Sink.foreach { elem => log.info(s"${classOf[OddinMessage].getSimpleName} -> $elem") })
    }
}
