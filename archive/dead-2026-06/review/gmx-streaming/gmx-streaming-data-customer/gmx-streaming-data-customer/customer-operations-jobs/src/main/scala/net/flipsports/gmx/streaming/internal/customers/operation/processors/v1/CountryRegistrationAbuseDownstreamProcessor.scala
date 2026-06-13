package net.flipsports.gmx.streaming.internal.customers.operation.processors.v1

import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.CountryCode
import net.flipsports.gmx.streaming.internal.customers.operation.operation._
import net.flipsports.gmx.streaming.internal.customers.operation.split.OutputTags
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.functions.ProcessFunction
import org.apache.flink.util.Collector

class CountryRegistrationAbuseDownstreamProcessor extends ProcessFunction[Tuple2[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType], Tuple2[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType]] {
  override def processElement(record: Tuple2[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType], ctx: ProcessFunction[Tuple2[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType], Tuple2[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType]]#Context, out: Collector[Tuple2[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType]]): Unit = {
    val customerWithLogin = record.f1
    checkIfCustomerCountryMatchesWithLogin(customerWithLogin) match {
      case (true, Some(CountryCode.Default)) => ctx.output(OutputTags.registrationAbuse, record)
      case (true, _) => out.collect(record)
      case (false, _) => ctx.output(OutputTags.registrationAbuse, record)
    }
  }


  def checkIfCustomerCountryMatchesWithLogin(customerWithLoginDetail: Types.JoinedCustomerDetailWithLogins.ValueType): (Boolean, Option[CountryCode]) = {
    val customerDetail = customerWithLoginDetail.customerDetail
    val loginDetail = customerWithLoginDetail.login

    val customerDetailCountry = CountryCode.code(customerDetail.getCountryCode)
    val loginCountry = CountryCode.name(loginDetail.getCountry)

    if (customerDetailCountry == loginCountry) {
      (true, Some(customerDetailCountry))
    } else {
      (false, None)
    }
  }
}
