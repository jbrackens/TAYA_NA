package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerDetail, PreJoin}
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.Tag
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple.{CustomerHasTag, RegistrationDateIsAfter}
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2

class UndecidedRegistrationFilter extends FilterFunction[Tuple2[PreJoin.KeyType, CustomerDetail.ValueType]]  {

  val freshRegistration = RegistrationDateIsAfter.isRegistrationYoungerThan10Minutes()

  val customerHasBlack = CustomerHasTag(Tag.Black)

  val customerHasRed = CustomerHasTag(Tag.Red)

  val customerHasGrey = CustomerHasTag(Tag.Grey)

  val customerHasBronze = CustomerHasTag(Tag.Bronze)

  val customerHasSilver = CustomerHasTag(Tag.Silver)

  val customerHasGold = CustomerHasTag(Tag.Gold)

  val customerHasUndecided = CustomerHasTag(Tag.CustomerUndecided)

  val customerHasNotTag = (customerHasBlack.or(customerHasRed).or(customerHasGrey).or(customerHasBronze).or(customerHasSilver).or(customerHasGold).or(customerHasUndecided)).negate()

  override def filter(record: Tuple2[PreJoin.KeyType, CustomerDetail.ValueType]): Boolean = customerHasNotTag.and(freshRegistration).test(record.f1)
}





object UndecidedRegistrationFilter extends Serializable {

  def apply(): UndecidedRegistrationFilter = new UndecidedRegistrationFilter()

}

