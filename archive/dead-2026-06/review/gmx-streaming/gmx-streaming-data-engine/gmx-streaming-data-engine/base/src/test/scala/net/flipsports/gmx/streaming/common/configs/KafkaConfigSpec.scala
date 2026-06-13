package net.flipsports.gmx.streaming.common.configs

import com.typesafe.config._
import net.flipsports.gmx.streaming.common.BaseTestSpec
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.scalatest.mockito.MockitoSugar
import org.mockito.Mockito._

class KafkaConfigSpec extends BaseTestSpec {

  val bootstrap = "localhost:9092"

  val offset = "earliest"

  val host = "localhost"

  val port = 9093

  "Configs" should {

    "be extracted from config" in {
      // given
      val config = MockitoSugar.mock[Config]

      when(config.getString("bootstrap")).thenReturn(bootstrap)
      when(config.getString("offset-config")).thenReturn(offset)

      // when
      val applicationConfig = KafkaProperties.apply(config)

      // then
      applicationConfig.properties.getProperty(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG) should equal(offset)
      applicationConfig.properties.getProperty(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG) should equal(bootstrap)
    }
 }

}
