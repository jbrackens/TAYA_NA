package phoenix.http.routes
import sttp.model.MediaType
import sttp.tapir.CodecFormat

object EndpointOutputs {
  object TextCsvFormat extends CodecFormat {
    override val mediaType = MediaType.TextCsv
  }
}
