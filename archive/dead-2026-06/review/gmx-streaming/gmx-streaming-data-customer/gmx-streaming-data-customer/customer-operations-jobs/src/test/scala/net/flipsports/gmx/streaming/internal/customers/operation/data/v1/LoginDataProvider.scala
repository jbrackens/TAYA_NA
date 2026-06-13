package net.flipsports.gmx.streaming.internal.customers.operation.data.v1

import SBTech.Microservices.DataStreaming.DTO.Login.v1.LoginWrapper
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Logins
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Logins.{KeyType, ValueType}
import org.apache.flink.api.java.tuple.Tuple2


class LoginDataProvider(source: String) extends DataProvider[Tuple2[Logins.KeyType, Logins.ValueType]] {

  val externalUserId = 11272172

  override def sourceFile: String = source

  override def fromJson(json: String): Seq[Tuple2[KeyType, ValueType]] = LoginWrapper.fromJsonList(json).map(i => new Tuple2(new KeyType(i.getCustomerID), i))

}

object LoginDataProvider {

  def apply() = applyOrDefault(None)

  def apply(source: String) = applyOrDefault(Some(source))

  def applyOrDefault(source: Option[String]) = new LoginDataProvider(source.getOrElse("logins.json"))

  def asScalaAllByCreationDate(source: Option[String] = None) = applyOrDefault(source).all.map(element => (element.f0, element.f1)).sortBy(_._2.getMessageCreationDate)

}