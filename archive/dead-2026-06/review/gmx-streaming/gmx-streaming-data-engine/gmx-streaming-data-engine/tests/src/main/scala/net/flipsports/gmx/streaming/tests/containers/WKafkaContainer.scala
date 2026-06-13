package net.flipsports.gmx.streaming.tests.containers

import com.dimafeng.testcontainers.KafkaContainer
import org.testcontainers.containers.Network
import org.testcontainers.utility.Base58
import org.testcontainers.utility.DockerImageName

import scala.collection.JavaConverters._

case class WKafkaContainer(confluentPlatformVersion: String, network: Network) extends Serializable {

  private val dockerImageName: DockerImageName = DockerImageName.parse(s"confluentinc/cp-kafka:$confluentPlatformVersion")
  private val container = KafkaContainer(dockerImageName)

  val kafkaNetworkAlias = s"kafka-${Base58.randomString(6)}"

  overrideNetworkAliases()

  private def overrideNetworkAliases(): Unit = {
    val networkAliases = Seq[String](kafkaNetworkAlias)
    val kafka = container.container
    kafka.setNetworkAliases(networkAliases.asJava)
    kafka.setNetwork(network)
    val kafkaEnv = kafka.getEnv.asScala ++ Seq(s"${ConfluentPlatformContainers.kafkaHostName}=$kafkaNetworkAlias")
    kafka.setEnv(kafkaEnv.asJava)
  }

  def get(): KafkaContainer = container

}
