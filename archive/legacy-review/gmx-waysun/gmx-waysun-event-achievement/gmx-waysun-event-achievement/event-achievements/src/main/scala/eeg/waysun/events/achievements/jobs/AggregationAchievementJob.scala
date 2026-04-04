package eeg.waysun.events.achievements.jobs

import eeg.waysun.events.achievements.streams.EventAchievementStream
import net.flipsports.gmx.streaming.common.job.{MetaParameters, WaysunMetaParameters}

object AggregationAchievementJob extends BaseJob("achieved", new WaysunMetaParameters {}) {

  def main(args: Array[String]): Unit = EventAchievementStream(MetaParameters(name), businessMetaParams, config)

  val startup = "eeg.waysun.events.achievements.jobs.AggregationAchievementJob"
}
