package net.flipsports.gmx.streaming.common.job

import net.flipsports.gmx.streaming.common.job.kafka.{KafkaBinarySink, KafkaBinarySource}
import net.flipsports.gmx.streaming.common.job.stats.{AverageThroughputMeter, LongValuesHistogram, MessageCounter}
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.api.common.JobExecutionResult
import org.apache.flink.api.common.restartstrategy.RestartStrategies
import org.apache.flink.api.common.time.Time
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}
import org.apache.flink.contrib.streaming.state.RocksDBStateBackend
import org.apache.flink.streaming.api.environment.CheckpointConfig.ExternalizedCheckpointCleanup
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

abstract class KeyedMapStream[SOURCE <: SpecificRecord, CONFIG, KEY, TARGET, BRAND](name: String = "Generic Job - Map from A to B", brand: BRAND)(implicit configuration: CONFIG)
  extends Logger
    with KeyedRowMapper[SOURCE, CONFIG, KEY, TARGET, BRAND]
    with KafkaBinarySource
    with KafkaBinarySink
    with KeyedFilterRow[SOURCE, CONFIG, KEY, TARGET]
    with Serializable {

  def sourceClass: Class[SOURCE]

  def targetClass: Class[TARGET]

  def keyClass: Class[KEY]

  def checkpointsLocation: String

  def execute(): JobExecutionResult = {
    implicit val sourceTypeInformation = TypeExtractor.getForClass(sourceClass)
    implicit val targetTypeInformation = TypeExtractor.getForClass(targetClass)
    implicit val keyTypeInformation = TypeExtractor.getForClass(keyClass)
    implicit val keyedTypeInformation = new TupleTypeInfo(classOf[Tuple2[KEY, TARGET]], keyTypeInformation, targetTypeInformation)

    val env = StreamExecutionEnvironment.getExecutionEnvironment

    env.enableCheckpointing(5000)
    env.setRestartStrategy(RestartStrategies.fixedDelayRestart(5, Time.seconds(5)))
    env.getCheckpointConfig.enableExternalizedCheckpoints(ExternalizedCheckpointCleanup.DELETE_ON_CANCELLATION)
    env.setStateBackend(new RocksDBStateBackend(checkpointsLocation))

    val kafkaSource = consumer(sourceClass)
    val kafkaSink = keyedProducer(keyClass, targetClass, env.getConfig)

    env
      .addSource(kafkaSource)
      .map(logInfoRow[SOURCE])
      .uid("log-row-from-source-checkpoint")
      .map(new MessageCounter[SOURCE]())
      .uid("processed-message-counter-checkpoint")
      .map(new LongValuesHistogram[SOURCE]())
      .uid("message-hash-histogram-checkpoint")
      .map(new AverageThroughputMeter[SOURCE]())
      .uid("average-throughput-checkpoint")
      .filter(filterSourceRow(_, configuration))
      .uid("filter-on-source-checkpoint")
      .map(mapToTarget(_, configuration, brand))
      .uid("map-to-targer-checkpoint")
      .filter(filterTargetRow(_, configuration))
      .uid("filter-on-target-checkpoint")
      .map(logKeyValue[KEY, TARGET])
      .uid("log-row-from-target-checkpoint")
      .addSink(kafkaSink)

    env.execute(name)
  }

}
