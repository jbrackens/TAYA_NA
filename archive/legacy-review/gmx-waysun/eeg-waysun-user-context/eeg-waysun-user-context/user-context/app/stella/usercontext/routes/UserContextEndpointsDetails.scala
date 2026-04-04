package stella.usercontext.routes

import stella.usercontext.services.UserContextBoundedContext.UserContextPermissions._

object UserContextEndpointsDetails {
  object PutUserContextAsAdmin {
    val name: String = "putUserContextAsAdmin"
    val description: String =
      s"""Create or replace user-specific data in JSON format.
         |
         |Required permission: `${UserContextAdminWritePermission.value}`
         |""".stripMargin
  }

  object ModifyUserContextAsAdmin {
    val name: String = "modifyUserContextAsAdmin"
    val description: String =
      s"""Update user-specific data in JSON format. Old JSON is merged with the new one. Values for existing paths are 
         |replaced, new values being nulls are removed.
         |
         |Required permission: `${UserContextAdminWritePermission.value}`
         |""".stripMargin
  }

  object GetUserContextAsAdmin {
    val name: String = "getUserContextAsAdmin"
    val description: String =
      s"""Get user-specific data in JSON format.
         |
         |Required permission: `${UserContextAdminReadPermission.value}`
         |""".stripMargin
  }

  object DeleteUserContextAsAdmin {
    val name: String = "deleteUserContextAsAdmin"
    val description: String =
      s"""Delete user-specific data.
         |
         |Required permission: `${UserContextAdminWritePermission.value}`
         |""".stripMargin
  }

  object PutUserContext {
    val name: String = "putUserContext"
    val description: String =
      s"""Create or replace user-specific data of a sender in JSON format.
         |
         |Required permission: `${UserContextWritePermission.value}`
         |""".stripMargin
  }

  object ModifyUserContext {
    val name: String = "modifyUserContext"
    val description: String =
      s"""Update user-specific data of a sender in JSON format. Old JSON is merged with the new one. Values for 
         |existing paths are replaced, new values being nulls are removed.
         |
         |Required permission: `${UserContextWritePermission.value}`
         |""".stripMargin
  }

  object GetUserContext {
    val name: String = "getUserContext"
    val description: String =
      s"""Get user-specific data of a sender in JSON format.
         |
         |Required permission: `${UserContextReadPermission.value}`
         |""".stripMargin
  }

  object DeleteUserContext {
    val name: String = "deleteUserContext"
    val description: String =
      s"""Delete user-specific data of a sender.
         |
         |Required permission: `${UserContextWritePermission.value}`
         |""".stripMargin
  }
}
