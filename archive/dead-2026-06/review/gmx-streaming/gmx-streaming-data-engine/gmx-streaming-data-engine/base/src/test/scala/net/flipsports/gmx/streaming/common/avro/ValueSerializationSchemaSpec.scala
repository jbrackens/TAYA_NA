package net.flipsports.gmx.streaming.common.avro

import java.time.Instant

import net.flipsports.gmx.streaming.common.BaseTestSpec
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.formats.avro.AvroDeserializationSchema

class ValueSerializationSchemaSpec  extends BaseTestSpec  {

  val topic = "sample-topic"
  val sampleName = "sample"

  "Message with null key and value" should {


    "be serialized" in {
      // given
      val valueSerializer = new AvroSerializationSchema(false, TypeInformation.of(classOf[Sample]), "", None, None)
      val serializer = new ValueSerializationSchema[Sample](topic, valueSerializer)

      // when
      val serialized = serializer.serialize(new Sample(sampleName), Instant.now.toEpochMilli)

      // then
      val resultValue = AvroDeserializationSchema.forSpecific[Sample](classOf[Sample]).deserialize(serialized.value())
      resultValue.getSample eq (sampleName)
      val resultKey = serialized.key()
      resultKey eq (null)

    }
  }

}
