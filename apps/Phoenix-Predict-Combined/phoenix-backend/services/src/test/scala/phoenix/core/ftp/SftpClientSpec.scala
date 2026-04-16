package phoenix.core.ftp

import java.io.BufferedInputStream
import java.nio.file.Path

import scala.concurrent.ExecutionContext

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import akka.stream.alpakka.ftp.scaladsl.Sftp
import akka.stream.scaladsl.Framing
import akka.stream.scaladsl.Keep
import akka.stream.scaladsl.Sink
import akka.util.ByteString
import org.scalatest.GivenWhenThen
import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.support.FutureSupport
import phoenix.testcontainers.ConnectionProperties
import phoenix.testcontainers.SftpServer

final class SftpClientSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport
    with Eventually
    with GivenWhenThen {
  private val log: Logger = LoggerFactory.getLogger(getClass)

  implicit val ec: ExecutionContext = system.executionContext
  implicit val materializer: Materializer = Materializer(system)

  "A SftpClient" should {
    val sftpServer = SftpServer.instance
    val sftpServerConnection = sftpServer.connectionProperties
    val config = configFromConnection(sftpServerConnection)
    val sftpSettings = SftpClient.sftpSettingsForConfig(config)

    "transfer file to server" in {
      Given("source file")
      val givenFile = readBinary("data/reports/infrastructure/2021-02-18-Sports Pool Intake Summary.xlsx")
      val givenTarget = "target_file.xlsx"
      val uniqueFolder = sftpServer.initNewFolder()

      val objectUnderTest = SftpClient(config.copy(rootDirectory = uniqueFolder))

      When("transfer is executed")
      val result = await(objectUnderTest.transfer(givenFile, Path.of(givenTarget)))

      Then("transferred bytes should not be 0")
      log.debug(s"Transfer result: $result")
      result.count should not be 0

      And("file exists on server")
      val files = await(Sftp.ls(uniqueFolder, sftpSettings).toMat(Sink.collection)(Keep.right).run())
      log.debug(s"Files listed: ${files.mkString(System.lineSeparator(), System.lineSeparator(), "")}")
      files should have size 1
      files.head.name should be(givenTarget)
    }

    "read file from server" in {
      Given("ftp directory")
      val uniqueFolder = sftpServer.initNewFolder()
      val objectUnderTest = SftpClient(config.copy(rootDirectory = uniqueFolder))

      And("written file")
      val fileName = "example_file.txt"
      val fileContent =
        """
          |line1
          |line2""".stripMargin
      await(objectUnderTest.transfer(fileContent.getBytes, Path.of(fileName)))

      When("reading the file")
      val fileFromFtpServer = awaitSource(
        objectUnderTest
          .read(Path.of(fileName))
          .via(Framing.delimiter(ByteString("\r\n"), maximumFrameLength = 100, allowTruncation = true))
          .map(_.utf8String)).mkString("\n")

      Then("it should match the original content")
      fileFromFtpServer shouldBe fileContent
    }
  }

  private def readBinary(path: String): Array[Byte] = {
    val bis = new BufferedInputStream(this.getClass.getClassLoader.getResourceAsStream(path))
    bis.readAllBytes()
  }

  private def configFromConnection(connectionProperties: ConnectionProperties) =
    SftpConfig(
      host = connectionProperties.host,
      port = connectionProperties.port,
      user = connectionProperties.user,
      password = connectionProperties.password,
      rootDirectory = "")
}
