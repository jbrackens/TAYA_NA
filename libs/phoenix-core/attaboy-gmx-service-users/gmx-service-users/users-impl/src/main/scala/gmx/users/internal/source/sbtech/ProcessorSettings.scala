package gmx.users.internal.source.sbtech

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{ CasinoBet, CasinoBetCustomerId }
import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.{ CustomerDetail, CustomerDetailCustomerId }
import SBTech.Microservices.DataStreaming.DTO.Login.v1.{ Login, LoginCustomerId }
import akka.actor.ActorSystem
import akka.kafka.ConsumerSettings
import akka.util.Timeout
import io.confluent.kafka.serializers.{ AbstractKafkaAvroSerDeConfig, KafkaAvroDeserializer, KafkaAvroDeserializerConfig }
import org.apache.avro.specific.SpecificRecord
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.apache.kafka.common.serialization.Deserializer

import scala.concurrent.duration._
import scala.jdk.CollectionConverters._

trait ProcessorSettings[KEY <: SpecificRecord, VALUE <: SpecificRecord] {
  def brandId: String
  def consumerSettings: ConsumerSettings[KEY, VALUE]
  def topics: List[String]
  def askTimeout: Timeout
}

case object ProcessorSettings {

  val ConfigBase = "user-service"

  val LoginProcessor  = s"$ConfigBase.login-processor"
  val CustomerDetails = s"$ConfigBase.customer-detail-processor"
  val CasinoBets      = s"$ConfigBase.casino-bet-processor"

  val BootstrapServers  = "bootstrap-servers"
  val SchemaRegistryUrl = "schema-registry-url"
  val Topics            = "topics"
  val Group             = "group"
  val BrandId           = "brand-id"
  val AskTimeout        = "ask-timeout"

  def apply[KEY <: SpecificRecord, VALUE <: SpecificRecord](
      configLocation: String,
      system: ActorSystem
    ): ProcessorSettings[KEY, VALUE] = {
    val config = system.settings.config.getConfig(configLocation)
    new ProcessorSettingsImpl[KEY, VALUE](
      config.getString(BootstrapServers),
      config.getString(SchemaRegistryUrl),
      config.getStringList(Topics).asScala.toList,
      config.getString(Group),
      config.getString(BrandId),
      Timeout.create(config.getDuration(AskTimeout)),
      system: ActorSystem
    )
  }

  def login(system: ActorSystem): ProcessorSettings[LoginCustomerId, Login] =
    apply(LoginProcessor, system)

  def customerDetails(system: ActorSystem): ProcessorSettings[CustomerDetailCustomerId, CustomerDetail] =
    apply(CustomerDetails, system)

  def casinoBets(
      system: ActorSystem
    ): ProcessorSettings[CasinoBetCustomerId, CasinoBet] =
    apply(CasinoBets, system)

}

final class ProcessorSettingsImpl[KEY <: SpecificRecord, VALUE <: SpecificRecord](
    val bootstrapServers: String,
    val schemaRegistryUrl: String,
    val topics: List[String],
    val groupId: String,
    val brandId: String,
    val askTimeout: Timeout,
    val system: ActorSystem)
  extends ProcessorSettings[KEY, VALUE] {

  def consumerSettings: ConsumerSettings[KEY, VALUE] = {

    val kafkaAvroSerDeConfig = Map[String, Any](
      AbstractKafkaAvroSerDeConfig.SCHEMA_REGISTRY_URL_CONFIG -> schemaRegistryUrl,
      KafkaAvroDeserializerConfig.SPECIFIC_AVRO_READER_CONFIG -> true.toString
    )

    val kafkaAvroDeserializer = new KafkaAvroDeserializer()
    kafkaAvroDeserializer.configure(kafkaAvroSerDeConfig.asJava, false)
    val keyDeserializer = kafkaAvroDeserializer.asInstanceOf[Deserializer[KEY]]
    val valueDeserializer =
      kafkaAvroDeserializer.asInstanceOf[Deserializer[VALUE]]

    ConsumerSettings(system, keyDeserializer, valueDeserializer)
      .withBootstrapServers(bootstrapServers)
      .withGroupId(groupId)
      .withProperty(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest")
      .withStopTimeout(0.seconds)
  }

}
