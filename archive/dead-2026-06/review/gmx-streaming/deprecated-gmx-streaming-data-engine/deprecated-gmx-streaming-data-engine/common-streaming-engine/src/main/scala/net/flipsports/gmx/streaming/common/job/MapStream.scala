package net.flipsports.gmx.streaming.common.job


import net.flipsports.gmx.streaming.common.job.kafka.{KafkaBinarySink, KafkaBinarySource}
import net.flipsports.gmx.streaming.common.job.stats.{AverageThroughputMeter, LongValuesHistogram, MessageCounter}
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.api.common.JobExecutionResult
import org.apache.flink.api.common.restartstrategy.RestartStrategies
import org.apache.flink.api.common.time.Time
import org.apache.flink.api.java.typeutils.TypeExtractor
import org.apache.flink.contrib.streaming.state.RocksDBStateBackend
import org.apache.flink.streaming.api.environment.CheckpointConfig.ExternalizedCheckpointCleanup
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

abstract class MapStream[SOURCE <: SpecificRecord, CONFIG, TARGET, BRAND](name: String = "Generic Job - Map from A to B", brand: BRAND)(implicit configuration: CONFIG)
  extends Logger
    with RowMapper[SOURCE, CONFIG, TARGET, BRAND]
    with KafkaBinarySource
    with KafkaBinarySink
    with FilterRow[SOURCE, CONFIG, TARGET]
    with Serializable {

  def sourceClass: Class[SOURCE]

  def targetClass: Class[TARGET]

  def checkpointsLocation: String

  def execute(): JobExecutionResult = {
    implicit val sourceTypeInformation = TypeExtractor.getForClass(sourceClass)
    implicit val targetTypeInformation = TypeExtractor.getForClass(targetClass)

    val env = StreamExecutionEnvironment.getExecutionEnvironment

    env.enableCheckpointing(5000)
    env.setRestartStrategy(RestartStrategies.fixedDelayRestart(5, Time.seconds(5)))
    env.getCheckpointConfig.enableExternalizedCheckpoints(ExternalizedCheckpointCleanup.DELETE_ON_CANCELLATION)
    env.setStateBackend(new RocksDBStateBackend(checkpointsLocation))

    val kafkaSource = consumer(sourceClass)
    val kafkaSink = producer(targetClass)

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
      .map(logInfoRow[TARGET])
      .uid("log-row-from-target-checkpoint")
      .addSink(kafkaSink)

    env.execute(name)
  }

}
