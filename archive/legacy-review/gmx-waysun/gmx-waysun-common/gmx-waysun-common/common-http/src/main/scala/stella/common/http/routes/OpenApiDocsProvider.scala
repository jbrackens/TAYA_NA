package stella.common.http.routes

import sttp.tapir.docs.openapi.OpenAPIDocsInterpreter
import sttp.tapir.internal.IterableToListMap
import sttp.tapir.openapi.Server
import sttp.tapir.openapi.circe.yaml._

import stella.common.http.config.OpenApiConfig

class OpenApiDocsProvider(openApiConfig: OpenApiConfig) {

  def getOpenApiYaml(title: String, version: String, swaggerDefinition: SwaggerDefinition): String = {
    val servers = List(Server(openApiConfig.serverUrl))
    val openapi = OpenAPIDocsInterpreter().toOpenAPI(swaggerDefinition.endpoints, title, version).servers(servers)
    val sortedPathItems = openapi.paths.pathItems.toList.sortBy { case (path, _) =>
      path
    }.toListMap
    val sortedOpenapi = openapi.copy(
      components = openapi.components.map { component =>
        component.copy(schemas = component.schemas.toList.sortBy { case (name, _) =>
          name
        }.toListMap)
      },
      paths = openapi.paths.copy(pathItems = sortedPathItems))
    sortedOpenapi.toYaml
  }
}
