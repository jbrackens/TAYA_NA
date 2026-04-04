package stella.rules

import scala.concurrent.ExecutionContext

import akka.stream.Materializer
import com.softwaremill.macwire.wire
import com.softwaremill.macwire.wireWith
import com.typesafe.config.ConfigFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import sttp.tapir.server.play.PlayServerInterpreter
import sttp.tapir.server.play.PlayServerOptions

import stella.common.core.Clock
import stella.common.core.JavaOffsetDateTimeClock
import stella.common.http.config.OpenApiConfig
import stella.common.http.jwt._
import stella.common.kafka.KafkaPublicationService
import stella.common.kafka.KafkaPublicationServiceImpl
import stella.common.kafka.config.KafkaProducerConfig
import stella.dataapi

import stella.rules.config.RuleConfiguratorConfig
import stella.rules.config.RuleConfiguratorKafkaConfig
import stella.rules.db.achievement.AchievementConfigurationRepository
import stella.rules.db.achievement.SlickAchievementConfigurationRepository
import stella.rules.db.aggregation.AggregationRuleConfigurationRepository
import stella.rules.db.aggregation.SlickAggregationRuleConfigurationRepository
import stella.rules.db.event.EventConfigurationRepository
import stella.rules.db.event.SlickEventConfigurationRepository
import stella.rules.routes.ApiRouter
import stella.rules.routes.OpenApiRoutes
import stella.rules.routes.StellaPlayServerOptions
import stella.rules.routes.achievement.AchievementRuleConfigurationRoutes
import stella.rules.routes.aggregation.AggregationRuleConfigurationRoutes
import stella.rules.routes.event.EventConfigurationRoutes
import stella.rules.services.AchievementRuleIdProvider
import stella.rules.services.AggregationRuleIdProvider
import stella.rules.services.EventIdProvider
import stella.rules.services.RandomUuidAchievementRuleIdProvider
import stella.rules.services.RandomUuidAggregationRuleIdProvider
import stella.rules.services.RandomUuidEventIdProvider
import stella.rules.services.RuleConfiguratorBoundedContext
import stella.rules.services.RuleConfiguratorBoundedContextImpl
import stella.rules.services.kafka.KafkaAchievementConfigurationPublisher
import stella.rules.services.kafka.KafkaAggregationRuleConfigurationPublisher
import stella.rules.services.kafka.KafkaEventConfigurationPublisher

trait EventKafkaPublicationServiceModule {

  def ruleConfiguratorKafkaConfig: RuleConfiguratorKafkaConfig

  lazy val eventKafkaConfig: KafkaProducerConfig =
    KafkaProducerConfig(
      ruleConfiguratorKafkaConfig.eventProducer.topicName,
      ruleConfiguratorKafkaConfig.bootstrapServers,
      ruleConfiguratorKafkaConfig.serializer,
      ruleConfiguratorKafkaConfig.eventProducer.toCommonProducer)

  lazy val kafkaEventConfigurationPublicationService: KafkaPublicationService[
    dataapi.eventconfigurations.EventConfigurationKey,
    dataapi.eventconfigurations.EventConfiguration] =
    wire[KafkaPublicationServiceImpl[
      dataapi.eventconfigurations.EventConfigurationKey,
      dataapi.eventconfigurations.EventConfiguration]]
}
trait AggregationKafkaPublicationServiceModule {

  def ruleConfiguratorKafkaConfig: RuleConfiguratorKafkaConfig

  lazy val aggregationKafkaConfig: KafkaProducerConfig =
    KafkaProducerConfig(
      ruleConfiguratorKafkaConfig.aggregationProducer.topicName,
      ruleConfiguratorKafkaConfig.bootstrapServers,
      ruleConfiguratorKafkaConfig.serializer,
      ruleConfiguratorKafkaConfig.aggregationProducer.toCommonProducer)

  lazy val kafkaAggregationRuleConfigurationPublicationService: KafkaPublicationService[
    dataapi.aggregation.AggregationRuleConfigurationKey,
    dataapi.aggregation.AggregationRuleConfiguration] =
    wire[KafkaPublicationServiceImpl[
      dataapi.aggregation.AggregationRuleConfigurationKey,
      dataapi.aggregation.AggregationRuleConfiguration]]
}

trait AchievementKafkaPublicationServiceModule {

  def ruleConfiguratorKafkaConfig: RuleConfiguratorKafkaConfig

  lazy val achievementKafkaConfig: KafkaProducerConfig =
    KafkaProducerConfig(
      ruleConfiguratorKafkaConfig.achievementProducer.topicName,
      ruleConfiguratorKafkaConfig.bootstrapServers,
      ruleConfiguratorKafkaConfig.serializer,
      ruleConfiguratorKafkaConfig.achievementProducer.toCommonProducer)

  lazy val kafkaAchievementRuleConfigurationPublicationService: KafkaPublicationService[
    dataapi.achievement.AchievementConfigurationKey,
    dataapi.achievement.AchievementConfiguration] =
    wire[KafkaPublicationServiceImpl[
      dataapi.achievement.AchievementConfigurationKey,
      dataapi.achievement.AchievementConfiguration]]
}

trait RuleConfiguratorModule
    extends EventKafkaPublicationServiceModule
    with AggregationKafkaPublicationServiceModule
    with AchievementKafkaPublicationServiceModule {
  implicit def materializer: Materializer
  implicit def executionContext: ExecutionContext

  lazy val config: RuleConfiguratorConfig = RuleConfiguratorConfig.loadConfig()
  lazy val dbConfig: DatabaseConfig[JdbcProfile] = DatabaseConfig.forConfig("slick.dbs.default", ConfigFactory.load())
  lazy val ruleConfiguratorKafkaConfig: RuleConfiguratorKafkaConfig = config.kafka

  implicit lazy val clock: Clock = JavaOffsetDateTimeClock
  lazy val eventConfigurationRepository: EventConfigurationRepository = wire[SlickEventConfigurationRepository]
  lazy val aggregationRuleConfigurationRepository: AggregationRuleConfigurationRepository =
    wire[SlickAggregationRuleConfigurationRepository]
  lazy val achievementConfigurationRepository: AchievementConfigurationRepository =
    wire[SlickAchievementConfigurationRepository]

  lazy val kafkaEventConfigurationPublisher: KafkaEventConfigurationPublisher = wire[KafkaEventConfigurationPublisher]
  lazy val kafkaAggregationRuleConfigurationPublisher: KafkaAggregationRuleConfigurationPublisher =
    wire[KafkaAggregationRuleConfigurationPublisher]
  lazy val kafkaAchievementRuleConfigurationPublisher: KafkaAchievementConfigurationPublisher =
    wire[KafkaAchievementConfigurationPublisher]

  lazy val eventIdProvider: EventIdProvider = RandomUuidEventIdProvider
  lazy val aggregationRuleIdProvider: AggregationRuleIdProvider = RandomUuidAggregationRuleIdProvider
  lazy val achievementRuleIdProvider: AchievementRuleIdProvider = RandomUuidAchievementRuleIdProvider
  lazy val ruleConfiguratorBoundedContext: RuleConfiguratorBoundedContext = wire[RuleConfiguratorBoundedContextImpl]

  implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = wireWith(createJwtAuthorizationInstance _)
  lazy val openApiConfig: OpenApiConfig = config.openApi

  lazy val serverOptions: PlayServerOptions = wireWith(StellaPlayServerOptions.instance _)
  lazy val serverInterpreter: PlayServerInterpreter = PlayServerInterpreter.apply(serverOptions)(materializer)

  lazy val eventConfigurationRoutes: EventConfigurationRoutes = wire[EventConfigurationRoutes]
  lazy val aggregationRuleConfigurationRoutes: AggregationRuleConfigurationRoutes =
    wire[AggregationRuleConfigurationRoutes]
  lazy val achievementRuleConfigurationRoutes: AchievementRuleConfigurationRoutes =
    wire[AchievementRuleConfigurationRoutes]
  lazy val openApiRoutes: OpenApiRoutes = wire[OpenApiRoutes]

  lazy val apiRouter: ApiRouter = wire[ApiRouter]

  private def createJwtAuthorizationInstance(config: RuleConfiguratorConfig): JwtAuthorization[StellaAuthContext] = {
    val jwtConfig = config.jwt
    if (jwtConfig.requireJwtAuth) {
      val oidcPropertiesProvider = new OidcDiscovery(jwtConfig)
      val authContextExtractor = new SecretBoxAuthContextExtractor(config.secretBoxHexKey)
      new JwksBasedJwtAuthorization[StellaAuthContext](jwtConfig, oidcPropertiesProvider, authContextExtractor)
    } else new DisabledJwtAuthorization(dummyUserId = config.testUserId, dummyProjectId = config.testProjectId)
  }
}
