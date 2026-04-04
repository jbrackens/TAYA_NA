package com.betconstruct.avro.enigma.details

import ca.mrvisser.sealerate

sealed abstract class ClientDetailsType(val name: String)


object ClientDetailsType {

  case object ClientDetailsInLogin extends ClientDetailsType("ClientDetailsInLogin")

  case object ClientDetails extends ClientDetailsType("ClientDetails")

  case object Missing extends ClientDetailsType("Missing")

  def values: Set[ClientDetailsType] = sealerate.values[ClientDetailsType]

  def apply(id: String): Option[ClientDetailsType] = values.find(_.name == id)

}


