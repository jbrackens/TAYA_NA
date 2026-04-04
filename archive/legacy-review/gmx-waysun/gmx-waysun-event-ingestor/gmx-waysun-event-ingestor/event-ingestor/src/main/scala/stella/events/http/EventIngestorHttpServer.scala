package stella.events.http

import scala.concurrent.Future
import scala.concurrent.duration._
import scala.io.StdIn

import akka.http.scaladsl.Http
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import stella.events.config.EventPublicationMode.StoreInRedisAndStartKafkaPublicationService
import stella.events.http.routes.EventIngestorRoutesModule

object EventIngestorHttpServer {
  private val serverName = "Event Ingestor Server"
  private val log: Logger = LoggerFactory.getLogger(getClass)

  private val eventIngestorRoutesModule = new EventIngestorRoutesModule {}
  import eventIngestorRoutesModule._

  def main(args: Array[String]): Unit = {
    log.info(s"$serverName Startup...")

    val serverBinding = HttpServer.start(serverName, config.httpServer, routes.all)
    if (config.eventPublicationMode == StoreInRedisAndStartKafkaPublicationService) eventPublisher.startPublisherLoop()
    if (config.enableInteractiveShutdown) {
      log.info("Type 'exit' to stop the application")
      var input = StdIn.readLine()
      while (input != "exit") {
        input = StdIn.readLine()
      }
      stopGracefully(serverBinding)
    }
  }

  private def stopGracefully(serverBinding: Future[Http.ServerBinding]): Unit = {
    log.info(s"Stopping $serverName...")
    for {
      binding <- serverBinding
      _ <- binding.terminate(hardDeadline = 3.seconds)
    } {
      persistenceService.stopGracefully()
      if (config.eventPublicationMode == StoreInRedisAndStartKafkaPublicationService) eventPublisher.stopGracefully()
      kafkaPublisher.stopGracefully()
      system.terminate()
    }
  }
}
