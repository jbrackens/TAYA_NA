package phoenix

import scala.concurrent.Future

import org.scalatest.concurrent.IntegrationPatience
import org.scalatest.concurrent.ScalaFutures

trait AsyncSupport extends ScalaFutures with IntegrationPatience {

  override def spanScaleFactor: Double = System.getProperty("akka.test.timeFactor", "1.0").toDoubleOption.getOrElse(1.0)

  def await[T](f: Future[T]): T = whenReady(f)(identity)

}
