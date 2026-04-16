package phoenix.suppliers.mockdata

import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig

final case class PhoenixMockDataConfig(dataIngestionEnabled: Boolean)

object PhoenixMockDataConfig {
  object of extends BaseConfig[PhoenixMockDataConfig]("phoenix.mockData")
}
