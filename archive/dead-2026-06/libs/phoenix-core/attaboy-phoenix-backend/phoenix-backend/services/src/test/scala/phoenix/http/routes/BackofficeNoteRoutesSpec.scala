package phoenix.http.routes

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

import scala.concurrent.Future
import scala.concurrent.duration._

import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.testkit.RouteTestTimeout
import cats.data.OptionT
import cats.syntax.traverse._
import io.circe.Json
import io.circe.parser._
import monocle.Monocle.toAppliedFocusOps

import phoenix.core.Clock
import phoenix.core.pagination.Pagination
import phoenix.http.JsonMarshalling._
import phoenix.http.support.PhoenixRestRoutesBuilder
import phoenix.jwt.JwtAuthenticator
import phoenix.jwt.JwtAuthenticatorMock
import phoenix.jwt.Permissions.UserId
import phoenix.notes.domain.Note.ManualNote
import phoenix.notes.domain.Note.SystemNote
import phoenix.notes.domain.NoteId
import phoenix.notes.domain.NoteText
import phoenix.notes.support.InMemoryNoteRepository
import phoenix.punters.PunterDataGenerator
import phoenix.punters.PunterDataGenerator.Api.generateAdminId
import phoenix.punters.PunterDataGenerator.generatePunterWithSSN
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.FirstName
import phoenix.punters.domain.LastName
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.Punter
import phoenix.punters.domain.Title
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.time.FakeHardcodedClock

final class BackofficeNoteRoutesSpec extends RoutesSpecSupport with FutureSupport {

  private implicit val clock: Clock = new FakeHardcodedClock()
  private val adminId = generateAdminId()
  implicit val jwtAuthenticator: JwtAuthenticator =
    JwtAuthenticatorMock.jwtAuthenticatorMock(userId = UserId(adminId.value))

  private val routesBuilder = new PhoenixRestRoutesBuilder(clock, jwtAuthenticator)

  // The default is 1 second, which is apparently too low in our CI :/
  implicit val routeTestTimeout: RouteTestTimeout = RouteTestTimeout(5.seconds)

  "Backoffice note routes" when {
    "GET /admin/punters/{punterId}/notes" should {
      val noteOwner = PunterId("4f83af4e-9cc9-4452-80ef-78bb0c545926")
      assertAdminRoleRequired(Get(s"/admin/punters/${noteOwner.value}/notes"))(routesBuilder.buildRoutes())

      "returns 200 OK" in {
        val noteRepository = new InMemoryNoteRepository()
        val authorId = AdminId("a038c3bc-2250-478f-a9ad-f4299964de10")
        val notes = List(
          ManualNote(
            NoteId(UUID.fromString("11137864-ba81-4b6d-b4e7-b0ef10a8e48d")),
            noteOwner,
            createdAt = OffsetDateTime.of(2020, 12, 25, 0, 1, 2, 0, ZoneOffset.UTC),
            NoteText("Just some note living in the database."),
            authorId = authorId),
          SystemNote(
            NoteId(UUID.fromString("22237864-ba81-4b6d-b4e7-b0ef10a8e48d")),
            noteOwner,
            createdAt = OffsetDateTime.of(2020, 12, 26, 0, 1, 2, 0, ZoneOffset.UTC),
            NoteText("Just another note living in the database.")))
        await(notes.traverse(noteRepository.insert))

        val punter = PunterDataGenerator
          .generatePunter()
          .focus(_.details.name)
          .replace(PersonalName(Title.apply("Mr").unsafe(), FirstName("Thomas").unsafe(), LastName("Edison").unsafe()))
        val puntersRepository = new InMemoryPuntersRepository() {
          override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] = {
            OptionT.fromOption(Some(punter))
          }
        }

        val routes = routesBuilder.buildRoutes(noteRepository = noteRepository, puntersRepository = puntersRepository)
        withAdminToken(Get(
          s"/admin/punters/${noteOwner.value}/notes?pagination.currentPage=1&pagination.itemsPerPage=2")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          Right(responseAs[Json]) shouldBe
          parse(s"""
            |{
            |  "currentPage": 1,
            |  "itemsPerPage": 2,
            |  "totalCount": 2,
            |  "hasNextPage": false,
            |  "data": [
            |    {
            |      "noteId": "22237864-ba81-4b6d-b4e7-b0ef10a8e48d",
            |      "noteType": "SYSTEM",
            |      "owner": "4f83af4e-9cc9-4452-80ef-78bb0c545926",
            |      "createdAt": "2020-12-26T00:01:02Z",
            |      "text": "Just another note living in the database."
            |    },
            |    {
            |      "noteId": "11137864-ba81-4b6d-b4e7-b0ef10a8e48d",
            |      "noteType": "MANUAL",
            |      "owner": "4f83af4e-9cc9-4452-80ef-78bb0c545926",
            |      "createdAt": "2020-12-25T00:01:02Z",
            |      "text": "Just some note living in the database.",
            |      "authorId": "a038c3bc-2250-478f-a9ad-f4299964de10",
            |      "authorName": {
            |        "title": "Mr",
            |        "firstName": "Thomas",
            |        "lastName": "Edison"
            |      }
            |    }
            |  ]
            |}
            |""".stripMargin)
        }
      }
    }

    "POST /admin/punters/{punterId}/notes" should {
      val requestBody = Json.obj("noteText" -> Json.fromString("This is just some text, please ignore me."))
      val noteOwner = PunterId("4f83af4e-9cc9-4452-80ef-78bb0c545926")

      assertAdminRoleRequired(Post(s"/admin/punters/${noteOwner.value}/notes", requestBody))(
        routesBuilder.buildRoutes())

      "return 204 NoContent on the happy path" in {
        val noteRepository = new InMemoryNoteRepository()
        val constantUUIDGenerator = ConstantUUIDGenerator
        val puntersRepository = new InMemoryPuntersRepository() {
          override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] = {
            OptionT.fromOption(Some(generatePunterWithSSN(punterId = noteOwner)))
          }
        }

        val routes = routesBuilder.buildRoutes(
          noteRepository = noteRepository,
          uuidGenerator = constantUUIDGenerator,
          puntersRepository = puntersRepository)

        withAdminToken(Post(s"/admin/punters/${noteOwner.value}/notes", requestBody)) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent

          await(noteRepository.searchAll(noteOwner, Pagination.atFirstPage(100))).data shouldBe Seq(ManualNote(
            NoteId(constantUUIDGenerator.generate()),
            owner = noteOwner,
            createdAt = clock.currentOffsetDateTime(),
            text = NoteText.unsafe("This is just some text, please ignore me."),
            authorId = adminId))
        }
      }

      "return 404 Not Found when the punter does not exist" in {
        val noteRepository = new InMemoryNoteRepository()
        val constantUUIDGenerator = ConstantUUIDGenerator

        val routes = routesBuilder.buildRoutes(noteRepository = noteRepository, uuidGenerator = constantUUIDGenerator)

        withAdminToken(Post(s"/admin/punters/${noteOwner.value}/notes", requestBody)) ~> routes ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }
    }
  }
}
