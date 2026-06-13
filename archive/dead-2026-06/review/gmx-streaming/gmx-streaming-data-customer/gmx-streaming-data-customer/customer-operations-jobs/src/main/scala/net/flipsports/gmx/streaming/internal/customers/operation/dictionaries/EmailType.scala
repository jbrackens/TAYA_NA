package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

import java.io.Serializable

sealed abstract class EmailType(email: String) extends Serializable {
  override def toString: String = email

  def emailMatch(candidateEmail: String): Boolean = {
    val emailDomain = candidateEmail.split("@").lastOption.get
    emailDomain.split("\\.").head
    email.equalsIgnoreCase(emailDomain)
  }
}

object EmailType {
  case object Gmail extends EmailType("gmail.com")
  case object Outlook extends EmailType("outlook.com")
  case object Yahoo extends EmailType("yahoo.com")
}
