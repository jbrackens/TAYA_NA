package net.flipsports.gmx.streaming.common.kafka

import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import org.scalatest._
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.KafkaIO
import net.flipsports.gmx.streaming.tests.kafka.SchemaRegistryOperations
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.apache.kafka.common.serialization.StringDeserializer


class ConfluentPlatformContainersSpec
  extends FlatSpec
    with ConfluentPlatformContainers
    with GivenWhenThen
    with SchemaRegistryOperations
    with Matchers{

  "data-engine" should "spin up a Kafka Docker container" in {

    Given("A Kafka test container")
    withKafka(KafkaProperties().withGroupId("TestGroup")) {
      (KafkaProperties,_) =>
        val topicName:String = "test-topic"

        And("produces a message to the Kafka Broker container")
        type CustomData = (String, String)
        val data:Seq[CustomData] = Seq(("DummyPayloadKey","DummyPayloadValue"))
        KafkaIO.apply(KafkaProperties, topicName).produceBinary(
          data,
          SerDes.toStringSerDes,
          SerDes.toStringSerDes
        )

        And("the message is consumed from the same Kafka Broker container")
        val deserializer = new StringDeserializer
        val result:Seq[(String,String)] = KafkaIO.apply(KafkaProperties, topicName).consumeBinary[String, String](1)(deserializer, deserializer)

        Then("the produced and consumed messages should be consistent")
        result.foreach(record => {
          record._1 should be ("DummyPayloadKey")
          record._2 should be ("DummyPayloadValue")
        })
    }
  }
}