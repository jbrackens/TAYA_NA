package gmx.service.responsiblegambling.generators

import java.util.concurrent.TimeUnit

import cloudflow.flink.{ FlinkStreamlet, FlinkStreamletLogic }
import cloudflow.streamlets.avro.{ AvroInlet, AvroOutlet }
import cloudflow.streamlets.{ IntegerConfigParameter, StreamletShape }
import gmx.data.{ CasinoBetPlaced, SportsBetPlaced }
import gmx.dataapi.internal.customer.CustomerLoggedOut
import gmx.dataapi.internal.responsiblegambling.PlaySessionDurationAlert
import org.apache.flink.api.common.state.{ ValueState, ValueStateDescriptor }
import org.apache.flink.configuration.Configuration
import org.apache.flink.streaming.api.functions.co.RichCoFlatMapFunction
import org.apache.flink.streaming.api.scala._
import org.apache.flink.util.Collector
import org.slf4j.LoggerFactory

/**
 * Our goal here is to try and identify when a Customer is playing continuously for a
 * given amount of time (or longer).
 */
class PlaySessionDurationAlertGenerator extends FlinkStreamlet {

  @transient val sportsBetInlet      = AvroInlet[SportsBetPlaced]("sports-bets")
  @transient val casinoBetInlet      = AvroInlet[CasinoBetPlaced]("casino-bets")
  @transient val customerLogoutInlet = AvroInlet[CustomerLoggedOut]("logouts")
  @transient val outlet              = AvroOutlet[PlaySessionDurationAlert]("out", _.customerId)

  @transient val shape =
    StreamletShape.withInlets(sportsBetInlet, casinoBetInlet, customerLogoutInlet).withOutlets(outlet)

  val PlayDurationHours = IntegerConfigParameter(
    "play-duration-hours",
    "If a Customer places bets for this amount of time (in hours) without a session timeout the alert will be triggered.",
    Some(3)
  )

  override def configParameters = Vector(PlayDurationHours)

  override protected def createLogic(): FlinkStreamletLogic =
    new FlinkStreamletLogic() {
      override def buildExecutionGraph(): Unit = {

        val sportsBets =
          readStream(sportsBetInlet)
            .keyBy(_.customerId)

        val casinoBets =
          readStream(casinoBetInlet)
            .keyBy(_.customerId)

        val logouts =
          readStream(customerLogoutInlet)
            .keyBy(_.customerId)

        // Merge bets together
        val bets =
          sportsBets
            .connect(casinoBets)
            .flatMap(new JoinBetsFunction)
            .keyBy(_.customerId)

        // FlatMap `Bet` and `Logout` to produce alerts.
        val alerts: DataStream[PlaySessionDurationAlert] =
          bets
            .connect(logouts)
            .flatMap(new PlaySessionTimeFunction(PlayDurationHours.value))

        writeStream(outlet, alerts)
      }
    }
}

/**
 * The approach implemented here is to use bets being placed as an indicator of 'playing'
 * and logouts as an indicator of 'not playing'.
 *
 * We keep a list of bets, trimmed to the required time window, if there's more than 1 bet
 * in that window
 *
 * Receiving a `CustomerLoggedOut` event empties that list and we start again with the next bet.
 */
class PlaySessionTimeFunction(durationHours: Int)
  extends RichCoFlatMapFunction[Bet, CustomerLoggedOut, PlaySessionDurationAlert] {

  val log = LoggerFactory.getLogger(classOf[PlaySessionTimeFunction])

  val targetDuration = TimeUnit.HOURS.toMillis(durationHours)

  @transient var state: ValueState[AlertGeneratorState[Bet]] = null

  override def open(parameters: Configuration): Unit = {
    super.open(parameters)

    state = getRuntimeContext.getState(
      new ValueStateDescriptor[AlertGeneratorState[Bet]]("play-session-time-state", classOf[AlertGeneratorState[Bet]])
    )
  }

  override def flatMap1(bet: Bet, out: Collector[PlaySessionDurationAlert]): Unit = {
    val currentState = state.value match {
      case null     => AlertGeneratorState[Bet]
      case existing => existing
    }

    currentState.earliestTimestamp.fold {
      state.update(currentState + bet)
    } { earliest =>
      val sessionDuration = bet.timestamp - earliest

      if (sessionDuration > targetDuration) {
        out.collect(PlaySessionDurationAlert(bet.customerId))
        state.clear()
      }
    }
  }

  override def flatMap2(value: CustomerLoggedOut, out: Collector[PlaySessionDurationAlert]): Unit =
    state.clear()
}

/**
 * Interface for abstracting a `Bet``
 */
trait Bet {
  def timestamp: Long
  def customerId: String
}

class SportsBet(bet: SportsBetPlaced) extends Bet {
  override def timestamp: Long    = bet.placedAt
  override def customerId: String = bet.customerId
}

class CasinoBet(bet: CasinoBetPlaced) extends Bet {
  override def timestamp: Long    = bet.placedAt
  override def customerId: String = bet.customerId
}

/**
 * Joins the Sports and Casino bets together into an aggregated `Bet` stream.
 */
class JoinBetsFunction extends RichCoFlatMapFunction[SportsBetPlaced, CasinoBetPlaced, Bet] {

  override def flatMap1(bet: SportsBetPlaced, out: Collector[Bet]): Unit =
    out.collect(new SportsBet(bet))

  override def flatMap2(bet: CasinoBetPlaced, out: Collector[Bet]): Unit =
    out.collect(new CasinoBet(bet))
}
