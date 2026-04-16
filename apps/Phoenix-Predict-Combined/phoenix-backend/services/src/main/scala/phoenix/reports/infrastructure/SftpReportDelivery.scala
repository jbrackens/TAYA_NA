package phoenix.reports.infrastructure

import java.io.ByteArrayOutputStream
import java.nio.file.Path

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Failure
import scala.util.Success

import com.norbitltd.spoiwo.model.Sheet
import com.norbitltd.spoiwo.natures.xlsx.Model2XlsxConversions._
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.ftp.SftpClient
import phoenix.reports.application.ReportDelivery
import phoenix.reports.domain.model.ReportingPeriod

private[reports] final class SftpReportDelivery(sftpClient: SftpClient, reportsSubdirectory: Path)
    extends ReportDelivery {
  private val log: Logger = LoggerFactory.getLogger(getClass)

  def transferReport(reportingPeriod: ReportingPeriod, report: Sheet)(implicit ec: ExecutionContext): Future[Unit] = {
    val reportFileName = ReportNameGenerator.deriveFileName(report, reportingPeriod)
    val reportFile = reportsSubdirectory.resolve(reportFileName)
    val fileAsBytes = report.writeToOutputStream(new ByteArrayOutputStream).toByteArray

    // TODO (PHXD-1088): When the source data becomes so large that we can't fit it all into memory, we'll need to perform a refactor here
    val transferResult = sftpClient.transfer(source = fileAsBytes, targetFile = reportFile).map { ioResult =>
      log.info(s"Received result: $ioResult")
      if (ioResult.count == 0) {
        throw new IllegalStateException(
          s"Expected ${fileAsBytes.size} transferred 0. File `$reportFile` has NOT been transferred.")
      }
      if (ioResult.count != fileAsBytes.size) {
        throw new IllegalStateException(
          s"Send bytes of file don't match. Expected ${fileAsBytes.size}, but transferred ${ioResult.count}. File transfer `$reportFile` was corrupted.")
      }
    }

    transferResult.onComplete {
      case Success(_)  => log.info(s"Send report SUCCEEDED for file `$reportFile`")
      case Failure(ex) => log.error(s"Send report FAILED for file `$reportFile`", ex)
    }

    transferResult
  }
}
