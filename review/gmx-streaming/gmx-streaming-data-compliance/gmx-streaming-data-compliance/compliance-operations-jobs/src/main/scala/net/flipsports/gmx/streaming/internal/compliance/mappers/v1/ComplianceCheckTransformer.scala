package net.flipsports.gmx.streaming.internal.compliance.mappers.v1

import java.time.Instant
import java.util.UUID

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.compliance.Types.{Compliance, WalletTransactions}
import net.flipsports.gmx.streaming.internal.compliance.dictionaries.OperationTrigger
import org.apache.flink.api.java.tuple.Tuple2

trait ComplianceCheckTransformer extends Serializable {

  def transform(record: WalletTransactions.ValueType, brand: Brand, operationTrigger: OperationTrigger): Tuple2[Compliance.KeyType, Compliance.ValueType] = {
    val walletTransaction: WalletTransactions.ValueType = record
    val customerId = transformKey(walletTransaction.getCustomerID.toString)
    val validationCheck = transformBaseValue(brand, operationTrigger)
    validationCheck.setExternalUserId(walletTransaction.getCustomerID.toString)
    record.setNotes(null) // requirement of Tom to clear notes.
    validationCheck.setSourceMessage(record.toString)
    new Tuple2(customerId, validationCheck)
  }

  def transformKey(externalCustomerId: String) = {
    val customerId = new Compliance.KeyType
    customerId.setExternalUserId(externalCustomerId)
    customerId
  }

  def transformBaseValue(brand: Brand, operationTrigger: OperationTrigger): Compliance.ValueType = {
    val validationCheck = new Compliance.ValueType()
    validationCheck.setUuid(UUID.randomUUID().toString)
    validationCheck.setCreatedDateUTC(Instant.now.toEpochMilli)
    validationCheck.setCompanyId(brand.sourceBrand.uuid)
    validationCheck.setOperationTrigger(operationTrigger.name)
    validationCheck
  }

}
