package gmx.widget.siteextentions.tools

import scala.annotation.tailrec

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.ArrayNode
import com.fasterxml.jackson.databind.node.ObjectNode
import com.fasterxml.jackson.databind.node.ValueNode
import com.stephenn.scalatest.jsonassert.JsonMatchers
import org.scalatest.matchers.should.Matchers

import gmx.widget.siteextentions.tools.ValidationError._

/**
 * @param arrayPathsToObjectIdPaths Map of array path (with [*] instead of a particular index) -> path of array
 *                                  element's id. Allows to distinguish and choose array elements to compare if there
 *                                  are gaps (some elements missing) or different order of elements.
 */
class JsonComparator(arrayPathsToObjectIdPaths: Map[String, String]) extends Matchers with JsonMatchers {

  private val possibleReportedArrayIndicesPatterns =
    List("""\[\d+A\|\d+B]""", """\[\d+A]""", """\[\d+B]""", """\[\d+]""")

  def compareJsonNodes(jsonA: JsonNode, jsonB: JsonNode): List[ValidationError] = {
    @tailrec
    def compareNested(
        nodesA: Map[String, JsonNode],
        nodesB: Map[String, JsonNode],
        errors: List[ValidationError]): List[ValidationError] = {
      if (nodesA == nodesB) errors
      else if (nodesA.isEmpty) errors ++ nodesB.map(MissingAValue.apply)
      else {
        val (path, nodeA) = nodesA.head
        val resultForNextLoop = nodesB.get(path) match {
          case Some(nodeB) if nodeA == nodeB => ResultForNextLoop.empty
          case Some(nodeB)                   => compareJsonTypeAware(path, nodeA, nodeB)
          case None                          => ResultForNextLoop.withNewErrorAndNoNewNodes(MissingBValue(path, nodeA))
        }
        val newNodesA = nodesA ++ resultForNextLoop.newNestedNodesA - path
        val newNodesB = nodesB ++ resultForNextLoop.newNestedNodesB - path
        val errorsSoFar = errors ++ resultForNextLoop.newErrors
        compareNested(newNodesA, newNodesB, errorsSoFar)
      }
    }

    def compareJsonTypeAware(path: String, nodeA: JsonNode, nodeB: JsonNode): ResultForNextLoop =
      (nodeA, nodeB) match {
        case (arrayA: ArrayNode, arrayB: ArrayNode) =>
          compareArrayNodes(path, arrayA, arrayB)
        case (objectA: ObjectNode, objectB: ObjectNode) =>
          compareObjectNodes(path, objectA, objectB)
        case (valueA: ValueNode, valueB: ValueNode) if valueA.getClass == valueB.getClass =>
          compareValueNodes(path, valueA, valueB)
        case _ =>
          ResultForNextLoop.withNewErrorAndNoNewNodes(DifferentNodeTypes(path, nodeA, nodeB))
      }

    def compareArrayNodes(path: String, arrayA: ArrayNode, arrayB: ArrayNode): ResultForNextLoop = {
      val elemsA = arrayA.getArrayElements
      val elemsB = arrayB.getArrayElements
      val lengthErrors =
        if (elemsA.length != elemsB.length) List(DifferentArrayLengths(path, arrayA, arrayB)) else Nil
      if (elemsA.nonEmpty && elemsB.nonEmpty) {
        val identifier = findIdentifierOfElements(path)
        val otherErrors =
          identifier match {
            case Some(identifierFieldPath) =>
              compareArraysWithPotentialGaps(path, elemsA.toArray, arrayA, elemsB.toArray, arrayB, identifierFieldPath)
            case None =>
              elemsA.zip(elemsB).zipWithIndex.flatMap {
                case ((nodeA, nodeB), index) =>
                  val elemPath = s"$path[$index]"
                  compareNested(Map(elemPath -> nodeA), Map(elemPath -> nodeB), errors = Nil)
              }
          }
        ResultForNextLoop.withNewErrorsAndNoNewNodes(lengthErrors ++ otherErrors)
      } else ResultForNextLoop.withNewErrorsAndNoNewNodes(lengthErrors)
    }

    def compareObjectNodes(path: String, objectA: ObjectNode, objectB: ObjectNode): ResultForNextLoop = {
      val fieldsA = objectA.getFieldsMap
      val fieldsB = objectB.getFieldsMap
      if (fieldsA.keySet != fieldsB.keySet) {
        val newErrors = List(DifferentFields(path, objectA, objectB))
        val commonFieldsA = fieldsA.filter { case (key, _) => fieldsB.contains(key) }
        val commonFieldsB = fieldsB.filter { case (key, _) => fieldsA.contains(key) }
        ResultForNextLoop(withPathToRoot(path, commonFieldsA), withPathToRoot(path, commonFieldsB), newErrors)
      } else
        ResultForNextLoop(withPathToRoot(path, fieldsA), withPathToRoot(path, fieldsB), newErrors = Nil)
    }

    def compareValueNodes(path: String, valueA: ValueNode, valueB: ValueNode): ResultForNextLoop = {
      val newErrors = checkEquality(path, valueA, valueB).toList
      ResultForNextLoop.withNewErrorsAndNoNewNodes(newErrors)
    }

    // In this method we assume we can have gaps (some missing results) and we want to skip and report extra elements and
    // still properly compare matching objects. So eventually we can check equality of e.g. element 3 in array A against
    // element 5 in array B and element 4 in array A against element 3 in array B.
    // Note we call compareNested from here so it's not tail-recursive. We don't expect to process very deep hierarchies
    def compareArraysWithPotentialGaps(
        path: String,
        elemsA: Array[JsonNode],
        parentA: ArrayNode,
        elemsB: Array[JsonNode],
        parentB: ArrayNode,
        identifierFieldPath: String): List[ValidationError] = {
      val identifiersA = elemsA.map(_.getNestedNodeByPath(identifierFieldPath))
      val identifiersB = elemsB.map(_.getNestedNodeByPath(identifierFieldPath))
      var errors = List[ValidationError]()
      if (!identifiersA.sameElements(identifiersB)) {
        errors = errors :+ DifferentArrayElementIdentifiers(identifierFieldPath, path, parentA, parentB)
      }

      @tailrec
      def processElements(
          identifiersWithIndicesA: Array[(JsonNode, Int)],
          identifiersWithIndicesB: Array[(JsonNode, Int)],
          errors: List[ValidationError]): List[ValidationError] = {
        if (identifiersWithIndicesA.isEmpty && identifiersWithIndicesB.isEmpty) errors
        else if (identifiersWithIndicesA.isEmpty) errors ++ identifiersWithIndicesB.map {
          case (_, indexB) => MissingAValue(s"$path[${indexB}B]", elemsB(indexB))
        }
        else {
          val (identA, indexA) = identifiersWithIndicesA.head
          val elemA = elemsA(indexA)
          val identifierWithIndexBOpt = identifiersWithIndicesB.find { case (identB, _) => identB == identA }
          identifierWithIndexBOpt match {
            case Some(identifierWithIndexB) =>
              val (_, indexB) = identifierWithIndexB
              val elemB = elemsB(indexB)
              val indexPathPart = if (indexA == indexB) indexA.toString else s"${indexA}A|${indexB}B"
              val arrayElemPath = s"$path[$indexPathPart]"
              val newErrors = compareNested(Map(arrayElemPath -> elemA), Map(arrayElemPath -> elemB), errors = Nil)
              processElements(
                identifiersWithIndicesA.tail,
                identifiersWithIndicesB.diff(List(identifierWithIndexB)),
                errors ++ newErrors)
            case None =>
              processElements(
                identifiersWithIndicesA.tail,
                identifiersWithIndicesB,
                errors :+ MissingBValue(s"$path[${indexA}A]", elemA))
          }
        }
      }

      // we'll compare elements with matching identifiers but we'll keep the original indices in A and B arrays for reporting
      val otherErrors = processElements(identifiersA.zipWithIndex, identifiersB.zipWithIndex, errors = Nil)
      errors ++ otherErrors
    }

    compareNested(Map("" -> jsonA), Map("" -> jsonB), errors = Nil).sortBy(_.path)
  }

  private def checkEquality(path: String, valueA: ValueNode, valueB: ValueNode): Option[DifferentValueNodes] =
    if (valueA != valueB) Some(DifferentValueNodes(path, valueA, valueB))
    else None

  private def withPathToRoot(parentPath: String, fields: Map[String, JsonNode]): Map[String, JsonNode] = {
    val prefix = if (parentPath == "") "" else s"$parentPath."
    fields.map {
      case (fieldName, value) => (s"$prefix$fieldName", value)
    }
  }

  private def findIdentifierOfElements(path: String): Option[String] = {
    // just one regex with alternatives didn't work properly
    val pathWithChangedIndices = possibleReportedArrayIndicesPatterns.foldLeft(path) {
        case (newPath, indexRegex) =>
          newPath.replaceAll(indexRegex, "[*]")
      } + "[*]"
    arrayPathsToObjectIdPaths.get(pathWithChangedIndices)
  }
}

final case class ResultForNextLoop(
    newNestedNodesA: Map[String, JsonNode],
    newNestedNodesB: Map[String, JsonNode],
    newErrors: List[ValidationError])

object ResultForNextLoop {
  def withNewErrorsAndNoNewNodes(newErrors: List[ValidationError]): ResultForNextLoop =
    ResultForNextLoop(Map.empty, Map.empty, newErrors)

  def withNewErrorAndNoNewNodes(newErrors: ValidationError): ResultForNextLoop =
    ResultForNextLoop(Map.empty, Map.empty, List(newErrors))

  val empty: ResultForNextLoop = ResultForNextLoop(Map.empty, Map.empty, Nil)
}
