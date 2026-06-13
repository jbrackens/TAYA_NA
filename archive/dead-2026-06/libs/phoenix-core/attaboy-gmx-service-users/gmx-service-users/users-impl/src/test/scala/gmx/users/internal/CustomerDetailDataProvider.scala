package gmx.users.internal

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.{ CustomerDetail, CustomerDetailJWrapper }
import gmx.common.internal.scala.test.FileDataProvider

import scala.jdk.CollectionConverters._

class CustomerDetailDataProvider(source: String) extends FileDataProvider[CustomerDetail] {

  override protected def sourceFile: String = source

  override protected def fromJson(json: String): Seq[CustomerDetail] =
    /* We should use scala Wrapper available in data-api: CustomerDetailWrapper.fromJsonList(json)
     * But because of scala 2.12 vs 2.13 collection changes it throws
     * java.lang.NoSuchMethodError: ...CustomerDetailWrapper$.fromJsonList(Ljava/lang/String;)Lscala/collection/immutable/Seq;
     */
    new CustomerDetailJWrapper().fromJsonList(json).asScala.toSeq

}
