package phoenix.prediction.tools

import scala.concurrent.Await
import scala.concurrent.ExecutionContext
import scala.concurrent.duration.DurationInt

import com.typesafe.config.ConfigFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.prediction.infrastructure.PredictionProjectionReconciliationService

object ReconcilePredictionProjection extends App {
  implicit val ec: ExecutionContext = ExecutionContext.global

  val config = ConfigFactory.load()
  val dbConfig: DatabaseConfig[JdbcProfile] = DatabaseConfig.forConfig("slick", config)
  val service = new PredictionProjectionReconciliationService(dbConfig)
  val command = args.headOption.map(_.trim.toLowerCase).getOrElse("verify")

  try {
    val report = command match {
      case "rebuild" => Await.result(service.rebuild(), 60.seconds)
      case _          => Await.result(service.verify(), 60.seconds)
    }

    println(s"prediction projection reconciliation mode=$command matches=${report.matches} totalEvents=${report.totalEvents}")
    println(s"replayedCounts=${report.replayedCounts}")
    println(s"liveCounts=${report.liveCounts}")
    if (report.diffs.nonEmpty) {
      report.diffs.foreach(diff => println(s"diff table=${diff.table} key=${diff.key} detail=${diff.detail}"))
    }

    if (!report.matches) {
      sys.error("prediction projection reconciliation failed")
    }
  } finally {
    dbConfig.db.close()
  }
}
