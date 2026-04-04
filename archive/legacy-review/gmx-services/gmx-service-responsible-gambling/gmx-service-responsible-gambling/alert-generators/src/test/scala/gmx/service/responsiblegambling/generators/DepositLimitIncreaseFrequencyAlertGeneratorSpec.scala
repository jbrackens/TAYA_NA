package gmx.service.responsiblegambling.generators

import java.util.concurrent.TimeUnit

import scala.collection.immutable.Seq
import org.apache.flink.streaming.api.scala._
import org.scalatest.wordspec.AnyWordSpecLike
import cloudflow.flink.testkit._
import com.typesafe.config.{ Config, ConfigFactory }
import gmx.data.DepositLimitAlert
import gmx.dataapi.internal.customer.DepositLimitSet
import org.scalatest.{ matchers, _ }
import matchers._

class DepositeLImitIncreaseAlertGeneratorSpec
  extends FlinkTestkit
      with AnyWordSpecLike
      with should.Matchers
      with BeforeAndAfterAll {

  override def config: Config =
    ConfigFactory.parseString("""
        cloudflow.streamlets.testFlinkStreamlet {
          target-count = 3
          window-size-days = 28
        }
      """)

  "DepositLimitIncreaseFrequencyAlertGenerator" should {

    "produce an alert only when enough increasing limits have been set in the time window" in {
      @transient lazy val env = StreamExecutionEnvironment.getExecutionEnvironment

      // 2. Create the FlinkStreamlet to test
      val streamlet = new DepositLimitIncreaseFrequencyAlertGenerator

      // 3. Prepare data to be pushed into inlet ports
      val data = Seq(
        DepositLimitSet("abc", TimeUnit.DAYS.toMillis(1), 0, "foo", "Alice", "DAY", "100.0000", "GBP"),
        DepositLimitSet("def", TimeUnit.DAYS.toMillis(7), 0, "bar", "Alice", "WEEK", "1000.0000", "GBP"),
        DepositLimitSet("ghi", TimeUnit.DAYS.toMillis(21), 0, "foo", "Alice", "MONTH", "1500.0000", "USD"),
        DepositLimitSet("ghi", TimeUnit.DAYS.toMillis(27), 0, "foo", "Alice", "MONTH", "1500.0000", "USD"),
        DepositLimitSet("ghi", TimeUnit.DAYS.toMillis(33), 0, "foo", "Alice", "MONTH", "1500.0000", "USD")
      )

      // 4. Setup inlet taps that tap the inlet ports of the streamlet
      val in: FlinkInletTap[DepositLimitSet] =
        inletAsTap[DepositLimitSet](streamlet.in, env.addSource(FlinkSource.CollectionSourceFunction(data)))

      // 5. Setup outlet taps for outlet ports
      val out: FlinkOutletTap[DepositLimitAlert] = outletAsTap[DepositLimitAlert](streamlet.out)

      // 6. Run the streamlet using the `run` method that the testkit offers
      run(streamlet, Seq(in), Seq(out), env)

      // 7. Write assertions to ensure that the expected results match the actual ones
      TestFlinkStreamletContext.result should contain only ((DepositLimitAlert("Alice")).toString())
      TestFlinkStreamletContext.result.size should equal(2)
    }
  }
}
