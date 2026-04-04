package net.flipsports.gmx.streaming.internal.customers.operation.filters.v1

import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple.RegistrationDateIsAfter
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2


class CustomerStateChangeFilter(registrationDateFilter: RegistrationDateIsAfter)
  extends InputOutputFilter[Tuple2[Types.CustomerDetail.KeyType, Types.CustomerDetail.ValueType], Tuple2[Types.CustomerStateChange.KeyType, Types.CustomerStateChange.ValueType]]
    with Serializable {

  def input: FilterFunction[Types.CustomerDetail.Source] = customer => registrationDateFilter.test(customer.f1)

  def output: FilterFunction[Types.CustomerStateChange.Source] = new InputOutputFilter.TrueFilter

}

object CustomerStateChangeFilter {

  def apply(): CustomerStateChangeFilter = new CustomerStateChangeFilter(RegistrationDateIsAfter.isRegistrationYoungerThan12Hours())

  def apply(registrationDateFilter: RegistrationDateIsAfter): CustomerStateChangeFilter = new CustomerStateChangeFilter(registrationDateFilter)
}