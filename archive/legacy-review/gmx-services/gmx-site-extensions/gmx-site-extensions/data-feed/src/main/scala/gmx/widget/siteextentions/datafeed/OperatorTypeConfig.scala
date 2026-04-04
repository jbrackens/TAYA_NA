package gmx.widget.siteextentions.datafeed

import com.typesafe.config.Config
import com.typesafe.config.ConfigFactory
import tech.argyll.video.core.sbtech.SBTechOperatorType

object OperatorTypeConfig {
  private val configPath = "app.partner-type"

  lazy val operatorType: SBTechOperatorType = {
    val config = ConfigFactory.load()
    getOperatorType(config)
  }

  def getOperatorType(config: Config): SBTechOperatorType = {
    val sbtechName = config.getString(configPath)
    SBTechOperatorType
      .values()
      .find(_.getSbtechName == sbtechName)
      .getOrElse(throw new Exception(s"Unsupported sbtech operator name $sbtechName"))
  }
}
