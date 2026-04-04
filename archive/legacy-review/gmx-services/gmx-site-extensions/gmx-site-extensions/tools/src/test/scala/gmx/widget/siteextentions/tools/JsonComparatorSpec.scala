package gmx.widget.siteextentions.tools

import scala.io.Source

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import gmx.widget.siteextentions.tools.ValidationError._

class JsonComparatorSpec extends AnyFlatSpec with Matchers {

  import JsonComparatorSpec._

  "comparator" should "not find any issues for the same JSON structures" in {
    val comparator = new JsonComparator(
      arrayPathsToObjectIdPaths = Map("response[*]" -> "name", "response[*].selections[*]" -> "name"))
    val json1 = loadObjectNodeFromFile("/test_json1.json")
    comparator.compareJsonNodes(json1, json1) shouldBe empty

    val comparator2 =
      new JsonComparator(arrayPathsToObjectIdPaths = Map("response[*]" -> "name", "response[*].events[*]" -> "id"))
    val json2 = loadObjectNodeFromFile("/test_json2A.json")
    val json3 = loadObjectNodeFromFile("/test_json2B.json")
    comparator2.compareJsonNodes(json2, json2) shouldBe empty
    comparator2.compareJsonNodes(json3, json3) shouldBe empty
  }

  it should "report errors when arrays of objects with predefined identifiers differ" in {
    val comparator =
      new JsonComparator(arrayPathsToObjectIdPaths = Map("response[*]" -> "name", "response[*].events[*]" -> "id"))
    val jsonA = loadObjectNodeFromFile("/test_json2A.json")
    val jsonB = loadObjectNodeFromFile("/test_json2B.json")
    val res = comparator.compareJsonNodes(jsonA, jsonB)
    res shouldBe List(
      DifferentArrayLengths(
        "response[0].events",
        jsonA.arrayForPath("response[0].events"),
        jsonB.arrayForPath("response[0].events")),
      DifferentArrayElementIdentifiers(
        "id",
        "response[0].events",
        jsonA.arrayForPath("response[0].events"),
        jsonB.arrayForPath("response[0].events")),
      DifferentFields(
        "response[0].events[1]",
        jsonA.objectForPath("response[0].events[1]"),
        jsonB.objectForPath("response[0].events[1]")),
      DifferentValueNodes(
        "response[0].events[1].url",
        jsonA.valueForPath("response[0].events[1].url"),
        jsonB.valueForPath("response[0].events[1].url")),
      MissingAValue("response[0].events[2B]", jsonB.objectForPath("response[0].events[2]")),
      DifferentValueNodes(
        "response[0].events[3A|4B].derivatives.placeOnlyID",
        jsonA.valueForPath("response[0].events[3].derivatives.placeOnlyID"),
        jsonB.valueForPath("response[0].events[4].derivatives.placeOnlyID")),
      MissingBValue("response[0].events[4A]", jsonA.objectForPath("response[0].events[4]")),
      MissingAValue("response[0].events[5B]", jsonB.objectForPath("response[0].events[5]")))
  }

  it should "report field names and fields number mismatch" in {
    val comparator = new JsonComparator(arrayPathsToObjectIdPaths = Map.empty)
    val jsonA =
      """{
        | "foo": "a",
        | "bar": {
        |   "bar_1": {
        |     "bar_1_1": 17,
        |     "bar_1_2": "qwerty"
        |   },
        |   "bar_2": 3.4,
        |   "bar_3": [1,2,3]
        | }
        |}""".stripMargin.toJsonObject
    val jsonB =
      """{
        | "bar": {
        |   "bar_1": {
        |     "bar_1_2": "qwerty",
        |     "bar_1_3": true
        |   },
        |   "bar_3": [1,2,3]
        | },
        | "baz": {
        |   "baz_1": {
        |     "baz_1_1": null
        |   }
        | }
        |}""".stripMargin.toJsonObject
    val res1 = comparator.compareJsonNodes(jsonA, jsonB)
    res1 shouldEqual List(
      DifferentFields("", jsonA, jsonB),
      DifferentFields(
        "bar",
        """{"bar_1":{"bar_1_1":17,"bar_1_2":"qwerty"},"bar_2":3.4,"bar_3":[1,2,3]}""".toJsonObject,
        """{"bar_1":{"bar_1_2":"qwerty","bar_1_3":true},"bar_3":[1,2,3]}""".toJsonObject),
      DifferentFields(
        "bar.bar_1",
        """{"bar_1_1":17,"bar_1_2":"qwerty"}""".toJsonObject,
        """{"bar_1_2":"qwerty","bar_1_3":true}""".toJsonObject))

    val res2 = comparator.compareJsonNodes(jsonB, jsonA)
    res2 shouldEqual List(
      DifferentFields("", jsonB, jsonA),
      DifferentFields(
        "bar",
        """{"bar_1":{"bar_1_2":"qwerty","bar_1_3":true},"bar_3":[1,2,3]}""".toJsonObject,
        """{"bar_1":{"bar_1_1":17,"bar_1_2":"qwerty"},"bar_2":3.4,"bar_3":[1,2,3]}""".toJsonObject),
      DifferentFields(
        "bar.bar_1",
        """{"bar_1_2":"qwerty","bar_1_3":true}""".toJsonObject,
        """{"bar_1_1":17,"bar_1_2":"qwerty"}""".toJsonObject))
  }

  it should "report different JSON node types" in {
    val comparator = new JsonComparator(arrayPathsToObjectIdPaths = Map.empty)
    val jsonA =
      """{
        | "foo": false,
        | "bar": {
        |   "bar_1": {
        |     "bar_1_1": "1",
        |     "bar_1_2": "A",
        |     "bar_1_3": 5,
        |     "bar_1_4": 7.0
        |   },
        |   "bar_2": {},
        |   "bar_3": true,
        |   "bar_4": [1,5,"6"]
        | },
        | "baz": {
        |   "baz_1": []
        | }
        |}""".stripMargin.toJsonObject
    val jsonB =
      """{
        | "bar": {
        |   "bar_1": 50,
        |   "bar_2": [2,4],
        |   "bar_3": true,
        |   "bar_4": [1,5.0,6]
        | },
        | "baz": {
        |   "baz_1": {
        |     "baz_1_1": false
        |   }
        | },
        | "foo": null
        |}""".stripMargin.toJsonObject
    val res = comparator.compareJsonNodes(jsonA, jsonB)
    res shouldEqual List(
      DifferentNodeTypes(
        "bar.bar_1",
        """{"bar_1_1":"1","bar_1_2":"A","bar_1_3":5,"bar_1_4":7.0}""".toJsonObject,
        new IntNode(50)),
      DifferentNodeTypes("bar.bar_2", "{}".toJsonObject, "[2,4]".toJsonArray),
      DifferentNodeTypes("bar.bar_4[1]", new IntNode(5), new DoubleNode(5.0)),
      DifferentNodeTypes("bar.bar_4[2]", new TextNode("6"), new IntNode(6)),
      DifferentNodeTypes("baz.baz_1", "[]".toJsonArray, """{"baz_1_1":false}""".toJsonObject),
      DifferentNodeTypes("foo", BooleanNode.FALSE, NullNode.getInstance()))
  }

  it should "report different leaf values" in {
    val comparator = new JsonComparator(arrayPathsToObjectIdPaths = Map.empty)
    val jsonA =
      """{
        | "foo": false,
        | "bar": {
        |   "bar_1": {
        |     "bar_1_1": "1",
        |     "bar_1_2": "A",
        |     "bar_1_3": 5,
        |     "bar_1_4": 7.0
        |   },
        |   "bar_2": [1,5.2,2]
        | },
        | "baz": {
        |   "baz_1": {
        |     "baz_1_1": true
        |   }
        | }
        |}""".stripMargin.toJsonObject
    val jsonB =
      """{
        | "bar": {
        |   "bar_1": {
        |     "bar_1_1": "1.1",
        |     "bar_1_2": "B",
        |     "bar_1_4": 7.3,
        |     "bar_1_3": 5
        |   },
        |   "bar_2": [1,5.1,3]
        | },
        | "baz": {
        |   "baz_1": {
        |     "baz_1_1": false
        |   }
        | },
        | "foo": true
        |}""".stripMargin.toJsonObject
    val res = comparator.compareJsonNodes(jsonA, jsonB)
    res shouldEqual List(
      DifferentValueNodes("bar.bar_1.bar_1_1", new TextNode("1"), new TextNode("1.1")),
      DifferentValueNodes("bar.bar_1.bar_1_2", new TextNode("A"), new TextNode("B")),
      DifferentValueNodes("bar.bar_1.bar_1_4", new DoubleNode(7.0), new DoubleNode(7.3)),
      DifferentValueNodes("bar.bar_2[1]", new DoubleNode(5.2), new DoubleNode(5.1)),
      DifferentValueNodes("bar.bar_2[2]", new IntNode(2), new IntNode(3)),
      DifferentValueNodes("baz.baz_1.baz_1_1", BooleanNode.TRUE, BooleanNode.FALSE),
      DifferentValueNodes("foo", BooleanNode.FALSE, BooleanNode.TRUE))
  }

  it should "use specified id paths" in {
    val jsonA =
      """{
        | "bar": [
        |   {
        |     "id": 1
        |   },
        |   {
        |     "id": 5
        |   }
        | ],
        | "baz": [
        |   {
        |     "baz_nested": [
        |       {
        |         "name": "Alpha",
        |         "id": "17"
        |       },
        |       {
        |         "name": "Omega",
        |         "id": "17"
        |       }
        |     ]
        |   }
        | ]
        |}""".stripMargin.toJsonObject
    val jsonB =
      """{
        | "bar": [
        |   {
        |     "id": 5
        |   },
        |   {
        |     "id": 1
        |   }
        | ],
        | "baz": [
        |   {
        |     "baz_nested": [
        |       {
        |         "name": "Omega",
        |         "id": "17"
        |       },
        |       {
        |         "name": "Alpha",
        |         "id": "17"
        |       }
        |     ]
        |   }
        | ]
        |}""".stripMargin.toJsonObject

    val resWithIdsCheck =
      new JsonComparator(Map("bar[*]" -> "id", "baz[*].baz_nested[*]" -> "name")).compareJsonNodes(jsonA, jsonB)
    // we report that order of ids is different but we compare objects properly
    resWithIdsCheck shouldEqual List(
      DifferentArrayElementIdentifiers("id", "bar", jsonA.arrayForPath("bar"), jsonB.arrayForPath("bar")),
      DifferentArrayElementIdentifiers(
        "name",
        "baz[0].baz_nested",
        jsonA.arrayForPath("baz[0].baz_nested"),
        jsonB.arrayForPath("baz[0].baz_nested")))
    val resWithoutIdsCheck = new JsonComparator(Map.empty).compareJsonNodes(jsonA, jsonB)
    // we report that elements don't match
    resWithoutIdsCheck shouldEqual List(
      DifferentValueNodes("bar[0].id", new IntNode(1), new IntNode(5)),
      DifferentValueNodes("bar[1].id", new IntNode(5), new IntNode(1)),
      DifferentValueNodes("baz[0].baz_nested[0].name", new TextNode("Alpha"), new TextNode("Omega")),
      DifferentValueNodes("baz[0].baz_nested[1].name", new TextNode("Omega"), new TextNode("Alpha")))
  }

  private def loadObjectNodeFromFile(filePath: String): ObjectNode = {
    val source = Source.fromURL(getClass.getResource(filePath))
    try {
      source.mkString.toJsonObject
    } finally {
      source.close()
    }
  }
}

object JsonComparatorSpec {
  private val mapper = new ObjectMapper()
  private val arrayRegex = """(.*)\[(\d)+]""".r

  implicit class JsonStringOps(json: String) {
    def toJsonArray: ArrayNode = mapper.readTree(json).asInstanceOf[ArrayNode]

    def toJsonObject: ObjectNode = mapper.readTree(json).asInstanceOf[ObjectNode]
  }

  implicit class JsonNodeOps(rootNode: JsonNode) {

    def arrayForPath(path: String): ArrayNode = nodeForPath(path).asInstanceOf[ArrayNode]

    def objectForPath(path: String): ObjectNode = nodeForPath(path).asInstanceOf[ObjectNode]

    def valueForPath(path: String): ValueNode = nodeForPath(path).asInstanceOf[ValueNode]

    private def nodeForPath(path: String): JsonNode = {
      val pathParts = path.split("\\.")
      pathParts.foldLeft(rootNode) {
        case (node, arrayRegex(arrayName, arrayIndex)) => node.path(arrayName).get(arrayIndex.toInt)
        case (node, part)                              => node.path(part)
      }
    }
  }
}
