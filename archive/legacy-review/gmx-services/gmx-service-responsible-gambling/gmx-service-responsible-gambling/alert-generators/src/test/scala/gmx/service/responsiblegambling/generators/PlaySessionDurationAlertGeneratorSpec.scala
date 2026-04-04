package gmx.service.responsiblegambling.generators

import cloudflow.flink.testkit._
import com.typesafe.config.{ Config, ConfigFactory }
import gmx.data.{ CasinoBetPlaced, DepositLimitAlert, PlaySessionTimeAlert, SportsBetPlaced }
import gmx.dataapi.internal.customer.CustomerLoggedOut
import org.apache.flink.streaming.api.scala._

import scala.collection.immutable.Seq

class PlaySessionDurationAlertGeneratorSpec extends FlinkStreamletSpec {

  override def config: Config =
    ConfigFactory.parseString("""
        cloudflow.streamlets.testFlinkStreamlet {
          play-duration-hours = 2
        }
      """)

  "PlaySessionDurationAlertGenerator" should {

    "produce an alert when a user has been playing for 2 hours" in {
      @transient lazy val env = StreamExecutionEnvironment.getExecutionEnvironment

      // 2. Create the FlinkStreamlet to test
      val streamlet = new PlaySessionDurationAlertGenerator

      // 3. Prepare data to be pushed into inlet ports
      val sportsBets = Seq(
        sportsBetPlacedAt(Alice, minutes(10)),
        sportsBetPlacedAt(Alice, minutes(60)),
        sportsBetPlacedAt(Alice, minutes(151))
      )

      val casinoBets = Seq(
        casinoBetPlacedAt(Alice, minutes(20)),
        casinoBetPlacedAt(Alice, minutes(131)),
        casinoBetPlacedAt(Alice, minutes(310))
      )

      val logouts: Seq[CustomerLoggedOut] = Seq(
        customerLogoutAt(Alice, minutes(30))
      )

      // 4. Setup inlet taps that tap the inlet ports of the streamlet
      val sportsBetsIn: FlinkInletTap[SportsBetPlaced] =
        inletAsTap[SportsBetPlaced](streamlet.sportsBetInlet,
                                    env.addSource(FlinkSource.CollectionSourceFunction(sportsBets))
        )

      val casinoBetsIn: FlinkInletTap[CasinoBetPlaced] =
        inletAsTap[CasinoBetPlaced](streamlet.casinoBetInlet,
                                    env.addSource(FlinkSource.CollectionSourceFunction(casinoBets))
        )

      val customerLogoutsIn: FlinkInletTap[CustomerLoggedOut] =
        inletAsTap[CustomerLoggedOut](streamlet.customerLogoutInlet,
                                      env.addSource(FlinkSource.CollectionSourceFunction(logouts))
        )

      // 5. Setup outlet taps for outlet ports
      val out: FlinkOutletTap[PlaySessionTimeAlert] = outletAsTap[PlaySessionTimeAlert](streamlet.outlet)

      // 6. Run the streamlet using the `run` method that the testkit offers
      run(streamlet, Seq(sportsBetsIn, casinoBetsIn, customerLogoutsIn), Seq(out), env)

      // 7. Write assertions to ensure that the expected results match the actual ones
      TestFlinkStreamletContext.result should contain only ((DepositLimitAlert("Alice")).toString())
      TestFlinkStreamletContext.result.size should equal(2)
    }
  }
}
