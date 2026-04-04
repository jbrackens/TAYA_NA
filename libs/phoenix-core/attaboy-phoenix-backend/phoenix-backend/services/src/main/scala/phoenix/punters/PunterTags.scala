package phoenix.punters

import phoenix.sharding.ProjectionTags.ProjectionTag

object PunterTags {
  val punterTags: Vector[ProjectionTag] =
    Vector(
      ProjectionTag("punters-0"),
      ProjectionTag("punters-1"),
      ProjectionTag("punters-2"),
      ProjectionTag("punters-3"),
      ProjectionTag("punters-4"),
      ProjectionTag("punters-5"),
      ProjectionTag("punters-6"),
      ProjectionTag("punters-7"),
      ProjectionTag("punters-8"),
      ProjectionTag("punters-9"))
}
