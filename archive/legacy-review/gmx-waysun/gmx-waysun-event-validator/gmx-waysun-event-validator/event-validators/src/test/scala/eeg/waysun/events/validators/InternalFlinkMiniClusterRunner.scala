package eeg.waysun.events.validators

import net.flipsports.gmx.streaming.tests.runners.{FlinkJobsTestRunner, FlinkMiniClusterRunner}
import org.apache.flink.runtime.testutils.MiniClusterResourceConfiguration
import org.apache.flink.test.util.MiniClusterWithClientResource

class InternalFlinkMiniClusterRunner extends FlinkMiniClusterRunner {
  val configuration = new MiniClusterResourceConfiguration.Builder()
    .setNumberTaskManagers(FlinkJobsTestRunner.taskManagers)
    .setNumberSlotsPerTaskManager(FlinkJobsTestRunner.slotsPerTaskManager)
    .build

  val miniClusterResource = new MiniClusterWithClientResource(configuration)

  override def before(): Unit = miniClusterResource.before()

  override def after(): Unit = miniClusterResource.after()

}
