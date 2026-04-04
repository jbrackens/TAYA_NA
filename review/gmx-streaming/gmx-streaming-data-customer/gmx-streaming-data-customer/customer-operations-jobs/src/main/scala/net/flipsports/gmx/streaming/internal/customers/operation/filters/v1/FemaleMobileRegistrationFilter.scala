package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerDetail, PreJoin}
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.FemaleRegistrationCustomerVerifiedTagMapper
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple.{CustomerHasNoAffiliatesTag, CustomerHasTag, FemaleGender, RegistrationProductEquals}
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2

class FemaleMobileRegistrationFilter extends FilterFunction[Tuple2[PreJoin.KeyType, CustomerDetail.ValueType]]  {

  val femaleGender = FemaleGender()

  val mobileRegistration = RegistrationProductEquals.mobile()

  val customerHasAffiliateTag = CustomerHasNoAffiliatesTag().negate()

  val customerHasNotVerifiedTag = CustomerHasTag(FemaleRegistrationCustomerVerifiedTagMapper.tag).negate()

  override def filter(record: Tuple2[PreJoin.KeyType, CustomerDetail.ValueType]): Boolean =
    femaleGender
      .and(mobileRegistration)
      .and(customerHasAffiliateTag)
      .and(customerHasNotVerifiedTag)
      .test(record.f1)
}

object FemaleMobileRegistrationFilter extends Serializable {

  def apply(): FemaleMobileRegistrationFilter = new FemaleMobileRegistrationFilter()
}


