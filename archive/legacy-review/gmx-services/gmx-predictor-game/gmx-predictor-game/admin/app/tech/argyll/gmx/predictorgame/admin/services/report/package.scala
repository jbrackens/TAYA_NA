package tech.argyll.gmx.predictorgame.admin.services

package object report {

  case class SelectionsReportRow(userId: String, eventsTotal: Int, eventsValid: Int, picksSubmitted: Int, picksCorrect: Int)

}
