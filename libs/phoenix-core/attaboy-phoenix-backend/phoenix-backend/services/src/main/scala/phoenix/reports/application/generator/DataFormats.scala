package phoenix.reports.application.generator

import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

private object DateTimeFormats {
  val DATE_FORMAT = "MM/dd/yyyy"
  val TIME_FORMAT = "HH:mm:ss"
  val DATE_TIME_FORMAT = s"$DATE_FORMAT $TIME_FORMAT"

  private val dateFormatter = DateTimeFormatter.ofPattern(DATE_FORMAT)

  def formatDate(dateTime: OffsetDateTime): String =
    dateFormatter.format(dateTime)
}

private object NumberFormats {
  val INTEGER_FORMAT = "#;(#)"
  val DECIMAL_FORMAT = "#,##0.00;(#,##0.00)"
}
