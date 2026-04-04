package net.flipsports.gmx.streaming

import java.net.ServerSocket
import java.util.Properties

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.configs.KafkaConfig
import net.flipsports.gmx.streaming.sbtech.configs.{ConfigurationLoader, SbTechConfig}
import net.manub.embeddedkafka.{EmbeddedK, EmbeddedKafka, EmbeddedKafkaConfig}
import org.apache.flink.runtime.testutils.MiniClusterResourceConfiguration
import org.apache.flink.test.util.MiniClusterWithClientResource
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.scalatest.concurrent.Eventually
import org.scalatest.{Matchers, OptionValues, WordSpec}

import scala.annotation.tailrec
import scala.concurrent.Future
import scala.util.Try

class BaseTestSpec extends WordSpec with OptionValues with Matchers with LazyLogging with Eventually {

  implicit def executionContext = scala.concurrent.ExecutionContext.Implicits.global


  def withFlink[T](test: MiniClusterWithClientResource => T) {
    val configuration = new MiniClusterResourceConfiguration.Builder()
      .setNumberTaskManagers(1)
      .setNumberSlotsPerTaskManager(2)
      .build

    val miniClusterResource = new MiniClusterWithClientResource(configuration)
    try {
      miniClusterResource.before()
      test(miniClusterResource)
    } finally {
      miniClusterResource.after()
    }
  }

  def runAsyncJob[T, R](input:  => R): Thread = {
    var thread: Option[Thread] = None

    try {
      thread = Some(new Thread() {
        override def run(): Unit = {
          input
        }
      })
      thread.get.start()
    } catch {
      case t:Throwable =>
        Try(thread.getOrElse(new Thread).interrupt())
        throw t
    }
    thread.get
  }

  def run[T] (input: => T) =
    Future {
      input
    }

  def withKafkaAndConfig[T](test: (SbTechConfig, EmbeddedKafkaConfig) => T): Unit = {
    withKafka { embeddedKafkaConfig =>
      val config = ConfigurationLoader.apply.copy(KafkaConfig("localhost", embeddedKafkaConfig.kafkaPort, "earliest"), checkpoints = "/tmp/flink/checkpoints/")
      test(config, embeddedKafkaConfig)
    }
  }

  def withKafka[T](test: EmbeddedKafkaConfig => T): Unit = {
    val kafkaPort = obtainNonTakenPort
    val zookeeperPort = obtainNonTakenPort
    var kafka: Option[EmbeddedK] = None
    val kafkaConfig = EmbeddedKafkaConfig(kafkaPort, zookeeperPort)
    try {
      kafka = Some(EmbeddedKafka.start()(kafkaConfig))
      test(kafkaConfig)
    } finally {
      kafka match {
        case Some(server) => server.stop(true)
        case None => logger.info("Nothing to do..")
      }
    }

  }

  def obtainNonTakenPort: Int = tryUntil(5)

  @tailrec
  private def tryUntil(times: Int): Int = {
    if (times < 0) {
      throw new RuntimeException("free port not found")
    }
    try {
      val serverSocket = new ServerSocket(0)
      serverSocket.close()
      serverSocket.getLocalPort
    } catch {
      case t: Throwable => tryUntil(times - 1)
    }
  }

}
