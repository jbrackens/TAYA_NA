package stella.leaderboard.ingestor.config

import com.typesafe.config.ConfigFactory
import pureconfig.generic.auto._

import stella.common.core.config.BaseConfig
import stella.common.kafka.config.ConsumerConfig
import stella.common.kafka.config.SerializerConfig

final case class LeaderboardKafkaConfig(
    topicName: String,
    bootstrapServers: String,
    serializer: SerializerConfig,
    consumer: ConsumerConfig)

object LeaderboardKafkaConfig extends BaseConfig[LeaderboardKafkaConfig]("stella.leaderboard.kafka") {
  def loadConfig(): LeaderboardKafkaConfig = {
    val config = ConfigFactory.load()
    LeaderboardKafkaConfig(config)
  }
}
