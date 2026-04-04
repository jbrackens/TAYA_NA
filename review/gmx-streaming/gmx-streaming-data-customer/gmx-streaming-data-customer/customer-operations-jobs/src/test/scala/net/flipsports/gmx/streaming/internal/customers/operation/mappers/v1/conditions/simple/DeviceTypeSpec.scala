package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.conditions.simple

import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerWithLoginDataProvider
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.DeviceType
import net.flipsports.gmx.streaming.tests.StreamingTestBase

class DeviceTypeSpec extends StreamingTestBase {

  val web = new DeviceTypeEquals(DeviceType.PersonalComputer)
  val mobile = new DeviceTypeEquals(DeviceType.Smartphone)

  "DeviceType" should {

    "equals true when deviceType is web and Customer deviceType is web" in {
      // given
      val customerSingle = CustomerWithLoginDataProvider.single
      customerSingle.f1.login
        .setDeviceType(DeviceType.PersonalComputer.toString)

      //then
      web.test(customerSingle.f1) shouldEqual true
    }

    "equals true when deviceType is smartphone and Customer deviceType is smartphone" in {
      // given
      val customerSingle = CustomerWithLoginDataProvider.single
      customerSingle.f1.login.setDeviceType(DeviceType.Smartphone.toString)

      //then
      mobile.test(customerSingle.f1) shouldEqual true
    }

    "equals false when deviceType is web and Customer deviceType is smartphone" in {
      // given
      val customerSingle = CustomerWithLoginDataProvider.single
      customerSingle.f1.login.setDeviceType(DeviceType.Smartphone.toString)

      //then
      web.test(customerSingle.f1) shouldEqual false
    }
  }
}
