package phoenix.core

import io.circe.Codec
import io.circe.Encoder
import io.circe.generic.codec.DerivedAsObjectCodec
import io.circe.generic.semiauto.deriveCodec
import shapeless.Lazy

package object serialization {
  def deriveCodecWithMigrations[A](implicit
      lazyCodec: Lazy[DerivedAsObjectCodec[A]],
      migration: CirceMigrations[A]): Codec.AsObject[A] = {
    val codec = deriveCodec(lazyCodec)
    val decoder = codec.prepare(migration.decoderFunction)
    val encoder = codec.mapJson(migration.encoderFunction)
    val encoderAsObject = Encoder.AsObject.instance[A](encoder.apply(_).asObject.get)
    Codec.AsObject.from[A](decoder, encoderAsObject)
  }
}
