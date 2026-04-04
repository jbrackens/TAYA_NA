package tech.argyll.gmx.predictorgame.domain

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

trait DbConfiguration {
  implicit val config = DatabaseConfig.forConfig[JdbcProfile]("slick.dbs.default")
}
