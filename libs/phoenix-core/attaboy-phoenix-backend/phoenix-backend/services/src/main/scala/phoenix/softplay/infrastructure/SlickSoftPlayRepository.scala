package phoenix.softplay.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.sql.SqlStreamingAction

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.RegistrationOutcome
import phoenix.punters.domain.ResponsibleGamblingLimitType
import phoenix.punters.domain.ResponsibleGamblingLimitType.DepositAmount
import phoenix.punters.domain.ResponsibleGamblingLimitType.StakeAmount
import phoenix.softplay.domain._
import phoenix.softplay.infrastructure.SoftPlaySetParameters._

final class SlickSoftPlayRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends SoftPlayRepository {
  import dbConfig.db

  private val numberToReturnIfSomethingGoesWrongWithQuery = -100

  override def getSuccessfulRegistrationsCount(at: OffsetDateTime): Future[SuccessfulRegistrationsCount] =
    runCountQuery(sql"""
        SELECT 
          COUNT(*)
        FROM 
          punter_registration_data
        WHERE
          is_finished = true
        AND
          registration_outcome = ${RegistrationOutcome.Successful}
        AND 
          updated_at < $at
        """.as[Int]).map(SuccessfulRegistrationsCount)

  override def getUnsuccessfulRegistrationsCount(at: OffsetDateTime): Future[UnsuccessfulRegistrationsCount] =
    runCountQuery(sql"""
        SELECT 
          COUNT(*)
        FROM 
          punter_registration_data
        WHERE
          (registration_outcome = ${RegistrationOutcome.Failed} OR registration_outcome IS NULL)
        AND 
          updated_at < $at
        """.as[Int]).map(UnsuccessfulRegistrationsCount)

  override def getPuntersWithDepositLimitCount(at: OffsetDateTime): Future[PuntersWithDepositLimitCount] =
    runLimitQuery(DepositAmount, at).map(PuntersWithDepositLimitCount)

  override def getPuntersWithSpendLimitCount(at: OffsetDateTime): Future[PuntersWithSpendLimitCount] =
    runLimitQuery(StakeAmount, at).map(PuntersWithSpendLimitCount)

  override def getExcludedPuntersCount(at: OffsetDateTime): Future[ExcludedPuntersCount] =
    runCountQuery(sql"""
        SELECT
          COUNT(*)
        FROM
          self_excluded_punters
        WHERE
          excluded_at < $at
        """.as[Int]).map(ExcludedPuntersCount)

  override def getSuspendedPuntersCount(at: OffsetDateTime): Future[SuspendedPuntersCount] =
    runCountQuery(sql"""
        SELECT
          count(*)
        FROM
          punter_cool_offs
        WHERE
          cool_off_cause = ${CoolOffCause.SelfInitiated}
        AND
          cool_off_start < $at
        AND
          cool_off_end > $at
      """.as[Int]).map(SuspendedPuntersCount)

  private def runLimitQuery(limitType: ResponsibleGamblingLimitType, at: OffsetDateTime) =
    runCountQuery(sql"""
        SELECT
          count(*)
            FROM (
              SELECT
                row_number() over(PARTITION BY punter_id ORDER BY effective_from DESC) AS row
              FROM
                punter_limits_history
              WHERE
                limit_type = $limitType
              AND
                effective_from < $at
              AND
                limit_value != 'REMOVED'
            ) latest_limit
        WHERE latest_limit.row = 1
       """.as[Int])

  private def runCountQuery(query: SqlStreamingAction[Vector[Int], Int, Effect]): Future[Int] =
    db.run(query).map(_.headOption.getOrElse(numberToReturnIfSomethingGoesWrongWithQuery))
}
