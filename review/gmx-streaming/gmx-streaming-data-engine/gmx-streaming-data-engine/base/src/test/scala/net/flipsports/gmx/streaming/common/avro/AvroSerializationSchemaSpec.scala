package net.flipsports.gmx.streaming.common.avro

import net.flipsports.gmx.streaming.common.BaseTestSpec
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.formats.avro.AvroDeserializationSchema


class AvroSerializationSchemaSpec extends BaseTestSpec {

  "Message" should {

    "be serialized" in {
      // given
      val serializer = new AvroSerializationSchema[Sample](false, TypeInformation.of(classOf[Sample]), "", None, None)
      val sampleName = "sample 1234"

      // when
      val serialized = serializer.serialize(new Sample(sampleName))

      // then
      val result = AvroDeserializationSchema.forSpecific[Sample](classOf[Sample]).deserialize(serialized)
      result.getSample eq (sampleName)
    }
  }


}