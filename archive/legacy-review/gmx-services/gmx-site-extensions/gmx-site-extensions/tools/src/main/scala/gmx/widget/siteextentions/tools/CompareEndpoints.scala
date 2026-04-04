package gmx.widget.siteextentions.tools

import scala.concurrent.Await
import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success

import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.Behaviors
import akka.http.scaladsl.Http
import akka.http.scaladsl.model._
import akka.util.ByteString
import com.fasterxml.jackson.databind.ObjectMapper
import com.stephenn.scalatest.jsonassert.JsonMatchers
import org.scalatest.matchers.should.Matchers

object CompareEndpoints extends App with Matchers with JsonMatchers {
  val mapper = new ObjectMapper()

  implicit val system = ActorSystem(Behaviors.empty, "SingleRequest")
  // needed for the future flatMap/onComplete in the end
  implicit val executionContext = system.executionContext

  private val dev = "https://argyll-next-race.dev.argyll.tech/"
  private val prod = "https://argyll-next-race.prod.argyll.tech/"

  private val idPathsForNextHighlight = Map("response[*]" -> "navigation.eventId")
  private val idPathsForSpecials = Map("response[*]" -> "name", "response[*].selections[*]" -> "name")
  private val idPathsForEventSchedule = Map("response.leagues[*]" -> "name", "response.leagues[*].events[*]" -> "id")
  private val idPathsForAntePost = Map("response[*]" -> "name", "response[*].events[*]" -> "id")

  compareEndpoint(
    dev,
    prod,
    "webapi/events/sport_nation/next-highlight?limit=20&showDetails=false&sport=soccer&sport=horse-racing&sport=virtual-sports&soccerLeague=40817&virtualsInterval=10",
    idPathsForNextHighlight)
  compareEndpoint(dev, prod, "webapi/events/sport_nation/specials?sport=horse-racing&limit=8", idPathsForSpecials)
  compareEndpoint(dev, prod, "webapi/events/sport_nation/specials?sport=soccer&eventId=21347738", idPathsForSpecials)
  compareEndpoint(dev, prod, "webapi/events/sport_nation/event-schedule/uk-ireland/2021-08-18", idPathsForEventSchedule)
  compareEndpoint(
    dev,
    prod,
    "webapi/events/sport_nation/event-schedule/international/2021-08-18",
    idPathsForEventSchedule)
  compareEndpoint(
    dev,
    prod,
    "webapi/events/sport_nation/event-schedule/north-america/2021-08-18",
    idPathsForEventSchedule)
  compareEndpoint(dev, prod, "webapi/events/sport_nation/event-schedule/australia/2021-08-18", idPathsForEventSchedule)
  compareEndpoint(dev, prod, "webapi/events/sport_nation/event-schedule/japan/2021-08-18", idPathsForEventSchedule)
  compareEndpoint(dev, prod, "webapi/events/sport_nation/event-schedule/france/2021-08-18", idPathsForEventSchedule)
  compareEndpoint(
    dev,
    prod,
    "webapi/events/sport_nation/event-schedule/south-africa/2021-08-18",
    idPathsForEventSchedule)
  compareEndpoint(dev, prod, "webapi/events/sport_nation/ante-post", idPathsForAntePost)
  system.terminate()
  Await.result(system.whenTerminated, 10.seconds)

  private def compareEndpoint(
      hostA: String,
      hostB: String,
      endpoint: String,
      arrayPathsToObjectIdPaths: Map[String, String]): Unit = {
    val future = for {
      respA <- Http()(system.classicSystem).singleRequest(HttpRequest(uri = hostA + endpoint))
      bodyA <- respA.entity.dataBytes.runFold(ByteString(""))(_ ++ _)
      respB <- Http()(system.classicSystem).singleRequest(HttpRequest(uri = hostB + endpoint))
      bodyB <- respB.entity.dataBytes.runFold(ByteString(""))(_ ++ _)
    } yield {
      val jsonAString = bodyA.utf8String
      val jsonA = mapper.readTree(jsonAString)
      val jsonBString = bodyB.utf8String
      val jsonB = mapper.readTree(jsonBString)

      if (jsonA != jsonB) {
        val comparator = new JsonComparator(arrayPathsToObjectIdPaths)
        val errors = comparator.compareJsonNodes(jsonA, jsonB)
        if (errors.nonEmpty) {
          println(s"""Found ${errors.length} issues when comparing
               |JSON A: $jsonA
               |and
               |JSON B: $jsonB
               |for endpoint $endpoint
               |""".stripMargin)
          errors.foreach(printError)

          // we can keep this 3rd party check just in case
          jsonAString should matchJson(jsonBString)
        }
      }
    }

    future.onComplete {
      case Success(_) => println(s"$endpoint API responses are the same!")
      case Failure(ex) =>
        println(s"$endpoint API responses differ")
        println(ex)
    }
    Await.ready(future, 10.seconds)
  }

  private def printError(error: ValidationError): Unit = println(error.validationErrorMessage)
}
