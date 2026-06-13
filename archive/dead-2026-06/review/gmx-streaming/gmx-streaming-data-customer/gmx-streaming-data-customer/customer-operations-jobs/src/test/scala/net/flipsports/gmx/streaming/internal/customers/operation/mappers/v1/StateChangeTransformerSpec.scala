package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import net.flipsports.gmx.dataapi.internal.customers.operations.ActionType
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerDetailsDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class StateChangeTransformerSpec extends StreamingTestBase {

  protected class Mapper extends StateChangeTransformer {
    override def transformPayload(): String = ""
    override def operationTrigger(): String = ""
  }

  "State change transformer" should {

    "Transform customer details into state change" in {
      // given
      val source = CustomerDetailsDataProvider().single
      val brand = Brand.redZone
      // when
      val result = new Mapper().transform(source.f1, brand, ActionType.FLAG)

      // then
      result.f0.getExternalUserId.toString shouldEqual(source.f0.getCustomerID.toString)
      val stateChange = result.f1
      stateChange.getCompanyId.toString shouldEqual(brand.sourceBrand.uuid)
      stateChange.getEmail.toString shouldEqual ("sample@email.flipsports")
      stateChange.getExternalUserId.toString shouldEqual(source.f0.getCustomerID.toString)

    }

  }
}
