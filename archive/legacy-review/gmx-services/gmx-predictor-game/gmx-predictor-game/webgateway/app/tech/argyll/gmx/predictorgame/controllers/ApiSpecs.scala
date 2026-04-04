package tech.argyll.gmx.predictorgame.controllers

import com.iheart.playSwagger.SwaggerSpecGenerator
import javax.inject._
import play.api.mvc._

@Singleton
class ApiSpecs @Inject()() extends InjectedController {

  def generate = {
    implicit val cl = getClass.getClassLoader

    val domainPackage = "tech.argyll.gmx.predictorgame"
    val generator = SwaggerSpecGenerator(true, domainPackage)

    //it would be beneficial to cache this endpoint as we do here, but it's not required if you don't expect much traffic.
    //      def specs = cached("swaggerDef") {
    Action { _ ⇒
      Ok(generator.generate().map(_.toString()).get)
    }
  }
}