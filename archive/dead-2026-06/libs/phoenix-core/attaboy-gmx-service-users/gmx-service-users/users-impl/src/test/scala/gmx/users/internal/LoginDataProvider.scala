package gmx.users.internal

import SBTech.Microservices.DataStreaming.DTO.Login.v1.{ Login, LoginJWrapper }
import gmx.common.internal.scala.test.FileDataProvider

import scala.jdk.CollectionConverters._

class LoginDataProvider(source: String) extends FileDataProvider[Login] {

  override protected def sourceFile: String = source

  override protected def fromJson(json: String): Seq[Login] =
    new LoginJWrapper().fromJsonList(json).asScala.toSeq

}
