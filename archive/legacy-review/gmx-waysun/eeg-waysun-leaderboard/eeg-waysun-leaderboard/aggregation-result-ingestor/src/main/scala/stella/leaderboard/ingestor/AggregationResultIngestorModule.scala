package stella.leaderboard.ingestor

import scala.concurrent.ExecutionContext

import com.softwaremill.macwire.wire
import com.typesafe.config.ConfigFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import stella.common.core.Clock
import stella.common.core.JavaOffsetDateTimeClock

import stella.leaderboard.db.AggregationResultRepository
import stella.leaderboard.db.SlickAggregationResultRepository
import stella.leaderboard.ingestor.config.LeaderboardKafkaConfig
import stella.leaderboard.services.LeaderboardBoundedContext
import stella.leaderboard.services.LeaderboardBoundedContextImpl

trait AggregationResultIngestorModule {
  implicit def executionContext: ExecutionContext

  lazy val config: LeaderboardKafkaConfig = LeaderboardKafkaConfig.loadConfig()
  lazy val dbConfig: DatabaseConfig[JdbcProfile] = DatabaseConfig.forConfig("slick.dbs.default", ConfigFactory.load())

  implicit lazy val clock: Clock = JavaOffsetDateTimeClock

  lazy val aggregationResultRepository: AggregationResultRepository = wire[SlickAggregationResultRepository]
  lazy val leaderboardBoundedContext: LeaderboardBoundedContext = wire[LeaderboardBoundedContextImpl]

  lazy val aggregationResultIngestor: KafkaAggregationResultIngestor = wire[KafkaAggregationResultIngestor]
}
