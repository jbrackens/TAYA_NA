package stella.wallet.db

import java.sql.PreparedStatement
import java.sql.ResultSet
import java.util.UUID

import enumeratum.SlickEnumSupport
import slick.ast.NumericTypedType

import stella.common.models.Ids.ProjectId

import stella.wallet.db.ExtendedPostgresProfile.api._
import stella.wallet.models.transaction.TransactionType
import stella.wallet.models.wallet.PositiveBigDecimal

trait CommonMappers extends SlickEnumSupport {

  override val profile: ExtendedPostgresProfile.type = slickProfile

  implicit lazy val transactionTypeMapper: profile.BaseColumnType[TransactionType] =
    mappedColumnTypeForLowercaseEnum(TransactionType)

  implicit val projectIdTypeWrapper = profile.MappedJdbcType.base[ProjectId, UUID](_, ProjectId(_))

  implicit val projectIdListTypeWrapper =
    new profile.SimpleArrayJdbcType[UUID]("uuid").mapTo[ProjectId](ProjectId(_), value => value).to(_.toList)

  implicit lazy val positiveBigDecimalMapper: profile.BaseColumnType[PositiveBigDecimal] with NumericTypedType =
    new PositiveBigDecimalJdbcType()

  class PositiveBigDecimalJdbcType extends profile.DriverJdbcType[PositiveBigDecimal] with NumericTypedType {
    override def sqlType: Int = java.sql.Types.DECIMAL

    override def setValue(number: PositiveBigDecimal, statement: PreparedStatement, idx: Int): Unit =
      statement.setBigDecimal(idx, number.value.bigDecimal)

    override def getValue(res: ResultSet, idx: Int): PositiveBigDecimal =
      Option(res.getBigDecimal(idx)).map(value => PositiveBigDecimal(BigDecimal(value))).orNull

    override def updateValue(newValue: PositiveBigDecimal, res: ResultSet, idx: Int): Unit =
      res.updateBigDecimal(idx, newValue.value.bigDecimal)
  }
}
