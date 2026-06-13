package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerDetail, PreJoin}
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple.{CustomerHasNoAffiliatesTag, FemaleGender}
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2

class FemaleBlockRegistrationFilter extends FilterFunction[Tuple2[PreJoin.KeyType, CustomerDetail.ValueType]]  {

  val femaleGender = FemaleGender()

  val customerHasNoAffiliateTag = CustomerHasNoAffiliatesTag()


  override def filter(record: Tuple2[PreJoin.KeyType, CustomerDetail.ValueType]): Boolean = femaleGender.and(customerHasNoAffiliateTag).test(record.f1)
}

object FemaleBlockRegistrationFilter extends Serializable {

  def apply(): FemaleBlockRegistrationFilter = new FemaleBlockRegistrationFilter()
}
