package phoenix.core.persistence

import java.sql.ResultSet
import java.time.OffsetDateTime

import scala.reflect.ClassTag

import com.github.tminglei.slickpg.ExPostgresProfile
import com.github.tminglei.slickpg.PgCirceJsonSupport
import com.github.tminglei.slickpg.PgDate2Support
import io.circe._
import io.circe.syntax._
import slick.ast.TypedType
import slick.basic.Capability
import slick.jdbc.JdbcCapabilities
import slick.jdbc.JdbcType
import slick.lifted.ColumnOrdered

import phoenix.core.ordering.Direction
import phoenix.core.ordering.Direction.Ascending
import phoenix.core.ordering.Direction.Descending

/**
 * Slick-pg provides extensions for PostgreSQL, to support a series of pg data types and related operators/functions.
 * cf: https://github.com/tminglei/slick-pg
 *
 * If any of your repository implementations require these types,
 * {{{
 *   import ExtendedPostgresProfile.api._
 * }}}
 * instead of using `slick.jdbc.PostgresProfile.api._`
 */
trait ExtendedPostgresProfile extends ExPostgresProfile with PgCirceJsonSupport with PgDate2Support {
  override def pgjson = "jsonb"

  override protected def computeCapabilities: Set[Capability] =
    super.computeCapabilities + JdbcCapabilities.insertOrUpdate

  override val api = PostgresAPI
  val dateTimePlainImplicits: Date2DateTimePlainImplicits = new Date2DateTimePlainImplicits {}

  object PostgresAPI extends API with JsonImplicits with DateTimeImplicits {
    override implicit val date2TzTimestampTypeMapper: JdbcType[OffsetDateTime] = CustomOffsetDateTimeMapper

    implicit class WithOrderingDirectionOps[T: TypedType](self: Rep[T]) {
      def withOrderingDirection(direction: Direction): ColumnOrdered[T] =
        direction match {
          case Ascending  => self.asc
          case Descending => self.desc
        }
    }

    def jsonTypeMapper[T: Codec: ClassTag]: BaseColumnType[T] =
      MappedColumnType.base[T, Json](
        _.asJson,
        json => json.as[T].getOrElse(throw new RuntimeException(s"Invalid json in the database: $json")))
  }

  // https://github.com/tminglei/slick-pg/issues/493
  private object CustomOffsetDateTimeMapper
      extends GenericDateJdbcType[OffsetDateTime]("timestamptz", java.sql.Types.TIMESTAMP_WITH_TIMEZONE) {

    override def getValue(r: ResultSet, idx: Int): OffsetDateTime = {
      classTag.runtimeClass match {
        case clazz if clazz == classOf[OffsetDateTime] =>
          r.getObject(idx, classOf[OffsetDateTime])
        case _ =>
          super.getValue(r, idx)
      }
    }
  }
}

object ExtendedPostgresProfile extends ExtendedPostgresProfile
