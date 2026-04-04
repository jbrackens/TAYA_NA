package phoenix.suppliers.betgenius

import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig

case class PhoenixBetgeniusConfig(dataIngestionEnabled: Boolean)

object PhoenixBetgeniusConfig {
  object of extends BaseConfig[PhoenixBetgeniusConfig]("phoenix.betgenius")
}
