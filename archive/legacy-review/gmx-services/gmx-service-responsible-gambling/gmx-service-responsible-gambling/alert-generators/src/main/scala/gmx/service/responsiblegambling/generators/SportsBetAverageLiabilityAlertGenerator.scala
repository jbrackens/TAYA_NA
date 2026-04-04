package gmx.service.responsiblegambling.generators

import cloudflow.flink.{ FlinkStreamlet, FlinkStreamletLogic }
import cloudflow.streamlets.avro.{ AvroInlet, AvroOutlet }
import cloudflow.streamlets.{ IntegerConfigParameter, StreamletShape }
import gmx.data.SportsBetPlaced
import gmx.dataapi.internal.bet.AverageSportsBetLiabilityChanged
import gmx.dataapi.internal.responsiblegambling.SportsBetAverageLiabilityAlert
import org.apache.flink.api.common.state.{ MapStateDescriptor, ValueState, ValueStateDescriptor }
import org.apache.flink.configuration.Configuration
import org.apache.flink.streaming.api.functions.co.KeyedBroadcastProcessFunction
import org.apache.flink.streaming.api.scala._
import org.apache.flink.util.Collector
import org.slf4j.LoggerFactory

import scala.collection.JavaConverters._

class SportsBetAverageLiabilityAlertGenerator extends FlinkStreamlet {

  @transient val betsIn         = AvroInlet[SportsBetPlaced]("sports-bets")
  @transient val avgLiabilityIn = AvroInlet[AverageSportsBetLiabilityChanged]("average-liability")
  @transient val out            = AvroOutlet[SportsBetAverageLiabilityAlert]("out")

  @transient val shape = StreamletShape.withInlets(betsIn, avgLiabilityIn).withOutlets(out)

  val BetLiabilityDistance = IntegerConfigParameter(
    "bet-liability-distance",
    "The amount above the average bet liability a bet must be to trigger an alert",
    Some(1000)
  )

  override protected def createLogic(): FlinkStreamletLogic =
    new FlinkStreamletLogic() {
      override def buildExecutionGraph(): Unit = {

        val averageStateDescriptor: MapStateDescriptor[String, AverageSportsBetLiabilityChanged] =
          new MapStateDescriptor[String, AverageSportsBetLiabilityChanged]("average-bet-state",
                                                                           classOf[String],
                                                                           classOf[AverageSportsBetLiabilityChanged]
          )

        val bets =
          readStream(betsIn)
            .keyBy(_.customerId)

        val averages =
          readStream(avgLiabilityIn)
            .broadcast(averageStateDescriptor)

        val alerts =
          bets
            .connect(averages)
            .process(new BetLiabilityDetector(BetLiabilityDistance.value))

        writeStream(out, alerts)
      }
    }
}

class BetLiabilityDetector(distance: BigDecimal)
  extends KeyedBroadcastProcessFunction[String,
                                        SportsBetPlaced,
                                        AverageSportsBetLiabilityChanged,
                                        SportsBetAverageLiabilityAlert
  ] {

  val log = LoggerFactory.getLogger(classOf[BetLiabilityDetector])

  @transient var betState: ValueState[SportsBetPlaced]                                      = null
  @transient var averageState: MapStateDescriptor[String, AverageSportsBetLiabilityChanged] = null

  override def open(parameters: Configuration): Unit = {
    super.open(parameters)

    betState = getRuntimeContext.getState(
      new ValueStateDescriptor[SportsBetPlaced]("sports-bet-state", classOf[SportsBetPlaced])
    )
    averageState = new MapStateDescriptor[String, AverageSportsBetLiabilityChanged](
      "average-bet-state",
      classOf[String],
      classOf[AverageSportsBetLiabilityChanged]
    )
  }

  def iShouldDispatchAnAlert(bet: SportsBetPlaced, average: AverageSportsBetLiabilityChanged): Boolean =
    BigDecimal(bet.liability) - BigDecimal(average.averageStake) > distance

  override def processElement(bet: SportsBetPlaced,
                              ctx: KeyedBroadcastProcessFunction[String,
                                                                 SportsBetPlaced,
                                                                 AverageSportsBetLiabilityChanged,
                                                                 SportsBetAverageLiabilityAlert
                              ]#ReadOnlyContext,
                              out: Collector[SportsBetAverageLiabilityAlert]
  ): Unit = {
    ctx.getBroadcastState(averageState).immutableEntries().asScala.find(entry => entry.getKey == "all").map { entry =>
      if (iShouldDispatchAnAlert(bet, entry.getValue))
        out.collect(SportsBetAverageLiabilityAlert(bet.customerId, System.currentTimeMillis()))
    }

    betState.update(bet)
  }

  override def processBroadcastElement(average: AverageSportsBetLiabilityChanged,
                                       ctx: KeyedBroadcastProcessFunction[String,
                                                                          SportsBetPlaced,
                                                                          AverageSportsBetLiabilityChanged,
                                                                          SportsBetAverageLiabilityAlert
                                       ]#Context,
                                       out: Collector[SportsBetAverageLiabilityAlert]
  ): Unit = {
    val bet = betState.value
    if (bet != null)
      if (iShouldDispatchAnAlert(bet, average))
        out.collect(SportsBetAverageLiabilityAlert(bet.customerId, System.currentTimeMillis()))

    ctx.getBroadcastState(averageState).put("all", average)
  }
}
