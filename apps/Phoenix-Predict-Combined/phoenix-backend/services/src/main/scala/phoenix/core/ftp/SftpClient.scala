package phoenix.core.ftp

import java.net.InetAddress
import java.nio.file.Path

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.jdk.CollectionConverters._

import akka.stream.IOResult
import akka.stream.Materializer
import akka.stream.alpakka.ftp.FtpCredentials
import akka.stream.alpakka.ftp.SftpSettings
import akka.stream.alpakka.ftp.scaladsl.Sftp
import akka.stream.scaladsl.Source
import akka.util.ByteString
import cats.Monad
import cats.syntax.functor._
import org.slf4j.Logger
import org.slf4j.LoggerFactory

final class SftpClient(config: SftpConfig)(implicit m: Materializer, ec: ExecutionContext) {
  private val filesystemRoot: Path = Path.of("/")
  private def baseDirectory: Path = Path.of(config.rootDirectory)

  private val log: Logger = LoggerFactory.getLogger(getClass)

  private val sftpSettings = SftpClient.sftpSettingsForConfig(config)

  def transfer(source: Array[Byte], targetFile: Path): Future[IOResult] = {
    val targetPath = baseDirectory.resolve(targetFile)
    log.debug(s"Transfer to destination: ${targetPath.toString}")
    for {
      _ <- ensureParentDirectoryExists(targetPath)
      // TODO (PHXD-1088): When the source data becomes so large that we can't fit it all into memory, we'll need to perform a refactor here
      result <- Source.single(ByteString(source)).runWith(Sftp.toPath(targetPath.toString, sftpSettings))
    } yield result
  }

  def read(file: Path): Source[ByteString, Future[IOResult]] = {
    val targetPath = baseDirectory.resolve(file)
    log.debug(s"Reading from destination: ${targetPath.toString}")
    Sftp.fromPath(targetPath.toString, sftpSettings)
  }

  private def ensureParentDirectoryExists(file: Path): Future[Unit] = {
    Monad[Future].tailRecM(filesystemRoot -> nonRootDirectoriesOf(file)) {
      case (_, Nil) =>
        Future.successful(Right(()))
      case (parent, directory :: others) =>
        ensureDirectoryExists(parent, directory).as(Left(parent.resolve(directory) -> others))
    }
  }

  private def nonRootDirectoriesOf(file: Path): List[Path] =
    Option(file.getParent).toList.flatMap(_.iterator().asScala).filterNot(_ == filesystemRoot)

  private def ensureDirectoryExists(parentDir: Path, directory: Path): Future[Unit] = {
    log.debug(s"Creating directory ${directory.toString} in base directory ${parentDir.toString}")
    Sftp.mkdirAsync(parentDir.toString, directory.toString, sftpSettings).void
  }
}

object SftpClient {
  def sftpSettingsForConfig(config: SftpConfig): SftpSettings =
    SftpSettings
      .create(InetAddress.getByName(config.host))
      .withPort(config.port)
      .withCredentials(FtpCredentials.create(config.user, config.password))
      // TODO (PHXD-1076): fix when connecting to FTP on DEV
      .withStrictHostKeyChecking(false)

  def apply(config: SftpConfig)(implicit m: Materializer, ec: ExecutionContext): SftpClient = {
    new SftpClient(config)
  }
}

final case class SftpConfig(host: String, port: Int, user: String, password: String, rootDirectory: String)
