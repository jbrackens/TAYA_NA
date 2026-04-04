package gmx.service.responsiblegambling.calculators

import cloudflow.flink.{FlinkStreamlet, FlinkStreamletLogic}
import cloudflow.streamlets.StreamletShape
import cloudflow.streamlets.avro.{AvroInlet, AvroOutlet}
import gmx.data.SportsBetPlaced
import gmx.dataapi.internal.bet.AverageSportsBetLiabilityChanged
import org.apache.flink.api.common.functions.AggregateFunction
import org.apache.flink.streaming.api.scala._
import org.apache.flink.streaming.api.windowing.assigners.TumblingProcessingTimeWindows
import org.apache.flink.streaming.api.windowing.time.Time

import scala.math.BigDecimal.RoundingMode

class AverageSportsBetLiabilityCalculator extends FlinkStreamlet {

  val inlet  = AvroInlet[SportsBetPlaced]("in")
  val outlet = AvroOutlet[AverageSportsBetLiabilityChanged]("out")

  val shape = StreamletShape(inlet, outlet)

  override def createLogic(): FlinkStreamletLogic =
    new FlinkStreamletLogic() {
      override def buildExecutionGraph(): Unit = {
        val averageBetLiability = readStream(inlet)
          .windowAll(TumblingProcessingTimeWindows.of(Time.days(1)))
          .aggregate(new AverageAggregator)

        writeStream(outlet, averageBetLiability)
      }
    }
}

case class Accumulator(count: Long, sum: BigDecimal)

object Accumulator {

  def apply(): Accumulator =
    Accumulator(0, 0)
}

class AverageAggregator extends AggregateFunction[SportsBetPlaced, Accumulator, AverageSportsBetLiabilityChanged] {

  override def createAccumulator(): Accumulator = Accumulator()

  override def add(value: SportsBetPlaced, accumulator: Accumulator): Accumulator =
    Accumulator(accumulator.count + 1, accumulator.sum + BigDecimal(value.liability))

  override def getResult(accumulator: Accumulator): AverageSportsBetLiabilityChanged =
    AverageSportsBetLiabilityChanged((accumulator.sum / accumulator.count).setScale(4, RoundingMode.HALF_UP).toString(), 0)

  override def merge(a: Accumulator, b: Accumulator): Accumulator =
    Accumulator(a.count + b.count, a.sum + b.sum)
}
