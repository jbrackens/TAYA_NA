package net.flipsports.gmx.streaming.internal.compliance.mappers.v1

import net.flipsports.gmx.streaming.internal.compliance.data.v1.WalletTransactionDataProvider
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.compliance.dictionaries.OperationTrigger
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class ComplianceCheckTransformerSpec extends StreamingTestBase {

  protected class Mapper extends ComplianceCheckTransformer {
  }

  "State change transformer" should {

    "Transform customer details into state change" in {
      // given
      val source = WalletTransactionDataProvider.single
      val brand = Brand.redZone
      // when
      val result = new Mapper().transform(source.f1, brand, OperationTrigger.DepositChange)

      // then
      result.f0.getExternalUserId.toString shouldEqual(source.f0.getCustomerID.toString)
      val check = result.f1
      check.getCompanyId.toString shouldEqual(brand.sourceBrand.uuid)
      check.getExternalUserId.toString shouldEqual(source.f0.getCustomerID.toString)

    }

  }
}
