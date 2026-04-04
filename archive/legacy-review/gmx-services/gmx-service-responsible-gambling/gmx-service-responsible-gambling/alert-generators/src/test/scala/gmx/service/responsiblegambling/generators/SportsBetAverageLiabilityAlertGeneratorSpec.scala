package gmx.service.responsiblegambling.generators

import cloudflow.flink.testkit._
import com.typesafe.config.{ Config, ConfigFactory }
import gmx.data.{ CasinoBetPlaced, DepositLimitAlert, PlaySessionTimeAlert, SportsBetPlaced }
import gmx.dataapi.internal.bet.AverageSportsBetLiabilityChanged
import gmx.dataapi.internal.customer.{ AverageSportsBetStakeChanged, CustomerLoggedOut }
import gmx.dataapi.internal.responsiblegambling.SportsBetAverageLiabilityAlert
import org.apache.flink.streaming.api.scala._

import scala.collection.immutable.Seq

class SportsBetAverageLiabilityAlertGeneratorSpec extends FlinkStreamletSpec {

  override def config: Config =
    ConfigFactory.parseString("""
        cloudflow.streamlets.testFlinkStreamlet {
          bet-liability-distance = 2000
        }
      """)

  "SportsBetAverageLiabilityAlertGenerator" should {

    "produce an alert when a user makes a bet with a stake too high" in {
      @transient lazy val env = StreamExecutionEnvironment.getExecutionEnvironment

      // 2. Create the FlinkStreamlet to test
      val streamlet = new SportsBetAverageLiabilityAlertGenerator

      // 3. Prepare data to be pushed into inlet ports
      val sportsBets = Seq(
        sportsBetPlacedAt(Alice, minutes(10), 10),
        sportsBetPlacedAt(Alice, minutes(60), 1100),
        sportsBetPlacedAt(Alice, minutes(1510), 1999),
        sportsBetPlacedAt(Alice, minutes(1510), 20001)
      )

      val averages = Seq(
        sportsBetAverageLiability(1),
        sportsBetAverageLiability(1800)
      )

      // 4. Setup inlet taps that tap the inlet ports of the streamlet
      val sportsBetsIn: FlinkInletTap[SportsBetPlaced] =
        inletAsTap[SportsBetPlaced](streamlet.betsIn, env.addSource(FlinkSource.CollectionSourceFunction(sportsBets)))

      val averagesIn: FlinkInletTap[AverageSportsBetLiabilityChanged] =
        inletAsTap[AverageSportsBetLiabilityChanged](streamlet.avgLiabilityIn,
                                                     env.addSource(FlinkSource.CollectionSourceFunction(averages))
        )

      // 5. Setup outlet taps for outlet ports
      val out: FlinkOutletTap[SportsBetAverageLiabilityAlert] =
        outletAsTap[SportsBetAverageLiabilityAlert](streamlet.out)

      // 6. Run the streamlet using the `run` method that the testkit offers
      run(streamlet, Seq(sportsBetsIn, averagesIn), Seq(out), env)

      // 7. Write assertions to ensure that the expected results match the actual ones
      TestFlinkStreamletContext.result.size should equal(1)
      TestFlinkStreamletContext.result.forEach { result =>
        result should startWith("{\"customerId\": \"Alice\"")
      }
    }
  }
}
