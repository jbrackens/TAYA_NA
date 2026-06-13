package gmx.users.internal.source

import gmx.users.internal.aggregate.UserCommand
import org.apache.avro.specific.SpecificRecord

trait RecordToCommandProcessor[-VALUE <: SpecificRecord] {

  def provideCustomerId(key: VALUE): String

  def extractCommands(
      brandId: String,
      value: VALUE
    ): Seq[UserCommand]
}
