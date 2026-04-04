package eeg.waysun.events.aggregation.functions

import com.typesafe.scalalogging.LazyLogging
import stella.dataapi.validators.FieldType

sealed trait Value[T] extends LazyLogging {
  def typeName: String

  def value: T

  def eq(reference: Value[Any]): Boolean = warnAboutUsingDefaultImplementation(
    Thread.currentThread.getStackTrace()(2).getMethodName)

  def neq(reference: Value[Any]): Boolean = !eq(reference)

  def ge(reference: Value[Any]): Boolean = warnAboutUsingDefaultImplementation(
    Thread.currentThread.getStackTrace()(2).getMethodName)

  def le(reference: Value[Any]): Boolean = warnAboutUsingDefaultImplementation(
    Thread.currentThread.getStackTrace()(2).getMethodName)

  def lt(reference: Value[Any]): Boolean = warnAboutUsingDefaultImplementation(
    Thread.currentThread.getStackTrace()(2).getMethodName)

  def gt(reference: Value[Any]): Boolean = warnAboutUsingDefaultImplementation(
    Thread.currentThread.getStackTrace()(2).getMethodName)

  private def warnAboutUsingDefaultImplementation(methodName: String): Boolean = {
    logger.error(s"Using default implementation in method: [$methodName] ! Please check configuration.")
    false
  }
}

object Value {

  case class StringValue(item: String) extends Value[String] {
    override def typeName: String = FieldType.String.name

    override def value: String = item

    override def eq(reference: Value[Any]): Boolean = item.equals(reference.asInstanceOf[Value[String]].value)
  }

  case class BooleanValue(item: Boolean) extends Value[Boolean] {
    override def typeName: String = FieldType.Boolean.name

    override def value: Boolean = item

    override def eq(reference: Value[Any]): Boolean = item == reference.value
  }

  case class IntegerValue(item: Int) extends Value[Int] {
    override def typeName: String = FieldType.Integer.name

    override def value: Int = item

    override def eq(reference: Value[Any]): Boolean = item == reference.asInstanceOf[Value[Int]].value

    override def ge(reference: Value[Any]): Boolean = item >= reference.asInstanceOf[Value[Int]].value

    override def le(reference: Value[Any]): Boolean = item <= reference.asInstanceOf[Value[Int]].value

    override def lt(reference: Value[Any]): Boolean = item < reference.asInstanceOf[Value[Int]].value

    override def gt(reference: Value[Any]): Boolean = item > reference.asInstanceOf[Value[Int]].value
  }

  case class FloatValue(item: Float) extends Value[Float] {
    override def typeName: String = FieldType.Float.name

    override def value: Float = item

    override def eq(reference: Value[Any]): Boolean = item == reference.asInstanceOf[Value[Float]].value

    override def ge(reference: Value[Any]): Boolean = item >= reference.asInstanceOf[Value[Float]].value

    override def le(reference: Value[Any]): Boolean = item <= reference.asInstanceOf[Value[Float]].value

    override def lt(reference: Value[Any]): Boolean = item < reference.asInstanceOf[Value[Float]].value

    override def gt(reference: Value[Any]): Boolean = item > reference.asInstanceOf[Value[Float]].value
  }

}
