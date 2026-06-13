package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerDetail, PreJoin}
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.FemaleRegistrationCustomerVerifiedTagMapper
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple.{CustomerHasTag, FemaleGender, RegistrationProductEquals}
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2

class FemaleMobileCasinoRegistrationFilter extends FilterFunction[Tuple2[PreJoin.KeyType, CustomerDetail.ValueType]]  {

  val femaleGender = FemaleGender()

  val mobileCasinoRegistration = RegistrationProductEquals.mobileCasino()

  val customerHasNotTag = CustomerHasTag(FemaleRegistrationCustomerVerifiedTagMapper.tag).negate()

  override def filter(record: Tuple2[PreJoin.KeyType, CustomerDetail.ValueType]): Boolean = femaleGender.and(mobileCasinoRegistration).and(customerHasNotTag).test(record.f1)
}

object FemaleMobileCasinoRegistrationFilter extends Serializable {

  def apply(): FemaleMobileCasinoRegistrationFilter = new FemaleMobileCasinoRegistrationFilter()
}

