package phoenix.oddin.infrastructure

import scala.concurrent.duration.FiniteDuration

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase
import pureconfig.ConfigReader
import pureconfig.generic.auto._

import phoenix.core.CacheConfig
import phoenix.core.config.BaseConfig

sealed trait OddinEnvironment extends EnumEntry with UpperSnakecase
final object OddinEnvironment extends Enum[OddinEnvironment] {
  override def values: IndexedSeq[OddinEnvironment] = findValues

  def isProduction(environment: OddinEnvironment): Boolean =
    environment match {
      case OddinEnvironment.Production  => true
      case OddinEnvironment.Integration => false
    }

  final case object Integration extends OddinEnvironment
  final case object Production extends OddinEnvironment
}

final case class OddinApiConfig(environment: OddinEnvironment, url: String, accessToken: String, nodeId: Int)

final case class FlowConfig(
    eventBuilderParallelism: Int,
    contextAskParallelism: Int,
    restartMinBackoff: FiniteDuration,
    restartMaxBackoff: FiniteDuration,
    restartRandomFactor: Double,
    maxRestarts: Int)

final case class OddinConfig(
    apiConfig: OddinApiConfig,
    matchSummaryCache: CacheConfig,
    marketDescriptionsCache: CacheConfig,
    marketIdMapperCache: CacheConfig,
    marketFlow: FlowConfig,
    fixtureFlow: FlowConfig,
    marketSettlementFlow: FlowConfig,
    marketCancelFlow: FlowConfig,
    matchStatusUpdateFlow: FlowConfig)

object OddinConfig {
  object of extends BaseConfig[OddinConfig]("phoenix.oddin")

  implicit val environmentReader: ConfigReader[OddinEnvironment] =
    ConfigReader[String].map(OddinEnvironment.withNameInsensitive)
}
