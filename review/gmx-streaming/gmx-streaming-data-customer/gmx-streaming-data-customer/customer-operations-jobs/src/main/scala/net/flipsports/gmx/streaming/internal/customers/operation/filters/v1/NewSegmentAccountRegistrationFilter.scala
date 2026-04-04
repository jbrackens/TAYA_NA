package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.Types.JoinedCustomerDetailWithLogins.{KeyType, ValueType}
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple._
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2

class NewSegmentAccountRegistrationFilter(brand: Brand) extends FilterFunction[Tuple2[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType]] {

  val customerRegisteredViaWeb = DeviceTypeEquals.personalComputerRegistration()

  val maleGender = FemaleGender().negate()

  val customerHasGmail = EmailEquals.gmail()

  val affiliatesNewSegmentEquals = AffiliatesEquals.newSegmentAffiliates()

  val affiliatesNoTag = CustomerHasNoAffiliatesTag()

  override def filter(record: Tuple2[KeyType, ValueType]): Boolean = {
    val webAndGenderFilter = customerRegisteredViaWeb.test(record.f1) && maleGender
      .test(record.f1.customerDetail)

    val sportNationFilters = customerHasGmail
      .and(affiliatesNewSegmentEquals.or(affiliatesNoTag))
      .test(record.f1.customerDetail)

    val fansBetUkFilters = affiliatesNoTag.test(record.f1.customerDetail)

    brand match {
      case Brand.sportNations => webAndGenderFilter && sportNationFilters
      case Brand.fansbetUk    => webAndGenderFilter && fansBetUkFilters
      case Brand(_)           => false
    }

  }
}

object NewSegmentAccountRegistrationFilter extends Serializable {

  def apply(brand: Brand): NewSegmentAccountRegistrationFilter =
    new NewSegmentAccountRegistrationFilter(brand)

}
