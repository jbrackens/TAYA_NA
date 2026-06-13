package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import java.util

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerWithLoginDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.apache.flink.api.common.functions.util.ListCollector
import org.apache.flink.util.Collector
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class HighValueCustomerMapperSpec extends StreamingTestBase {

  val mapper = CustomerMapper.highValue(Brand.redZone)


  "Mapper" should {


    "Generate multiple tags for customer" in {
      // given
      val customers = "bugs/highvalue/customerdetails.json"
      val logins = "bugs/highvalue/logins.json"
      val source = CustomerWithLoginDataProvider.asScalaAllWithCurrentRegistration(Some(customers), Some(logins))(0)
      val result = new util.ArrayList[Types.CustomerStateChange.Source]();
      val collector: Collector[Types.CustomerStateChange.Source] = new ListCollector(result)

      // when
      mapper.flatMap(source, collector)

      // then

      result.size() mustBe 3

    }


  }
}
