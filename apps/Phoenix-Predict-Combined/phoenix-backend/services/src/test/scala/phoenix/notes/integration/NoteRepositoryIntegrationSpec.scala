package phoenix.notes.integration

import scala.concurrent.duration._
import scala.util.Random

import cats.syntax.traverse._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.TimeUtils._
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.notes.domain.NoteRepository
import phoenix.notes.infrastructure.SlickNoteRepository
import phoenix.notes.support.InMemoryNoteRepository
import phoenix.notes.support.NoteDataGenerator
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.support.TruncatedTables

final class NoteRepositoryIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext
    with FutureSupport
    with TruncatedTables {

  private val inMemoryRepository = () => new InMemoryNoteRepository()
  private val slickRepository = () => {
    truncateTables()
    new SlickNoteRepository(dbConfig)
  }

  classOf[InMemoryNoteRepository].getName should behave.like(repositoryTests(inMemoryRepository))
  classOf[SlickNoteRepository].getName should behave.like(repositoryTests(slickRepository))

  private def repositoryTests(constructRepository: () => NoteRepository): Unit = {
    "not find anything when no notes of the owner exist" in {
      val repository = constructRepository()

      val notes = List.fill(10)(NoteDataGenerator.generateNote())
      await(notes.traverse(repository.insert))

      val pagination = Pagination.atFirstPage(itemsPerPage = 10)
      await(repository.searchAll(generatePunterId(), pagination)) shouldBe PaginatedResult(
        Seq.empty,
        totalCount = 0,
        pagination)
    }

    "find paginated existing notes of owner in descending order by creation date" in {
      val repository = constructRepository()

      val owner = generatePunterId()
      val note1 = NoteDataGenerator.generateSystemNote().copy(owner = owner)
      val note2 = NoteDataGenerator.generateManualNote().copy(createdAt = note1.createdAt + 1.second, owner = owner)
      val note3 = NoteDataGenerator.generateSystemNote().copy(createdAt = note2.createdAt + 5.second, owner = owner)
      val note4 = NoteDataGenerator.generateManualNote().copy(createdAt = note3.createdAt + 1.day, owner = owner)
      val note5 = NoteDataGenerator.generateSystemNote().copy(createdAt = note4.createdAt + 2.day, owner = owner)

      val ownerNotes = List(note1, note2, note3, note4, note5)
      val otherNotes = List.fill(10)(NoteDataGenerator.generateNote())
      val allNotes = ownerNotes ++ otherNotes
      await(Random.shuffle(allNotes).traverse(repository.insert))

      val oneItemPerPageFirstPage = Pagination.atFirstPage(itemsPerPage = 1)
      await(repository.searchAll(owner, oneItemPerPageFirstPage)) shouldBe PaginatedResult(
        Seq(note5),
        totalCount = ownerNotes.size,
        oneItemPerPageFirstPage)

      val twoItemsPerPageFirstPage = Pagination.atFirstPage(itemsPerPage = 2)
      await(repository.searchAll(owner, twoItemsPerPageFirstPage)) shouldBe PaginatedResult(
        Seq(note5, note4),
        totalCount = ownerNotes.size,
        twoItemsPerPageFirstPage)

      val twoItemsPerPageThirdPage = Pagination(currentPage = 3, itemsPerPage = 2)
      await(repository.searchAll(owner, twoItemsPerPageThirdPage)) shouldBe PaginatedResult(
        Seq(note1),
        totalCount = ownerNotes.size,
        twoItemsPerPageThirdPage)
    }
  }
}
