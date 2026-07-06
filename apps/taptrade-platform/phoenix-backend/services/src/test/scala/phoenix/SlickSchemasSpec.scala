package phoenix

import java.sql.Types

import scala.annotation.tailrec
import scala.jdk.CollectionConverters._

import org.reflections.Reflections
import org.scalatest.wordspec.AnyWordSpecLike
import slick.ast.OptionType
import slick.ast.Type
import slick.jdbc.JdbcType
import slick.jdbc.JdbcTypesComponent
import slick.lifted.TableQuery

import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext

class SlickSchemasSpec
    extends AnyWordSpecLike
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext {

  "Slick tables" should {
    "have the same schema as SQL tables" in {

      val tableClasses =
        new Reflections("phoenix")
          .getSubTypesOf(classOf[slick.relational.RelationalProfile#API#Table[_]])
          .asScala
          .toSeq
          .filterNot(_.getSimpleName.startsWith("Test"))

      tableClasses.foreach { clazz =>
        val tableQuery = TableQuery { tag =>
          try {
            clazz.getConstructor(classOf[slick.lifted.Tag]).newInstance(tag)
          } catch {
            case e: ReflectiveOperationException =>
              fail(
                s"Make sure that ${clazz.getName} is NOT nested within another class or trait " +
                "and has a public constructor accepting a single argument of type slick.lifted.Tag",
                e)
          }
        }

        val slickSchema = slickColumns(tableQuery).toSeq.sortBy(_.name)
        val dbSchema = dbColumns(tableQuery).toSeq.sortBy(_.name)
        if (slickSchema != dbSchema) {
          val tableName = tableQuery.baseTableRow.tableName
          fail(s"""
              |Slick schema (class ${clazz.getName}) and DB schema for table '$tableName' differ.
              |
              |Slick columns are mapped to the following schema:
              |${slickSchema.mkString("\t", "\n\t", "")}
              |
              |while DB table is defined as:
              |${dbSchema.mkString("\t", "\n\t", "")}
              |""".stripMargin)
        }
      }
    }
  }

  private case class ColumnDef(name: String, tpe: String, isNullable: Boolean) {
    override def toString: String = {
      f"$name%-20s $tpe%-20s ${if (isNullable) "NULL" else "NOT NULL"}"
    }
  }

  private def slickColumns[T <: slick.relational.RelationalProfile#API#Table[_]](
      tableQuery: TableQuery[T]): Set[ColumnDef] = {
    val tableName = tableQuery.baseTableRow.tableName

    tableQuery.baseTableRow.create_*.map { field =>
      ColumnDef(
        field.name,
        translateSlickColumnTypeToSqlTypeName(tableName, field.name, field.tpe),
        field.tpe.isInstanceOf[OptionType])
    }.toSet
  }

  private def dbColumns[T <: slick.relational.RelationalProfile#API#Table[_]](
      tableQuery: TableQuery[T]): Set[ColumnDef] = {
    await(dbConfig.db.run(for {
      metaTables <- slick.jdbc.meta.MTable.getTables(tableQuery.baseTableRow.tableName)
      columns <- metaTables.head.getColumns
    } yield columns.map { column =>
      ColumnDef(column.name, canonicalizeSqlTypeName(column.typeName), column.isNullable.getOrElse(false))
    })).toSet
  }

  private def canonicalizeSqlTypeName(columnTypeName: String): String =
    columnTypeName.toLowerCase match {
      case "bigserial" => "bigint"
      case "serial"    => "integer"
      case "int4"      => "integer"
      case "bool"      => "boolean"
      case "int8"      => "bigint"
      case "numeric"   => "decimal"
      case "citext"    => "varchar"
      case "float4"    => "real"
      case "float8"    => "double precision"
      case ctn         => ctn
    }

  @tailrec
  private def translateSlickColumnTypeToSqlTypeName(tableName: String, columnName: String, columnType: Type): String = {
    columnType match {
      case OptionType.Primitive(x) =>
        translateSlickColumnTypeToSqlTypeName(tableName, columnName, x)
      case x: JdbcTypesComponent#MappedJdbcType[_, _] =>
        translateSlickColumnTypeToSqlTypeName(tableName, columnName, x.tmd)

      case x: JdbcType[_] if x.sqlType == Types.DECIMAL => "decimal" // to normalize types like e.g. `decimal(21,2)`

      case x: JdbcType[_] if x.sqlType == Types.TIMESTAMP =>
        fail(s"""
          |Slick column '$columnName' of table '$tableName' is mapped to TIMESTAMP WITHOUT TIMEZONE.
          |This type is inherently unsafe in combination with JDBC.
          |Use OffsetDateTime/TIMESTAMP WITH TIMEZONE instead.
          |See ${classOf[DateTimeJdbcTypeIntegrationSpec].getSimpleName} for the details.""".stripMargin)

      case x: JdbcType[_] => x.sqlTypeName(size = None).toLowerCase

      case x =>
        fail(s"""
          |Slick column '$columnName' of table '$tableName' is of (or mapped to) slick.ast.Type $x.
          |We've probably haven't used this type for any Slick column so far,
          |and we don't know how this type translates into a SQL type.
          |Consider adding a case to ${getClass.getName}#translateSlickColumnTypeToSqlTypeName if this mapping is intended.""")
    }
  }
}
