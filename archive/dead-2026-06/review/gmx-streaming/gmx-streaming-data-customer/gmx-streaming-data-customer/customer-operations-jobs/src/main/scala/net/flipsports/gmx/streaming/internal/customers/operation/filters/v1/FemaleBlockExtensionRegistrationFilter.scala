package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.Types.JoinedCustomerDetailWithLogins.{KeyType, ValueType}
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple.{AffiliatesEquals, DeviceTypeEquals, FemaleGender}
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2

class FemaleBlockExtensionRegistrationFilter
  extends FilterFunction[Tuple2[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType]] {

  val femaleGender = FemaleGender()

  val customerRegisteredViaWeb = DeviceTypeEquals.personalComputerRegistration()

  val specialAffiliatesEquals = AffiliatesEquals.specialAffiliates()

  override def filter(record: Tuple2[KeyType, ValueType]): Boolean = {

    femaleGender.and(specialAffiliatesEquals).test(record.f1.customerDetail) && customerRegisteredViaWeb.test(record.f1)
  }
}

object FemaleBlockExtensionRegistrationFilter extends Serializable {

  def apply(): FemaleBlockExtensionRegistrationFilter = new FemaleBlockExtensionRegistrationFilter()
}
