package gmx.widget.siteextentions

import scala.jdk.CollectionConverters.asScalaIteratorConverter

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.ObjectNode

package object tools {

  implicit class JsonNodeOps(node: JsonNode) {
    def hasNestedNode(path: String): Boolean = !getNestedNodeByPath(path).isMissingNode

    def getNestedNodeByPath(path: String): JsonNode = {
      val pathParts = path.split("\\.")
      pathParts.foldLeft(node) {
        case (node, pathPart) =>
          node.path(pathPart)
      }
    }
  }

  implicit class ArrayNodeOps(arrayNode: JsonNode) {
    def getArrayElements: List[JsonNode] = arrayNode.iterator().asScala.toList
  }

  implicit class ObjectNodeOps(objectNode: ObjectNode) {
    def getFieldsMap: Map[String, JsonNode] =
      objectNode.fields().asScala.map(entry => (entry.getKey, entry.getValue)).toMap
  }
}
