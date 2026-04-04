package gmx.service.responsiblegambling.generators

import java.util.concurrent.TimeUnit

import cloudflow.flink.testkit._
import com.typesafe.config.{ Config, ConfigFactory }
import gmx.data.{ DepositLimitAlert, TimeOutAlert }
import gmx.dataapi.internal.customer.{ DepositLimitSet, TimeoutSet }
import org.apache.flink.streaming.api.scala._
import org.scalatest.matchers._
import org.scalatest.wordspec.AnyWordSpecLike
import org.scalatest.{ matchers, _ }

import scala.collection.immutable.Seq

class TimeoutFrequencyAlertGeneratorSpec
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

  "TimeoutFrequenceAlertGenerator" should {

    "produce an alert when enough Timeouts have been received within the window" in {
      @transient lazy val env = StreamExecutionEnvironment.getExecutionEnvironment

      // 2. Create the FlinkStreamlet to test
      val streamlet = new TimeoutFrequencyAlertGenerator

      // 3. Prepare data to be pushed into inlet ports
      val data = Seq(
        TimeoutSet("abc", TimeUnit.DAYS.toMillis(1), 0, "foo", "Alice", 0, 0),
        TimeoutSet("def", TimeUnit.DAYS.toMillis(7), 0, "bar", "Alice", 0, 0),
        TimeoutSet("ghi", TimeUnit.DAYS.toMillis(21), 0, "foo", "Alice", 0, 0),
        TimeoutSet("ghi", TimeUnit.DAYS.toMillis(27), 0, "foo", "Alice", 0, 0),
        TimeoutSet("ghi", TimeUnit.DAYS.toMillis(33), 0, "foo", "Alice", 0, 0)
      )

      // 4. Setup inlet taps that tap the inlet ports of the streamlet
      val in: FlinkInletTap[TimeoutSet] =
        inletAsTap[TimeoutSet](streamlet.inlet, env.addSource(FlinkSource.CollectionSourceFunction(data)))

      // 5. Setup outlet taps for outlet ports
      val out: FlinkOutletTap[TimeOutAlert] = outletAsTap[TimeOutAlert](streamlet.outlet)

      // 6. Run the streamlet using the `run` method that the testkit offers
      run(streamlet, Seq(in), Seq(out), env)

      // 7. Write assertions to ensure that the expected results match the actual ones
      TestFlinkStreamletContext.result should contain only ((DepositLimitAlert("Alice")).toString())
      TestFlinkStreamletContext.result.size should equal(2)
    }
  }
}
