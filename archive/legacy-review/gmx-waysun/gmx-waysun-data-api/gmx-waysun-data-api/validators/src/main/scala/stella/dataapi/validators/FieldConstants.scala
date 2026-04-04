package stella.dataapi.validators

object FieldConstants {
  val nameFieldName = "name"
  val valueFieldName = "value"
  val valueTypeFieldName = "valueType"

  val nameFieldDescription: String =
    "A name defined in the event configuration or a predefined one (for the internal, built-in events)"

  val valueFieldDescription: String = """Accepted values for "boolean" (case insensitive): "true", "false".
                                      |Accepted values for "float": any number with ".' (dot) specified as a decimal separator.
                                      |Scientific notation is not supported.""".stripMargin

  val valueTypeFieldDescription: String = """One of (case insensitive): "boolean", "string", "integer", "float""""
}
