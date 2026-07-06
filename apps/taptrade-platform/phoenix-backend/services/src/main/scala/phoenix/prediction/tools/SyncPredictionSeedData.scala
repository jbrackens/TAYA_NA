package phoenix.prediction.tools

import scala.concurrent.Await
import scala.concurrent.ExecutionContext
import scala.concurrent.duration.DurationInt

import com.typesafe.config.ConfigFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.prediction.infrastructure.SlickPredictionProjectionPersistenceService

object SyncPredictionSeedData extends App {
  implicit val ec: ExecutionContext = ExecutionContext.global

  val config = ConfigFactory.load()
  val dbConfig: DatabaseConfig[JdbcProfile] = DatabaseConfig.forConfig("slick", config)
  val projection = new SlickPredictionProjectionPersistenceService(dbConfig)

  try {
    Await.result(projection.syncSeedData(), 30.seconds)
    println("prediction seed sync complete")
  } finally {
    dbConfig.db.close()
  }
}
