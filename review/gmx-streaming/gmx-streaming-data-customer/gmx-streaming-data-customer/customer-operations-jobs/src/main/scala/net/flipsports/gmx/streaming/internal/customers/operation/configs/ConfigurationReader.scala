package net.flipsports.gmx.streaming.internal.customers.operation.configs

object ConfigurationReader extends Serializable {

  def load(): AppConfig = ConfigurationLoader.apply

}
