package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1
import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerDetail, PreJoin}
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.FemaleRegistrationCustomerVerifiedTagMapper
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple.{AffiliatesEquals, CustomerHasTag, FemaleGender}
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2

import java.io.Serializable

class AffiliatesRegistrationFilter extends FilterFunction[Tuple2[PreJoin.KeyType, CustomerDetail.ValueType]]  {

  val femaleGender = FemaleGender()

  val affiliatesEquals = AffiliatesEquals.femalePreferredAffiliates()

  val customerHasNotTag = CustomerHasTag(FemaleRegistrationCustomerVerifiedTagMapper.tag).negate()

  override def filter(record: Tuple2[PreJoin.KeyType, CustomerDetail.ValueType]): Boolean = femaleGender.and(affiliatesEquals).and(customerHasNotTag).test(record.f1)
}


object AffiliatesRegistrationFilter extends Serializable {

  def apply(): AffiliatesRegistrationFilter = new AffiliatesRegistrationFilter()

}

