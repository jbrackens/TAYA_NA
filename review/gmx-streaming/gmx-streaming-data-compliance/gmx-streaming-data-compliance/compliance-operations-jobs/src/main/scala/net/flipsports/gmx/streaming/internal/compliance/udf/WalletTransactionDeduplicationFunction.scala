package net.flipsports.gmx.streaming.internal.compliance.udf

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.compliance.{Implicits, Types}
import net.flipsports.gmx.streaming.internal.compliance.Types.WalletTransactions.Source
import net.flipsports.gmx.streaming.internal.compliance.mappers.v1.MapperFactory
import org.apache.flink.api.common.functions.RichFlatMapFunction
import org.apache.flink.api.common.state.{MapState, MapStateDescriptor, StateTtlConfig}
import org.apache.flink.api.common.time.Time
import org.apache.flink.configuration.Configuration
import org.apache.flink.util.Collector

class WalletTransactionDeduplicationFunction(brand: Brand) extends RichFlatMapFunction[Types.WalletTransactions.Source, Types.WalletTransactions.Source]
  with LazyLogging {


  type Record = Types.DepositAction.ValueType

  val retention = 10

  val mapper = MapperFactory.depositAction(brand)

  val timeToLiveConfiguration = StateTtlConfig
    .newBuilder(Time.minutes(retention))
    .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
    .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
    .cleanupIncrementally(10, true)
    .build

  override def open(parameters: Configuration): Unit = {
    super.open(parameters)
    val stateDescriptor = new MapStateDescriptor[String, Record]("customer-deposits-cache", Implicits.DepositAction.key, Implicits.DepositAction.value)
    stateDescriptor.enableTimeToLive(timeToLiveConfiguration)
    depositActions = getRuntimeContext.getMapState(stateDescriptor)
  }

  @transient
  private var depositActions: MapState[String, Record] = _

  override def flatMap(value: Source, out: Collector[Source]): Unit = {
    val candidate: Types.DepositAction.Source = mapper.map(value)

    val storageKey = candidate.f0.key()
    val cached: Option[Record] = depositActions.contains(storageKey) match {
      case true => Some(depositActions.get(storageKey))
      case _ => None
    }

    if (shouldSkip(value.f1, candidate.f1, cached)) {
      logger.info(s"Hash equals. Performing deduplication ${candidate.f0} - ${candidate.f1}")
    } else {
      depositActions.put(storageKey, candidate.f1)
      out.collect(value)
    }
  }

  def shouldSkip(raw: Types.WalletTransactions.ValueType, candidate: Record, cachedCandidate: Option[Record]): Boolean = cachedCandidate match {
    case Some(cached) =>
      if (cached.time > raw.getMessageCreationDate) {
        true
      } else {
        cached.actionHash.equalsIgnoreCase(candidate.actionHash)
      }
    case None => false
  }
}


object WalletTransactionDeduplicationFunction {

  def apply(brand: Brand): RichFlatMapFunction[Types.WalletTransactions.Source, Types.WalletTransactions.Source] =
    new WalletTransactionDeduplicationFunction(brand)

}