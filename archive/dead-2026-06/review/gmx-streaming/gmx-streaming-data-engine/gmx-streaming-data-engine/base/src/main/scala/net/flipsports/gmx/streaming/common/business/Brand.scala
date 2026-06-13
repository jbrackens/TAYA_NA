package net.flipsports.gmx.streaming.common.business

import org.apache.flink.api.java.utils.ParameterTool
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

case class Brand(sourceBrand: SourceBrand)

object Brand {
  val brand = "brand"

  def fromGlobalParameters = {
    val parameters = StreamExecutionEnvironment.getExecutionEnvironment.getConfig.getGlobalJobParameters.asInstanceOf[ParameterTool]
    parameters.get(brand) match {
      case SourceBrand.sportNationDef => SourceBrand.sportNation
      case SourceBrand.redZoneDef => SourceBrand.redzone
      case _ => throw new RuntimeException(s"Missing brand in stream scope. Please define ${brand} in global job parameters")
    }
  }

  val default: Brand = Brand(SourceBrand.default)

  val sportNations: Brand = Brand(SourceBrand.sportNation)

  val redZone: Brand = Brand(SourceBrand.redzone)

  val fansbetUk: Brand = Brand(SourceBrand.fansbetUk)

  val idefix: Brand = Brand(SourceBrand.idefix)

  val betConstruct: Brand = Brand(SourceBrand.betConstruct)

  val waysun: Brand = Brand(SourceBrand.waysun)

}