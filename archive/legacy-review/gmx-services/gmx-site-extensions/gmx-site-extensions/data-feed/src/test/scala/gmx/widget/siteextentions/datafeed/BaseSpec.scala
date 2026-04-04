package gmx.widget.siteextentions.datafeed

import com.typesafe.scalalogging.LazyLogging
import org.scalatest.GivenWhenThen
import org.scalatest.OptionValues
import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

trait BaseSpec
    extends AnyWordSpecLike
    with Matchers
    with OptionValues
    with LazyLogging
    with Eventually
    with GivenWhenThen
