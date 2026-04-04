package gmx.widget.siteextentions.tools

import scala.jdk.CollectionConverters.asScalaIteratorConverter

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.ArrayNode
import com.fasterxml.jackson.databind.node.ObjectNode
import com.fasterxml.jackson.databind.node.ValueNode

sealed trait ValidationError {
  def path: String

  def validationErrorMessage: String = s"Validation error at path '$path': $details"

  protected def details: String
}

object ValidationError {

  final case class DifferentArrayLengths(path: String, arrayA: ArrayNode, arrayB: ArrayNode) extends ValidationError {
    override protected def details: String =
      s"""Different array lengths
         | Array A with size ${arrayA.size()}: $arrayA
         | Array B with size ${arrayB.size()}: $arrayB
         |""".stripMargin
  }

  final case class DifferentArrayElementIdentifiers(
      identifierName: String,
      path: String,
      arrayA: ArrayNode,
      arrayB: ArrayNode)
      extends ValidationError {
    override protected def details: String = {
      val identifiersA = arrayA.getArrayElements.map(_.getNestedNodeByPath(identifierName))
      val identifiersB = arrayB.getArrayElements.map(_.getNestedNodeByPath(identifierName))
      val notInB = identifiersA.diff(identifiersB).sortBy(_.toString)
      val notInA = identifiersB.diff(identifiersA).sortBy(_.toString)
      s"""Different '$identifierName' identifiers of array elements
         | Array A: $arrayA
         | has ${identifiersA.length} identifiers: ${identifiersA.mkString(", ")}
         | (${notInB.length} identifiers not in B: ${notInB.mkString(", ")})
         | Array B: $arrayB
         | has ${identifiersB.length} identifiers: ${identifiersB.mkString(", ")}
         | (${notInA.length} identifiers not in A: ${notInA.mkString(", ")})
         |""".stripMargin
    }
  }

  final case class DifferentFields(path: String, objectA: ObjectNode, objectB: ObjectNode) extends ValidationError {
    override protected def details: String = {
      val fieldNamesA = objectA.fieldNames().asScala.toList.sorted
      val fieldNamesB = objectB.fieldNames().asScala.toList.sorted
      val notInB = fieldNamesA.diff(fieldNamesB)
      val notInA = fieldNamesB.diff(fieldNamesA)
      s"""Different fields:
         | Object A: $objectA
         | has ${objectA.size()} fields: ${fieldNamesA.mkString(", ")}
         | (${notInB.length} fields non-existing in B: ${notInB.mkString(", ")})
         | Object B: $objectB
         | has ${objectB.size()} fields: ${fieldNamesB.mkString(", ")}
         | (${notInA.length} fields non-existing in A: ${notInA.mkString(", ")})
         |""".stripMargin
    }
  }

  final case class MissingAValue(path: String, nodeB: JsonNode) extends ValidationError {
    override protected def details: String =
      s"""Missing node A
         | Node B: $nodeB
         |""".stripMargin
  }

  object MissingAValue {
    def apply(mapEntry: (String, JsonNode)): MissingAValue = MissingAValue(mapEntry._1, mapEntry._2)
  }

  final case class MissingBValue(path: String, nodeA: JsonNode) extends ValidationError {
    override protected def details: String =
      s"""Missing node B
         | Node A: $nodeA
         |""".stripMargin
  }

  object MissingBValue {
    def apply(mapEntry: (String, JsonNode)): MissingBValue = MissingBValue(mapEntry._1, mapEntry._2)
  }

  final case class DifferentNodeTypes(path: String, nodeA: JsonNode, nodeB: JsonNode) extends ValidationError {
    override protected def details: String =
      s"""Different node types for the same path
         | Node A is ${nodeA.getClass.getSimpleName}: $nodeA
         | Node B is ${nodeB.getClass.getSimpleName}: $nodeB
         |""".stripMargin
  }

  final case class DifferentValueNodes(path: String, valueA: ValueNode, valueB: ValueNode) extends ValidationError {
    override protected def details: String =
      s"""Values for the same path are different
         | Node A: $valueA
         | Node B: $valueB
         |""".stripMargin
  }
}
