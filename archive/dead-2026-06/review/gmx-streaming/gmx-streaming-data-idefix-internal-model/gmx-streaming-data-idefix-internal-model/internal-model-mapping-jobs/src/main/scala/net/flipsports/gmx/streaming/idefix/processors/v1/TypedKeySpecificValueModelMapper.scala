package net.flipsports.gmx.streaming.idefix.processors.v1

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, CustomStream, MetaParameters}
import net.flipsports.gmx.streaming.common.kafka.sink.KafkaSink
import net.flipsports.gmx.streaming.common.kafka.source.SbtechKafkaSource
import net.flipsports.gmx.streaming.idefix.configs.IdefixConfig
import net.flipsports.gmx.streaming.idefix.processors.v1.model.Output
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.api.java.typeutils.TupleTypeInfo
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

import scala.reflect.runtime.universe._

class TypedKeySpecificValueModelMapper[K: TypeTag, V <: SpecificRecord, TK <: SpecificRecord, TV <: SpecificRecord]
  (businessParameters: MapperBusinessParameters[K, V, TK, TV], metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: IdefixConfig)
  (implicit sourceTypeInformation: TupleTypeInfo[Tuple2[K, V]], outputTypeInformation: TupleTypeInfo[Tuple2[TK, TV]])
  extends CustomStream(metaParameters, businessMetaParameters)
  with LazyLogging {

  val sourceTopic = businessParameters.sourceTopic.format(businessMetaParameters.brand().sourceBrand.id)

  val targetTopic = businessParameters.targetTopic.format(businessMetaParameters.brand().sourceBrand.name)

  val kafkaProperties: KafkaProperties = configuration.kafka.withGroupId(s"gmx-messaging.internal-model-on-topic-${sourceTopic}-in-brand-${businessMetaParameters.brand().sourceBrand.name}")

  val source = SbtechKafkaSource(sourceTopic, kafkaProperties, configuration.getRegistry).typedKeyAndSpecificValue[K, V](businessParameters.sourceKeyClass, businessParameters.sourceValueClass)

  val sink = KafkaSink(targetTopic, kafkaProperties, configuration.targetTopics.schemaRegistry).keyAndValue(businessParameters.targetKeyClass, businessParameters.targetValueCLass)

  override def buildStreamTopology(env: StreamExecutionEnvironment, brand: Brand)(implicit ec: ExecutionConfig): Unit =
    env
      .addSource(source)(sourceTypeInformation)
      .name(s"model-mapper-stream-on-$sourceTopic")
      .process(RowMapperProcessor[K, V, TK, TV](businessParameters.targetValueCLass, Output.brandFailures, businessParameters.keyMapper))
      //TODO: add filtering based on feature flags
      .addSink(sink)
      .name(s"model-mapper-stream-on-$targetTopic")

}