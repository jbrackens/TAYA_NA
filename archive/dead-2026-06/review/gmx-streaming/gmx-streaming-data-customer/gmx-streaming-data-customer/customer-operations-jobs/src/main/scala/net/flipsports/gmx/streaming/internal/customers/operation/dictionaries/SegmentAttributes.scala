package net.flipsports.gmx.streaming.internal.customers.operation.dictionaries

case class SegmentAttributes(gender: Gender, registrationProduct: RegistrationProduct, osVersions: Option[Seq[OSVersion]] = None) {

  def attributesMatch(customerGender: Gender, customerRegistrationProduct: RegistrationProduct, customerDevice: Option[OSVersion]): Boolean = {
    val genderMatch = gender.genderMatch(customerGender)
    val registrationProductMatch = registrationProduct.productMatch(customerRegistrationProduct)

    val foundAnyDevice = osVersions match {
      case Some(os) => !os.filter(_.osVersionMatch(customerDevice)).isEmpty
      case None => true // if none than accept all
    }
    genderMatch && registrationProductMatch && foundAnyDevice
  }

}