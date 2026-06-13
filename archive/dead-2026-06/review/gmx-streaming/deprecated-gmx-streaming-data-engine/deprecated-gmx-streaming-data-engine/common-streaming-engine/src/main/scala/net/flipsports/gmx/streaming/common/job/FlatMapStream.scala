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


abstract class FlatMapStream[S <: SpecificRecord, C, T, B](name: String = "Generic Job - Map from A to B", brand: B)(implicit configuration: C)
  extends Logger
    with RowFlatMapper[S, C, T, B]
    with KafkaBinarySource
    with KafkaBinarySink
    with FilterRow[S, C, T]
    with Serializable {

  def sourceClass: Class[S]

  def targetClass: Class[T]

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
      .map(logInfoRow[S])
      .uid("log-row-from-source-checkpoint")
      .map(new MessageCounter[S]())
      .uid("processed-message-counter-checkpoint")
      .map(new LongValuesHistogram[S]())
      .uid("message-hash-histogram-checkpoint")
      .map(new AverageThroughputMeter[S]())
      .uid("average-throughput-checkpoint")
      .filter(filterSourceRow(_, configuration))
      .uid("filter-on-source-checkpoint")
      .flatMap(mapToTarget(_, configuration, brand))
      .uid("map-many-to-target-checkpoint")
      .filter(filterTargetRow(_, configuration))
      .uid("filter-on-target-checkpoint")
      .map(logInfoRow[T])
      .uid("log-row-from-target-checkpoint")
      .addSink(kafkaSink)

    env.execute(name)
  }

}
