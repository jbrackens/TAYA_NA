package net.flipsports.gmx.streaming.common.avro

import java.time.Instant

import net.flipsports.gmx.streaming.common.BaseTestSpec
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.common.serialization.TypeInformationSerializationSchema
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.formats.avro.AvroDeserializationSchema

class KeyedSerializationSchemaSpec extends BaseTestSpec  {

  val topic = "sample"
  val sampleName = "sample 1234"

  "Message with key and value" should {

    "be serialized" in {
      // given
      val serializer = prepareObjectUnderTest

      // when
      val serialized = serializer.serialize(new Tuple2(sampleName, new Sample(sampleName)), Instant.now.toEpochMilli)

      // then
      val resultValue = AvroDeserializationSchema.forSpecific[Sample](classOf[Sample]).deserialize(serialized.value())
      resultValue.getSample eq (sampleName)
      val resultKey = serialized.key().toString
      resultKey eq (sampleName)
    }
  }


  "Message with null key and value" should {


    "be serialized" in {
      // given
      val serializer = prepareObjectUnderTest

      // when
      val serialized = serializer.serialize(new Tuple2(null, new Sample(sampleName)), Instant.now.toEpochMilli)

      // then
      val resultValue = AvroDeserializationSchema.forSpecific[Sample](classOf[Sample]).deserialize(serialized.value())
      resultValue.getSample eq (sampleName)
      val resultKey = serialized.key()
      resultKey eq (null)

    }
  }



  def prepareObjectUnderTest() = {
    val valueSerializer = new AvroSerializationSchema(false, TypeInformation.of(classOf[Sample]),"", None, None)
    val keySerializer = new TypeInformationSerializationSchema(TypeInformation.of(classOf[String]), new ExecutionConfig)
    new KeyedSerializationSchema[String, Sample](topic, keySerializer, valueSerializer)
  }
}
