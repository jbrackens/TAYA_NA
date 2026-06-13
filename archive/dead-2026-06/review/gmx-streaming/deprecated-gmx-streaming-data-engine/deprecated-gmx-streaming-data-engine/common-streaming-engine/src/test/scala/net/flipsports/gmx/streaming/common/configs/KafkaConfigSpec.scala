package net.flipsports.gmx.streaming.common.configs

import com.typesafe.config._
import net.flipsports.gmx.streaming.common.BaseTestSpec
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
      val applicationConfig = KafkaConfig.apply(config)

      // then
      applicationConfig.offsetConfig should equal(offset)
      applicationConfig.bootstrap should equal(bootstrap)
    }


    "be extracted from parameters" in {

      // given

      // when
      val applicationConfig = KafkaConfig.apply(host, port, offset, System.getProperties)


      // then
      applicationConfig.bootstrap should equal(s"$host:$port")
      applicationConfig.offsetConfig should equal(offset)

    }



  }

}
