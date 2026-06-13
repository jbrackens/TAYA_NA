package phoenix.oddin.streamlets

import java.util.UUID

import akka.stream.OverflowStrategy
import akka.stream.scaladsl.{ Flow, RunnableGraph, Source }
import cloudflow.akkastream.AkkaStreamlet
import cloudflow.akkastream.scaladsl.RunnableGraphStreamletLogic
import cloudflow.streamlets.avro.AvroOutlet
import cloudflow.streamlets.{ BooleanConfigParameter, StreamletContext, StreamletShape, StringConfigParameter }
import com.oddin.oddsfeedsdk.api.entities.sportevent.SportEvent
import com.oddin.oddsfeedsdk.mq.entities.EventMessage
import phoenix.oddin.OddinFeed
import phoenix.oddin.data.OddinMessage

class OddinMessageIngestor extends AkkaStreamlet {
  import OddinMessageIngestor._

  val out = AvroOutlet[OddinMessage]("out")

  override def shape() = StreamletShape(out)

  override def configParameters = ConfigurationParameters

  override def createLogic() =
    new RunnableGraphStreamletLogic() {

      def createCorrelationId(): String =
        UUID.randomUUID().toString

      override def runnableGraph(): RunnableGraph[_] = {
        val (messageQueue, messageSource) =
          Source.queue[EventMessage[SportEvent]](bufferSize = 1000, OverflowStrategy.dropHead).preMaterialize()

        val flow = Flow[EventMessage[SportEvent]].map { event =>
          val str = new String(event.getRawMessage)

          OddinMessage(createCorrelationId(), xml = str)
        }

        OddinFeed(oddinAccessToken, oddinIsProduction, messageQueue).open()

        messageSource.via(flow).to(plainSink(out))
      }
    }
}

object OddinMessageIngestor {

  private object Configuration {

    private object Defaults {
      val OddinIsProduction = false
    }

    val OddinAccessToken = StringConfigParameter("oddin-access-token")
    val OddinIsProduction =
      BooleanConfigParameter("oddin-is-production", defaultValue = Some(Defaults.OddinIsProduction))
  }

  import Configuration._

  val ConfigurationParameters = Vector(OddinAccessToken, OddinIsProduction)

  def oddinAccessToken(implicit context: StreamletContext) = OddinAccessToken.value

  def oddinIsProduction(implicit context: StreamletContext) = OddinIsProduction.value
}
