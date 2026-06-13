package net.flipsports.gmx.streaming.internal.compliance.mappers.v1

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.compliance.Types
import Types.Compliance
import org.apache.flink.api.common.functions.{FlatMapFunction, MapFunction}
import org.apache.flink.util.Collector
import org.apache.flink.api.java.tuple.Tuple2

sealed abstract class MapperFactory[K, V, TK, TV](brand: Brand) extends FlatMapFunction[Tuple2[K, V], Tuple2[TK, TV]] {
  type ConditionalMapper = ConditionalMapFunction[K, V, TK, TV]

  def mappers(): Seq[ConditionalMapper]

  override def flatMap(value: Tuple2[K, V], out: Collector[Tuple2[TK, TV]]): Unit =
    mappers().foreach(addIfMatchCondition(_, value, out))

  private def addIfMatchCondition(source: ConditionalMapper, record: Tuple2[K, V], out: Collector[Tuple2[TK, TV]]): Unit =
    if (source.shouldExecute(record)) out.collect(source.map(record))
}



private class DepositChangeMapperFactory(brand: Brand) extends MapperFactory[Types.WalletTransactions.KeyType, Types.WalletTransactions.ValueType, Compliance.KeyType, Compliance.ValueType](brand) {
  override def mappers(): Seq[ConditionalMapper] = Seq(DepositChangeCustomerVerifiedTagMapper(brand))
}

object MapperFactory {

  def depositChange(brand: Brand): FlatMapFunction[Types.WalletTransactions.Source, Types.Compliance.Source] = new DepositChangeMapperFactory(brand)

  def depositAction(brand: Brand): MapFunction[Types.WalletTransactions.Source, Types.DepositAction.Source] = DepositActionCustomerMapper(brand)
}