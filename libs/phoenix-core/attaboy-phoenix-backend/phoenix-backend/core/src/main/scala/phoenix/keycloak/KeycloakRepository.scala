package phoenix.keycloak

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.blocking
import scala.jdk.CollectionConverters._

import org.keycloak.admin.client.resource.GroupResource
import org.keycloak.admin.client.resource.RealmResource
import org.keycloak.admin.client.resource.UsersResource
import org.keycloak.representations.idm.UserRepresentation

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.keycloak.KeycloakUtils.Groups

class KeycloakRepository(realmResource: RealmResource) {
  import KeycloakRepository._

  private val phoenixUsers: UsersResource = realmResource.users()

  def findUserById(id: String)(implicit ec: ExecutionContext): Future[UserRepresentation] =
    Future {
      blocking {
        val userResource = phoenixUsers.get(id)
        userResource.toRepresentation
      }
    }

  def listPhoenixUsers(pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[UserRepresentation]] = {
    for {
      puntersGroup <- findPuntersGroup()
      userRepresentations <- listUsersInGroup(puntersGroup, pagination)
      totalNumberOfUsers <- countUsersInGroup(puntersGroup)
    } yield PaginatedResult(userRepresentations, totalCount = totalNumberOfUsers, paginationRequest = pagination)
  }

  private def findPuntersGroup()(implicit ec: ExecutionContext): Future[GroupResource] =
    Future {
      blocking {
        val groupId = realmResource
          .groups()
          .groups()
          .asScala
          .find(_.getName == Groups.Punters)
          .getOrElse(throw new RuntimeException(s"Unable to find a Keycloak group with name '${Groups.Punters}'"))
          .getId
        realmResource.groups().group(groupId)
      }
    }

  private def listUsersInGroup(groupResource: GroupResource, pagination: Pagination)(implicit
      ec: ExecutionContext): Future[Seq[UserRepresentation]] =
    Future {
      blocking {
        groupResource.members(pagination.offset, pagination.itemsPerPage).asScala.toSeq
      }
    }

  private def countUsersInGroup(groupResource: GroupResource)(implicit ec: ExecutionContext): Future[Int] =
    Future {
      blocking {
        groupResource.members(CountFirstResult, CountMaxResults, CountBriefRepresentation).size()
      }
    }
}

object KeycloakRepository {
  val CountFirstResult = -1
  val CountMaxResults = Integer.MAX_VALUE
  val CountBriefRepresentation = true
}
