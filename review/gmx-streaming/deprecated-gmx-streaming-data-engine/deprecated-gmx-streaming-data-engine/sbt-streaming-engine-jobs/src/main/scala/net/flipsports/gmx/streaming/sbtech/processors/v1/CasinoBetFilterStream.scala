package net.flipsports.gmx.streaming.sbtech.processors.v1

import java.util.Properties
import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.CasinoBet
import net.flipsports.gmx.streaming.common.job.{Logger, PathUtils}
import net.flipsports.gmx.streaming.common.job.kafka.{KafkaBinarySink, KafkaBinarySource}
import net.flipsports.gmx.streaming.common.job.stats.{AverageThroughputMeter, LongValuesHistogram, MessageCounter}
import net.flipsports.gmx.streaming.sbtech.configs.{SbTechConfig, SourceBrand}
import net.flipsports.gmx.streaming.sbtech.mappers.v1.CasinoBetToFilteredObjectData
import org.apache.flink.api.common.JobExecutionResult
import org.apache.flink.api.common.restartstrategy.RestartStrategies
import org.apache.flink.api.common.time.Time
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}
import org.apache.flink.contrib.streaming.state.RocksDBStateBackend
import org.apache.flink.streaming.api.environment.CheckpointConfig.ExternalizedCheckpointCleanup
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class CasinoBetFilterStream(brand: SourceBrand)(implicit configuration: SbTechConfig)
  extends Logger
  with KafkaBinarySource
  with KafkaBinarySink
  with Serializable {

  override def groupId: String = s"casino-bet-filter-stream-${brand.name}"

  override def source: Option[String] = Some(s"${configuration.kafkaTopics.topicsPrefix}_${configuration.kafkaTopics.casinoBets}_${brand.id}")

  override def target: String = s"${configuration.targetTopics.gmxTracking}.${brand.name}-${configuration.targetTopics.betsFiltered}"

  override def properties: Properties = configuration.kafka.properties

  def sourceClass: Class[CasinoBet] = classOf[CasinoBet]

  def targetKeyClass: Class[String] = classOf[String]

  def targetClass: Class[String] = classOf[String]

  override def schemaRegistry: Option[String] =  configuration.getRegistry

  def execute(): JobExecutionResult = {
      implicit val sourceTypeInformation = TypeExtractor.getForClass(sourceClass)
      implicit val targetTypeInformation = TypeExtractor.getForClass(targetClass)
      implicit val keyTypeInformation = TypeExtractor.getForClass(targetKeyClass)
      implicit val keyedTypeInformation = new TupleTypeInfo(classOf[FlinkTuple[String, String]], keyTypeInformation, targetTypeInformation)

      val env = StreamExecutionEnvironment.getExecutionEnvironment

      env.enableCheckpointing(5000)
      env.setRestartStrategy(RestartStrategies.fixedDelayRestart(5, Time.seconds(5)))
      env.getCheckpointConfig.enableExternalizedCheckpoints(ExternalizedCheckpointCleanup.DELETE_ON_CANCELLATION)
      env.setStateBackend(new RocksDBStateBackend(PathUtils.checkpoints(configuration.checkpoints)))

      val kafkaSource = consumer(sourceClass)
      val kafkaSink = keyedProducer(targetKeyClass, targetClass, env.getConfig)

      env
        .addSource(kafkaSource)
        .map(new MessageCounter[CasinoBet]())
        .uid("processed-message-counter-checkpoint")
        .map(new LongValuesHistogram[CasinoBet]())
        .uid("message-hash-histogram-checkpoint")
        .map(new AverageThroughputMeter[CasinoBet]())
        .uid("average-throughput-checkpoint")
        .flatMap(CasinoBetToFilteredObjectData.mapIfShouldBeFiltered(_, brand))
        .uid("map-many-to-target-checkpoint")
        .map(logKeyValue[String, String])
        .uid("log-row-from-target-checkpoint")
        .addSink(kafkaSink)

      env.execute(s"Casino bets filter on brand ${brand.id}")
    }


}

object CasinoBetFilterStream {

  def execute(brand: SourceBrand)(implicit configuration: SbTechConfig): Unit = new CasinoBetFilterStream(brand).execute()

}
