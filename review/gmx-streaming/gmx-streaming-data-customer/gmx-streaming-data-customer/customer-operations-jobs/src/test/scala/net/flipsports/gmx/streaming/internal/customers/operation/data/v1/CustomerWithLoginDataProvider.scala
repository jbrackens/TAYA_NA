package net.flipsports.gmx.streaming.internal.customers.operation.data.v1

import java.time.Instant

import net.flipsports.gmx.streaming.internal.customers.operation.Types.JoinedCustomerDetailWithLogins
import net.flipsports.gmx.streaming.internal.customers.operation.dictionaries.CountryCode
import net.flipsports.gmx.streaming.internal.customers.operation.operation._
import org.apache.flink.api.java.tuple.Tuple2

object CustomerWithLoginDataProvider extends DataProvider[Tuple2[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType]] {
  def findCountry(code: CountryCode) = all.find(item => {
    code.codeMatch(item.f1.customerDetail.getCountryCode)
  })

  val externalUserId = 11272172

  def customerDetailsProvider(source: Option[String]) = CustomerDetailsDataProvider.applyOrDefault(source).all

  def loginsDataProvider(source: Option[String]) = LoginDataProvider.applyOrDefault(source).all

  override def sourceFile: String = throw new NotImplementedError()

  override def all: Seq[Tuple2[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType]] =
    all(None, None)

  def all(customers: Option[String], logins: Option[String]): Seq[Tuple2[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType]] =
    customerDetailsProvider(customers).flatMap(customer => {
    loginsDataProvider(logins)
      .find(_.f0.getCustomerID == customer.f0.getCustomerID)
      .map(login => new Tuple2(customer.f0.getCustomerID, new JoinedCustomerDetailWithLogins.ValueType(customer.f1, login.f1)))
  })

  def asScalaAllWithCurrentRegistration(customers: Option[String] = None, logins: Option[String] = None):Seq[Tuple2[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType]] =
    all(customers, logins).map(r => {
    r.f1.customerDetail.setRegistrationDate(Instant.now().toEpochMilli)
    r
  })

  override def fromJson(json: String): Seq[Tuple2[JoinedCustomerDetailWithLogins.KeyType, JoinedCustomerDetailWithLogins.ValueType]] = throw new NotImplementedError()
}
