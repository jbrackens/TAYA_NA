package phoenix.punters.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.applicativeError._
import org.postgresql.util.PSQLException
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.core.persistence.PostgresConstraintPredicates
import phoenix.projections.DomainMappers._
import phoenix.punters.domain.CurrentTermsVersion
import phoenix.punters.domain.Terms
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.domain.TermsAndConditionsRepository.TermsAndConditionsErrors.WrongTermsValue
import phoenix.punters.domain.TermsContent
import phoenix.punters.domain.TermsDaysThreshold

class SlickTermsAndConditionsRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends TermsAndConditionsRepository {
  import dbConfig.db

  private val termsTable: TableQuery[TermsAndConditionsTable] = TableQuery[TermsAndConditionsTable]

  override def insert(terms: Terms): EitherT[Future, WrongTermsValue.type, Unit] = {
    db.run(termsTable += terms)
      .attemptT
      .leftMap {
        case ex: PSQLException if PostgresConstraintPredicates.uniquenessViolated(ex) => WrongTermsValue
        case ex                                                                       => throw ex
      }
      .map(_ => ())
  }

  override def getCurrentTerms(): Future[Terms] = {
    db.run(termsTable.sortBy(_.currentVersion.desc).take(1).result.head)
  }
}

private final class TermsAndConditionsTable(tag: Tag) extends Table[Terms](tag, "terms_and_conditions") {
  def currentVersion = column[CurrentTermsVersion]("current_terms_version", O.PrimaryKey)

  def termsContent = column[TermsContent]("terms_content")

  def thresholdDays = column[TermsDaysThreshold]("terms_days_threshold")

  override def * : ProvenShape[Terms] = (currentVersion, termsContent, thresholdDays).mapTo[Terms]
}
