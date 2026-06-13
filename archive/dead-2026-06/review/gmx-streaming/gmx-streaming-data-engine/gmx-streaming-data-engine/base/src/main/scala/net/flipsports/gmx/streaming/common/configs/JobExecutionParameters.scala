package net.flipsports.gmx.streaming.common.configs

import net.flipsports.gmx.streaming.common.job.streams.dto.Parameter
import org.apache.flink.api.java.utils.ParameterTool

case class JobExecutionParameters(args: Array[String], tool: ParameterTool) {

  def get[T](param: Parameter[T]): T = Parameter.extract(tool, param)

}


object JobExecutionParameters {

  def apply(args: Array[String]): JobExecutionParameters =
    JobExecutionParameters(args, ParameterTool.fromArgs(args))

}