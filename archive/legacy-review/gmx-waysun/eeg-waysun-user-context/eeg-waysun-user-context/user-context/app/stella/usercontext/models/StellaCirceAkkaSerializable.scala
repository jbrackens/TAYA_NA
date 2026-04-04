package stella.usercontext.models

import org.virtuslab.ash.annotation.SerializabilityTrait

/**
 * This marker trait is required by Akka for all classes whose instances are either:
 *  - sent as messages between actors
 *  - persisted as events
 *  - used as entity state (for snapshots)
 *
 * If this annotation is NOT present, Akka tries to use Java serialization as a fallback,
 * which we don't want to use due to performance and binary compatibility maintenance reasons.
 *
 * The requirement of implementing this trait does NOT apply transitively to the fields of message/event classes.
 *
 * There is a different requirement - all top-level sealed traits must be registered in
 * StellaCirceAkkaSerializer. If they are not, then the project won't compile.
 *
 * @see [[stella.usercontext.services.StellaCirceAkkaSerializer]] for more details
 */
@SerializabilityTrait
trait StellaCirceAkkaSerializable
