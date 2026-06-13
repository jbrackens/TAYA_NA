package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerStateChange
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.segments._
import org.apache.flink.api.common.functions.FlatMapFunction
import org.apache.flink.util.Collector
import org.apache.flink.api.java.tuple.Tuple2

sealed abstract class CustomerMapper[K, V](brand: Brand) extends FlatMapFunction[Tuple2[K, V], Tuple2[CustomerStateChange.KeyType, CustomerStateChange.ValueType]] {
  type ConditionalMapper = ConditionalMapFunction[K, V, CustomerStateChange.KeyType, CustomerStateChange.ValueType]

  def mappers(): Seq[ConditionalMapper]

  override def flatMap(value: Tuple2[K, V], out: Collector[Tuple2[CustomerStateChange.KeyType, CustomerStateChange.ValueType]]): Unit =
    mappers().foreach(addIfMatchCondition(_, value, out))

  private def addIfMatchCondition(source: ConditionalMapper, record: Tuple2[K, V], out: Collector[Tuple2[CustomerStateChange.KeyType, CustomerStateChange.ValueType]]): Unit =
    if (source.shouldExecute(record)) out.collect(source.map(record))
}


private class IrishCustomerMapper(brand: Brand) extends  CustomerMapper[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType](brand) {
  override def mappers(): Seq[ConditionalMapper] = Seq(
    new IrishRegistrationCustomerServiceManualTagMapper(brand),
    new IrishRegistrationCustomerAddressVerifiedFlagMapper(brand),
    new IrishRegistrationCustomerIdVerifiedFlagMapper(brand)
  )
}

private class CanadianCustomerMapper(brand: Brand) extends  CustomerMapper[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType](brand) {
  override def mappers(): Seq[ConditionalMapper] = Seq(new CanadianRegistrationCanadaTagMapper(brand))
}

private class FemaleCustomerMapper(brand: Brand) extends CustomerMapper[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType](brand) {
  override def mappers(): Seq[ConditionalMapper] = Seq(FemaleRegistrationCustomerVerifiedTagMapper(brand))
}

private class FemaleBlockCustomerMapper(brand: Brand) extends CustomerMapper[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType](brand) {
  override def mappers(): Seq[ConditionalMapper] = Seq(FemaleRegistrationBlockTagMapper(brand))
}

private class FemaleBlockExtensionCustomerMapper(brand: Brand) extends CustomerMapper[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType](brand) {
  override def mappers(): Seq[ConditionalMapper] = Seq(FemaleRegistrationBlockExtensionTagMapper(brand))
}

private class FemaleAffiliatesCustomerMapper(brand: Brand) extends CustomerMapper[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType](brand) {
  override def mappers(): Seq[ConditionalMapper] = Seq(FemaleAffiliatesRegistrationCustomerVerifiedTagMapper(brand))
}

private class UndecidedCustomerMapper(brand: Brand) extends CustomerMapper[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType](brand) {
  override def mappers(): Seq[ConditionalMapper] = Seq(UndecidedCustomerRegistrationMapper(brand))
}

private class HighValueCustomerMapper(brand: Brand) extends CustomerMapper[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType](brand) {
  override def mappers(): Seq[ConditionalMapper] = Seq(HighValueRegistrationTagMapper(brand)) ++ BaseSegmentMapper(brand)
}

private class NewSegmentCustomerMapper(brand: Brand) extends CustomerMapper[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType](brand) {
  override def mappers(): Seq[ConditionalMapper] = Seq(NewSegmentAccountRegistrationTagMapper(brand))
}

private class DummyPreJoinCustomerMapper(brand: Brand) extends CustomerMapper[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType](brand) {
  override def mappers(): Seq[ConditionalMapper] = Seq(DummyPreJoinCustomerConditionalMapper(brand))
}

private class DummyPreJoinLoginMapper(brand: Brand) extends CustomerMapper[Types.PreJoin.KeyType, Types.Logins.ValueType](brand) {
  override def mappers(): Seq[ConditionalMapper] = Seq(DummyPreJoinLoginConditionalMapper(brand))
}

private class DummyJoinedMapper(brand: Brand) extends CustomerMapper[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType](brand) {
  override def mappers(): Seq[ConditionalMapper] = Seq(DummyJoinCustomerConditionalMapper(brand))
}

object CustomerMapper {

  def irish(brand: Brand): CustomerMapper[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType] = new IrishCustomerMapper(brand)

  def canadian(brand: Brand): CustomerMapper[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType] = new CanadianCustomerMapper(brand)

  def female(brand: Brand): CustomerMapper[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType] = new FemaleCustomerMapper(brand)

  def femaleBlock(brand: Brand): CustomerMapper[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType] = new FemaleBlockCustomerMapper(brand)

  def femaleBlockExtension(brand: Brand): CustomerMapper[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType] = new FemaleBlockExtensionCustomerMapper(brand)

  def femaleAffiliates(brand: Brand): CustomerMapper[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType] = new FemaleAffiliatesCustomerMapper(brand)

  def undecided(brand: Brand): CustomerMapper[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType] = new UndecidedCustomerMapper(brand)

  def highValue(brand: Brand): CustomerMapper[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType] = new HighValueCustomerMapper(brand)

  def newSegment(brand: Brand): CustomerMapper[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType] = new NewSegmentCustomerMapper(brand)

  def dummyJoined(brand: Brand): CustomerMapper[Types.JoinedCustomerDetailWithLogins.KeyType, Types.JoinedCustomerDetailWithLogins.ValueType] = new DummyJoinedMapper(brand)

  def dummyPreJoinedCustomer(brand: Brand): CustomerMapper[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType] = new DummyPreJoinCustomerMapper(brand)

  def dummyPreJoinedLogin(brand: Brand): CustomerMapper[Types.PreJoin.KeyType, Types.Logins.ValueType] = new DummyPreJoinLoginMapper(brand)

}