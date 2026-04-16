package phoenix.core.persistence

import org.postgresql.util.PSQLException
import org.postgresql.util.PSQLState

object PostgresConstraintPredicates {
  def uniquenessViolated(error: PSQLException): Boolean =
    error.getSQLState == PSQLState.UNIQUE_VIOLATION.getState

  def uniquenessViolated(error: PSQLException, constraintName: String): Boolean =
    uniquenessViolated(error) && constraintNameMatches(error, constraintName)

  def foreignKeyViolated(error: PSQLException, constraintName: String): Boolean =
    error.getSQLState == PSQLState.FOREIGN_KEY_VIOLATION.getState && constraintNameMatches(error, constraintName)

  private def constraintNameMatches(error: PSQLException, constraintName: String): Boolean =
    error.getServerErrorMessage.getConstraint == constraintName
}
