package gmx.service.responsiblegambling.handlers

import akka.Done
import akka.http.scaladsl.Http
import akka.http.scaladsl.model.{ HttpMethods, HttpRequest }
import akka.http.scaladsl.unmarshalling.Unmarshal
import akka.stream.ClosedShape
import akka.stream.scaladsl.{ Flow, GraphDSL, Merge, RunnableGraph, Sink }
import cloudflow.akkastream.scaladsl.RunnableGraphStreamletLogic
import cloudflow.akkastream.{ AkkaStreamlet, AkkaStreamletLogic }
import cloudflow.streamlets.avro.AvroInlet
import cloudflow.streamlets.{ StreamletShape, StringConfigParameter }
import gmx.dataapi.internal.responsiblegambling.{
  DepositLimitIncreaseFrequencyAlert,
  PlaySessionDurationAlert,
  SportsBetAverageLiabilityAlert,
  TimeoutFrequencyAlert
}

import scala.concurrent.Future

/**
 * Receives all Responsible Gambling alerts and sends them to TruNarrative.
 */
class TruNarrativeAlertHandler extends AkkaStreamlet {

  val depositLimitIncreaseAlertsIn = AvroInlet[DepositLimitIncreaseFrequencyAlert]("deposit-limit-increase-alerts")
  val timeoutSetAlertsIn           = AvroInlet[TimeoutFrequencyAlert]("timeout-frequency-alerts")
  val playSessionDurationAlertsIn  = AvroInlet[PlaySessionDurationAlert]("play-session-alerts")
  val sportsBetLiabilityAlertsIn   = AvroInlet[SportsBetAverageLiabilityAlert]("in4")

  val shape = StreamletShape.withInlets(depositLimitIncreaseAlertsIn,
                                        timeoutSetAlertsIn,
                                        playSessionDurationAlertsIn,
                                        sportsBetLiabilityAlertsIn
  )

  val TruNarrativeUrl = StringConfigParameter(
    "url",
    "The endpoint to send alert data TruNarrative",
    None
  )

  val TruNarrativeId = StringConfigParameter(
    "account-id",
    "The account id for TruNarrative",
    None
  )

  override def configParameters = Vector(TruNarrativeUrl, TruNarrativeId)

  override def createLogic(): AkkaStreamletLogic =
    new RunnableGraphStreamletLogic() {

      override def runnableGraph(): RunnableGraph[_] = {
        val url  = s"${TruNarrativeUrl.value}/${TruNarrativeId.value}}"
        val http = Http(context.system)

        RunnableGraph.fromGraph(GraphDSL.create() { implicit b =>
          import GraphDSL.Implicits._

          // Convert the alerts into Entities to be sent over the wire
          val depositLimitIncreaseAlerts = plainSource(depositLimitIncreaseAlertsIn).map(_ => "")
          val timeoutSetAlerts           = plainSource(timeoutSetAlertsIn).map(_ => "")
          val playSessionDurationAlerts  = plainSource(playSessionDurationAlertsIn).map(_ => "")
          val sportsBetLiabilityAlerts   = plainSource(sportsBetLiabilityAlertsIn).map(_ => "")

          // Merge the streams of Entities
          val merge = b.add(Merge[String](4))

          // Make the HTTP call
          val httpCall = Flow[String].mapAsync(1) { body =>
            val request = HttpRequest(method = HttpMethods.POST, uri = url, entity = body)
            http
              .singleRequest(request)
              .flatMap { response =>
                Unmarshal(response.entity).to[String].map { content =>
                  content
                }
              }
          }

          // Handle the responses
          val sink: Sink[String, Future[Done]] = Sink.ignore

          // Wire the graph together
          depositLimitIncreaseAlerts ~> merge ~> httpCall ~> sink
          timeoutSetAlerts ~> merge
          playSessionDurationAlerts ~> merge
          sportsBetLiabilityAlerts ~> merge

          ClosedShape
        })
      }
    }
}

case class Alert(json: String)
