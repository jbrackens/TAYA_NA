package net.flipsports.gmx.streaming.internal.customers.operation.udf

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerStateChange.{KeyType, PayloadType, ValueType}
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple.RegistrationDateIsAfter
import net.flipsports.gmx.streaming.internal.customers.operation.operation._
import net.flipsports.gmx.streaming.internal.customers.operation.udf.dto.ValuesInDate
import org.apache.flink.api.common.functions.RichFlatMapFunction
import org.apache.flink.api.common.state.{MapState, MapStateDescriptor}
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.configuration.Configuration
import org.apache.flink.util.Collector
import org.apache.flink.api.common.state.StateTtlConfig
import org.apache.flink.api.common.time.Time

class CustomerStateChangeDeduplicationFunction extends RichFlatMapFunction[Tuple2[Types.CustomerStateChange.KeyType, Types.CustomerStateChange.ValueType], Tuple2[Types.CustomerStateChange.KeyType, Types.CustomerStateChange.ValueType]]
  with LazyLogging {

  type Record = Tuple2[KeyType, ValueType]

  val retentionHours = RegistrationDateIsAfter.retentionHours

  val keyTypeInformation: TypeInformation[String] = TypeInformation.of(classOf[String])

  val valueTypeInformation: TypeInformation[ValuesInDate] = TypeInformation.of(classOf[ValuesInDate])

  val timeToLiveConfiguration = StateTtlConfig
    .newBuilder(Time.hours(retentionHours))
    .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
    .setStateVisibility(StateTtlConfig.StateVisibility.NeverReturnExpired)
    .cleanupIncrementally(10, true)
    .build

  @transient
  private var customerInDay: MapState[String, ValuesInDate] = _

  override def open(parameters: Configuration): Unit = {
    super.open(parameters)
    val stateDescriptor = new MapStateDescriptor[String, ValuesInDate]("customer-in-date", keyTypeInformation, valueTypeInformation)
    stateDescriptor.enableTimeToLive(timeToLiveConfiguration)
    customerInDay = getRuntimeContext.getMapState(stateDescriptor)
  }

  override def flatMap(value: Record, out: Collector[Record]): Unit = {
    logger.debug(s"Deduplication of customer ${value.f0.getExternalUserId.toString}")
    val customerId = value.f0.getExternalUserId
    val customerTags = getCustomerCachedTags(customerId)
    val exactValue = value.f1.getPayload.asInstanceOf[PayloadType]
    val exactOperation = value.f1.getAction
    val actionWithValue = s"${exactOperation.name()}-${exactValue.getValue}"
    val wasSend = customerTags.containsValue(actionWithValue)
    val customerTagsState = customerTags.withValue(actionWithValue, value.f1.getCreatedDateUTC)
    customerInDay.put(customerId, customerTagsState)
    collectIfWasNotSend(wasSend, out, value)
  }

  def collectIfWasNotSend(wasSend: Boolean, out: Collector[Record], value: Record): Unit =
    if (!wasSend) out.collect(value)


  private def getCustomerCachedTags(customerId: String): ValuesInDate =
    customerInDay.contains(customerId) match {
      case true => customerInDay.get(customerId)
      case _ => ValuesInDate()
    }
}

object CustomerStateChangeDeduplicationFunction {

  def apply(): CustomerStateChangeDeduplicationFunction = new CustomerStateChangeDeduplicationFunction()

}