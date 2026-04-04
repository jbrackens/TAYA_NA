package net.flipsports.gmx.streaming.internal.customers.operation.watermarks

import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail.{KeyType, ValueType}
import net.flipsports.gmx.streaming.internal.customers.operation.configs.Constants
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.DateFormats
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.functions.AssignerWithPeriodicWatermarks
import org.apache.flink.streaming.api.watermark.Watermark

private class CustomerDetailMessageCreationDateAssigner extends AssignerWithPeriodicWatermarks[Tuple2[CustomerDetail.KeyType, CustomerDetail.ValueType]]() {


  override def getCurrentWatermark(): Watermark = new Watermark(DateFormats.nowEpochInMiliAtUtc() - Constants.watermarkMaxLag)

  override def extractTimestamp(element: Tuple2[KeyType, ValueType], previousElementTimestamp: Long): Long =  element.f1.getMessageCreationDate
}


object CustomerDetailMessageCreationDateAssigner {

  def apply(): AssignerWithPeriodicWatermarks[Tuple2[CustomerDetail.KeyType, CustomerDetail.ValueType]] = new CustomerDetailMessageCreationDateAssigner()

}


