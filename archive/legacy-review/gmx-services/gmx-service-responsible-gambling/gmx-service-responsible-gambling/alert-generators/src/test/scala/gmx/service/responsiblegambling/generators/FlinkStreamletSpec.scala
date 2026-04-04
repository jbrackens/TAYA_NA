package gmx.service.responsiblegambling.generators

import cloudflow.flink.testkit._
import org.scalatest._
import org.scalatest.matchers._
import org.scalatest.wordspec.AnyWordSpecLike

class FlinkStreamletSpec
  extends FlinkTestkit
      with AnyWordSpecLike
      with should.Matchers
      with BeforeAndAfterAll
      with SpecHelpers {}
