package net.flipsports.gmx.streaming


import java.net.ServerSocket

import com.dimafeng.testcontainers.{Container, ForAllTestContainer, KafkaContainer}
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.internal.notifications.configs.{AppConfig, ConfigurationLoader}
import org.apache.avro.Schema
import org.apache.avro.io.DecoderFactory
import org.apache.avro.specific.{SpecificDatumReader, SpecificRecord}
import org.apache.flink.runtime.testutils.MiniClusterResourceConfiguration
import org.apache.flink.test.util.MiniClusterWithClientResource
import org.apache.kafka.common.serialization.Deserializer
import org.scalatest.concurrent.Eventually
import org.scalatest.{Matchers, OptionValues, WordSpec}

import scala.annotation.tailrec
import scala.concurrent.Future
import scala.util.Try

trait NonUsedPortFinder {

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

trait BaseTestSpec extends WordSpec with OptionValues with Matchers with LazyLogging with Eventually {

  def retry[T](n: Int)(fn: => T): T = {
    util.Try { fn } match {
      case util.Success(x) => x
      case _ if n > 1 => retry(n - 1)(fn)
      case util.Failure(e) => throw e
    }
  }
}

trait InternalFlinkMiniCluster {

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
}


trait InternalKafkaContainer extends BaseTestSpec with ForAllTestContainer {

  private lazy val kafkaContainer = KafkaContainer()

  def withKafka[T](test: (AppConfig, KafkaProperties) => T): Unit = {
    val kafkaBootstrap = kafkaContainer.bootstrapServers.replace("PLAINTEXT://", "")
    val config = ConfigurationLoader.apply
    val kafkaProperties = config.kafka.withBootstrapServer(kafkaBootstrap)
    val configWithLocalKafka = config.copy(kafka = kafkaProperties)
    test(configWithLocalKafka, kafkaProperties)

  }

  override def container: Container = kafkaContainer


  class KafkaAvroDeserializer[T <: SpecificRecord](schema: Schema)
    extends Deserializer[T] {

    private val reader = new SpecificDatumReader[T](schema)

    override def deserialize(topic: String, data: Array[Byte]): T = {
      val decoder = DecoderFactory.get().binaryDecoder(data, null)
      reader.read(null.asInstanceOf[T], decoder)
    }
  }

}
