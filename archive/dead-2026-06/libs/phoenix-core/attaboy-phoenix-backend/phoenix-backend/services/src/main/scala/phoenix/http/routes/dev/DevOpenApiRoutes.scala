package phoenix.http.routes.dev

import java.util.Properties

import scala.collection.immutable.ListMap
import scala.math.Ordering

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Directives.complete
import akka.http.scaladsl.server.Directives.getFromResourceDirectory
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.StandardRoute
import sttp.tapir.AnyEndpoint
import sttp.tapir.docs.openapi._
import sttp.tapir.openapi.Server
import sttp.tapir.openapi.circe.yaml._

class DevOpenApiRoutes(implicit system: ActorSystem[_]) {

  private val config = OpenApiConfig.of(system)

  def redirectToSwaggerUiIndex(yamlName: String): Route = {
    StandardRoute(requestContext => {
      val queryParams = Map(
        "url" -> s"${config.docsRelativeUrl}/$yamlName",
        "defaultModelRendering" -> "model",
        "displayRequestDuration" -> "true",
        "validatorUrl" -> "none").map { case (k, v) => s"$k=$v" }.mkString("&")

      val redirectUri = s"${config.docsRelativeUrl}/index.html?$queryParams"

      requestContext.redirect(redirectUri, StatusCodes.MovedPermanently)
    })
  }

  def getOpenApiYaml(endpoints: Seq[AnyEndpoint]): Route = {
    val openapi = OpenAPIDocsInterpreter().toOpenAPI(endpoints, "Phoenix Backend", "1.0")
    val sortedOpenapi = openapi.copy(
      components = openapi.components.map { component =>
        component
          .copy(schemas = component.schemas.withSortedKeys, securitySchemes = component.securitySchemes.withSortedKeys)
      },
      paths = openapi.paths.copy(pathItems = openapi.paths.pathItems.withSortedKeys))

    val servers = List(Server(config.apiBaseUrl))
    complete(sortedOpenapi.servers(servers).toYaml)
  }

  private lazy val swaggerUiVersion = {
    val p = new Properties()
    val pomProperties = getClass.getResourceAsStream("/META-INF/maven/org.webjars/swagger-ui/pom.properties")
    try {
      p.load(pomProperties)
    } finally {
      pomProperties.close()
    }
    p.getProperty("version")
  }

  def getSwaggerUiResource: Route = {
    getFromResourceDirectory(s"META-INF/resources/webjars/swagger-ui/$swaggerUiVersion/")
  }

  private implicit class ListMapOps[K, V](self: ListMap[K, V]) {
    def withSortedKeys(implicit ord: Ordering[K]): ListMap[K, V] =
      ListMap.from(self.toList.sortBy { case (key, _) => key })
  }
}
