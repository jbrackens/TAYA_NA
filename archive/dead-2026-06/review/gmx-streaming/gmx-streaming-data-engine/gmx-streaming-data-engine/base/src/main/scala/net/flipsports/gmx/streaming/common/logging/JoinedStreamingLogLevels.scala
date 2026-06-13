package net.flipsports.gmx.streaming.common.logging

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters
import net.flipsports.gmx.streaming.common.job.streams.dto.DefaultParameters.Log
import org.slf4j.event.Level

trait JoinedStreamingLogLevels extends LazyLogging {

  implicit val executionParameters: JobExecutionParameters

  lazy val processElementLogLevel: Level = Level.valueOf(executionParameters.get(Log.processElementLogLevel))

  lazy val processBroadcastElementLogLevel: Level = Level.valueOf(executionParameters.get(Log.broadcastElementLogLevel))

  lazy val timerTickLogLevel: Level = Level.valueOf(executionParameters.get(Log.timerTickLogLevel))

  lazy val stateOperationLevel: Level = Level.valueOf(executionParameters.get(Log.stateOperationLogLevel))

  lazy val globalLevel: Level = Level.valueOf(executionParameters.get(Log.globalLogLevel))


}
