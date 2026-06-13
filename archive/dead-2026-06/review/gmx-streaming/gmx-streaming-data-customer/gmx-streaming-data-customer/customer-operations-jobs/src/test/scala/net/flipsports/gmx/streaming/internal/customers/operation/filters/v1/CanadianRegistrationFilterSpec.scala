package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerDetailsDataProvider
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.CountryCode
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.dto.CustomerWithLogin
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.apache.flink.api.java.tuple.Tuple2

class CanadianRegistrationFilterSpec extends StreamingTestBase {


  val filter = CanadianRegistrationFilter()

  "match for canada user" in {
    // given
    val source = CustomerDetailsDataProvider().single
    val canadian = CustomerDetailsDataProvider().single
    canadian.f1.setCountryCode(CountryCode.Canada.toString)

    // when
    filter.filter(new Tuple2(source.f1.getCustomerID, new CustomerWithLogin(source.f1, null))) shouldEqual false
    filter.filter(new Tuple2(canadian.f1.getCustomerID, new CustomerWithLogin(canadian.f1, null))) shouldEqual true

  }
}
