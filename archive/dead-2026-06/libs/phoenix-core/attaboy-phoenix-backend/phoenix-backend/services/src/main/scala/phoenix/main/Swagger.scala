package phoenix.main

import java.io.PrintWriter

import scala.annotation.nowarn
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt

import akka.actor.Scheduler
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.ActorContext
import akka.http.scaladsl.Http
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.HttpResponse
import akka.http.scaladsl.model.StatusCodes
import akka.pattern.retry
import akka.util.ByteString
import com.typesafe.config.ConfigFactory

import phoenix.cluster.NodeRole.BetsRole
import phoenix.cluster.NodeRole.MarketsRole
import phoenix.cluster.NodeRole.PuntersRole
import phoenix.cluster.NodeRole.WalletsRole
import phoenix.core.UnitUtils.UnitCastOps

/**
 * Prints out the Swagger YAML to the file pointed by the first argument
 */
object Swagger extends LocalApplication with Main {
  private val outputSwaggerYamlPathKey = "phoenix.output-swagger-yaml-path"

  override def runApplication(args: Array[String]): Unit = {
    require(args.length == 1, "Usage: <output-file>")

    val config = ConfigFactory.parseString(s"""
      $outputSwaggerYamlPathKey=${args(0)}
      """)

    super.startup(List(PuntersRole, WalletsRole, MarketsRole, BetsRole), 2552, config).toUnit()
  }

  override def afterApplicationStart(context: ActorContext[_]): Unit = {
    super.afterApplicationStart(context)
    val config = context.system.settings.config
    if (config.hasPath(outputSwaggerYamlPathKey)) {
      val outputPath = config.getString(outputSwaggerYamlPathKey)
      dumpSwaggerYaml(outputPath)(context.system)
    }
  }

  private def dumpSwaggerYaml(outputFilePath: String)(implicit system: ActorSystem[_]): Unit = {
    implicit val ec: ExecutionContext = system.executionContext
    implicit val scheduler: Scheduler = system.classicSystem.scheduler

    retry(() => getHttpResult("http://localhost:12552/docs/docs.yaml"), attempts = 5, delay = 500.milliseconds)
      .map { yaml =>
        new PrintWriter(outputFilePath) {
          try {
            write(yaml)
          } finally {
            close()
          }
        }
      }
      .toUnit()
  }

  // For the sake of binary compat, HttpResponse is NOT a case class, which causes exhaustiveness check to fail
  @nowarn("cat=other-match-analysis")
  private def getHttpResult(uri: String)(implicit system: ActorSystem[_]): Future[String] = {
    implicit val ec: ExecutionContext = system.executionContext

    Http().singleRequest(HttpRequest(uri = uri)).flatMap {
      case HttpResponse(StatusCodes.OK, _, entity, _) =>
        entity.dataBytes.runFold(ByteString(""))(_ ++ _).map(_.utf8String)

      case resp @ HttpResponse(statusCode, _, _, _) =>
        log.error("Request failed, response code: " + statusCode)
        resp.discardEntityBytes()
        Future.failed(new RuntimeException("Request failed, response code: " + statusCode))
    }
  }

}
