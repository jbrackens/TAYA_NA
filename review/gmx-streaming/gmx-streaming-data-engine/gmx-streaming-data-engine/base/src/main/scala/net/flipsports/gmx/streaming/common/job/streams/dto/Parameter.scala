package net.flipsports.gmx.streaming.common.job.streams.dto

import org.apache.flink.api.java.utils.ParameterTool

case class Parameter[T](name: String, typeOf: Class[T], defaultValue: T)

object Parameter {

  def extract[T](tool: ParameterTool, param: Parameter[T]): T = {
    if (!tool.has(param.name)) {
      param.defaultValue
    } else {
      (param.typeOf.toString match {
        case "int" => tool.getInt(param.name)
        case "long" => tool.getLong(param.name)
        case "boolean" => tool.getBoolean(param.name)
        case "double" => tool.getDouble(param.name)
        case _ => tool.get(param.name)
      }).asInstanceOf[T]
    }
  }

  val stringParameter = (name: String, value: String) => Parameter[String](name, classOf[String], value)

  val intParameter = (name: String, value: Int) => Parameter[Int](name, classOf[Int], value)

  val longParameter = (name: String, value: Long) => Parameter[Long](name, classOf[Long], value)

  val doubleParameter = (name: String, value: Double) => Parameter[Double](name, classOf[Double], value)

  val booleanParameter = (name: String, value: Boolean) => Parameter[Boolean](name, classOf[Boolean], value)

}
