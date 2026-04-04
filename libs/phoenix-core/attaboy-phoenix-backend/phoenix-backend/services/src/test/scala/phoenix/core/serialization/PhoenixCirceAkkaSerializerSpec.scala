package phoenix.core.serialization

import java.io.File
import java.io.PrintWriter
import java.time.OffsetDateTime

import scala.reflect.runtime.universe.TypeTag
import scala.reflect.runtime.{universe => ru}
import scala.util.Failure
import scala.util.Success
import scala.util.Try

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.actor.typed.ActorRef
import akka.serialization.Serialization
import akka.serialization.SerializationExtension
import cats.data.NonEmptyList
import cats.kernel.Eq
import cats.syntax.traverse._
import io.circe
import io.circe.Decoder
import io.circe.Encoder
import io.circe.Json
import io.circe.parser.decode
import io.circe.testing.ArbitraryInstances
import io.circe.testing.golden.Resources
import org.scalacheck.Arbitrary
import org.scalacheck.Gen
import org.scalacheck.rng.Seed
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.CirceAkkaSerializable
import phoenix.core.domain.DataProvider
import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec.Action
import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec.AppendNew
import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec.Migrate
import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec.NoAction
import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec.OldVersionsField
import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec.Regenerate
import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec.config

/**
 * Base class for Akka serialization golden tests.
 *
 * It can be controlled by `PHOENIX_GOLDEN_ACTION` environment variable.
 * Any value (or absence thereof) except "regenerate" or "append" makes it check serialization against existing golden files.
 * "regenerate" value makes it ignore the existing files and generate them anew.
 * "append" makes it augment the golden files with new, randomly generated objects, without discarding the existing ones.
 * "migrate" updates to the latest version, while keeping old ones so that decoding them still can be checked.
 */
abstract class PhoenixCirceAkkaSerializerSpec
    extends ScalaTestWithActorTestKit(config)
    with AnyWordSpecLike
    with ArbitraryInstances
    with Matchers {
  protected implicit def actorRefArbitrary[T <: CirceAkkaSerializable]: Arbitrary[ActorRef[T]] =
    Arbitrary(Gen.const(system.deadLetters))
  protected implicit def actorRefEq[T <: CirceAkkaSerializable]: Eq[ActorRef[T]] = Eq.fromUniversalEquals
  protected implicit lazy val offsetDateTimeEq: Eq[OffsetDateTime] = Eq.fromUniversalEquals
  protected implicit val eqJson: Eq[Json] = Eq.fromUniversalEquals

  private val serialization: Serialization = SerializationExtension(system)
  private val phoenixSerializer =
    serialization.serializerFor(classOf[CirceAkkaSerializable]).asInstanceOf[PhoenixCirceAkkaSerializer]

  private val action = sys.env.get("PHOENIX_GOLDEN_ACTION") match {
    case Some("regenerate") => Regenerate
    case Some("append")     => AppendNew
    case Some("migrate")    => Migrate
    case _                  => NoAction
  }

  protected def roundTripFor[T: Eq: Arbitrary: TypeTag]: Unit = testRegistration[T](testRoundTripOnly = true)

  protected def goldenTestsFor[T: Eq: Arbitrary: TypeTag]: Unit = testRegistration[T](testRoundTripOnly = false)

  protected def namespacedIdArbitrary[T](apply: (DataProvider, String) => T): Arbitrary[T] =
    Arbitrary(for {
      provider <- Gen.oneOf(DataProvider.values)
      id <- Arbitrary.arbitrary[String].map(_.filter(_.toString.matches("."))).filter(_.nonEmpty)
    } yield apply(provider, id))

  private object Checker {
    private def getAllProductElements(source: Any): Set[Class[_]] =
      source match {
        case s: Product =>
          (0 until s.productArity).flatMap(n => getAllProductElements(s.productElement(n))).toSet + s.getClass
        case _ => Set(source.getClass)
      }
  }

  private class Checker[A: Arbitrary: TypeTag](
      decoder: Decoder[A],
      encoder: Encoder[A],
      size: Int,
      count: Int,
      action: Action = NoAction) {

    private val gen: Gen[A] = Arbitrary.arbitrary[A]
    private val name = Resources.inferName[A]
    private val resourcePackage = Resources.inferPackage[A]
    private val resourceRootPath: String = "/" + resourcePackage.mkString("/") + "/"
    private val resourceRootDir = Resources.inferRootDir
    private val resourceDir: File = resourcePackage.foldLeft(resourceRootDir) { case (acc, p) => new File(acc, p) }

    private val params: Gen.Parameters = Gen.Parameters.default.withSize(size)

    private def generateRandomGoldenExamples: List[A] =
      (0 until count).map(_ => gen.pureApply(params, Seed.random())).toList
    private def generateRandomGoldenExamplesSerialized: List[(A, NonEmptyList[Json])] =
      generateRandomGoldenExamples.map(a => (a, NonEmptyList.of(encoder(a))))

    private def decodeGoldenExample(example: Json): Decoder.Result[(A, NonEmptyList[Json])] = {
      val cursor = example.hcursor
      val oldVersionsField = cursor.downField(OldVersionsField)
      for {
        oldVersionsJsons <- oldVersionsField match {
          case h: circe.HCursor => h.as[List[Json]]
          case _                => Right(List.empty)
        }
        newVersion <- decoder(cursor)
        target = oldVersionsField.delete.top.getOrElse(example)
      } yield (newVersion, NonEmptyList(target, oldVersionsJsons))
    }
    private def loadGoldenFile: Try[List[(A, NonEmptyList[Json])]] =
      Resources.open(s"$resourceRootPath$name.json").flatMap { source =>
        val json = source.getLines().mkString("\n")
        source.close()
        decode[List[Json]](json).flatMap(_.traverse(decodeGoldenExample)).toTry
      }

    private def generateAdditionalGoldenExamples(
        existing: List[(A, NonEmptyList[Json])]): List[(A, NonEmptyList[Json])] = {
      val existingClasses = existing.map(_._1).toSet.flatMap(Checker.getAllProductElements)
      existing ++ generateRandomGoldenExamples
        .filter(e => !Checker.getAllProductElements(e).forall(existingClasses.apply))
        .map(v => (v, NonEmptyList.of(encoder(v))))
    }

    private def prepareGoldenExample(example: (A, NonEmptyList[Json])): Json =
      if (example._2.tail.isEmpty) example._2.head
      else
        example._2.head.mapObject((OldVersionsField -> Json.arr(example._2.tail: _*)) +: _)
    private def saveGoldenFile(examples: List[(A, NonEmptyList[Json])]): Try[List[(A, NonEmptyList[Json])]] =
      Try {
        val json = Json.arr(examples.map(prepareGoldenExample): _*)
        if (!resourceDir.exists()) resourceDir.mkdirs()
        val file = new File(resourceDir, s"$name.json")
        val writer = new PrintWriter(file)
        writer.print(json.toString())
        writer.close()
        examples
      }

    private def migrateGoldenExample(example: (A, NonEmptyList[Json])): (A, NonEmptyList[Json]) = {
      val encoded = encoder(example._1)
      if (encoded == example._2.head) example else (example._1, encoded :: example._2)
    }
    private lazy val goldenExamples: Try[List[(A, NonEmptyList[Json])]] = action match {
      case NoAction =>
        loadGoldenFile.recoverWith {
          case e: circe.Error => Failure(e)
          case _              => saveGoldenFile(generateRandomGoldenExamplesSerialized)
        }
      case Regenerate => saveGoldenFile(generateRandomGoldenExamplesSerialized)
      case AppendNew =>
        loadGoldenFile.flatMap(examples => saveGoldenFile(generateAdditionalGoldenExamples(examples))).recoverWith {
          case _ => saveGoldenFile(generateRandomGoldenExamplesSerialized)
        }
      case Migrate => loadGoldenFile.flatMap(examples => saveGoldenFile(examples.map(migrateGoldenExample)))
    }

    def goldenEncoding: Try[List[(Json, Json)]] =
      goldenExamples.map { _.map { case (value, encoded) => (encoder(value), encoded.head) } }

    def goldenDecoding: Try[List[(A, A)]] =
      goldenExamples.flatMap(_.flatTraverse {
        case (value, encoded) =>
          encoded.toList.traverse(json => decoder(json.hcursor).map(_ -> value).toTry)
      })

    def roundTrip: Try[List[(A, A)]] =
      generateRandomGoldenExamples.traverse(value => decoder(encoder(value).hcursor).toTry.map(_ -> value))
  }

  private def testRegistration[T: Eq: Arbitrary: TypeTag](testRoundTripOnly: Boolean): Unit = {
    val tag = ru.typeTag[T]
    val registration = phoenixSerializer.codecs.find(_.typeTag.tpe =:= tag.tpe).get
    val decoder = registration.decoder.asInstanceOf[Decoder[T]]
    val encoder = registration.encoder.asInstanceOf[Encoder[T]]
    val checker = new Checker(decoder, encoder, 100, 100, action)
    ru.typeOf[T].typeSymbol.toString should {
      if (!testRoundTripOnly) {
        "have all values encoded correctly" in checkTryList(checker.goldenEncoding)
        "have all values decoded correctly" in checkTryList(checker.goldenDecoding)
      }
      "make round trip through JSON successfully" in checkTryList(checker.roundTrip)
    }
  }

  private def checkTryList[A: Eq](list: => Try[List[(A, A)]]): Unit =
    Serialization.withTransportInformation(serialization.system) { () =>
      list match {
        case Failure(exception) => fail(exception)
        case Success(list) =>
          list.filterNot(x => Eq[A].eqv(x._1, x._2)).headOption shouldBe empty
      }
    }
}

object PhoenixCirceAkkaSerializerSpec {
  val OldVersionsField = "_old_versions_"

  sealed trait Action
  object NoAction extends Action
  object Regenerate extends Action
  object AppendNew extends Action
  object Migrate extends Action

  val config: String =
    """akka.actor {
      |  serialization-bindings {
      |    "phoenix.CirceAkkaSerializable" = circe-json
      |  }
      |
      |  serializers {
      |    circe-json = "phoenix.core.serialization.PhoenixCirceAkkaSerializer"
      |  }
      |}""".stripMargin
}
