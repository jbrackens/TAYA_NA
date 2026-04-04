package net.flipsports.gmx.streaming.internal.customers.operation.processors

import net.flipsports.gmx.streaming.common.job.MetaParameters
import net.flipsports.gmx.streaming.internal.customers.operation.configs.{Features, TopicNames}
import net.flipsports.gmx.streaming.internal.customers.operation.streams.CustomerStateChangeStream
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class LoginsStateChangeStreamSpec extends BaseCustomerStateChangeStream {

  "Application" should {

    "stream dummy flow customer login" in {
      withEnvironment { (appConfig, kafkaProperties, schemaRegistryUrl) =>
        val logins = TopicNames.Source.logins(appConfig, metaParameters)
        withLogins(loginMessages, schemaRegistryUrl, logins, kafkaProperties)
        val features = Features(dummyPreJoinLogin = true)

        val job = new CustomerStateChangeStream(
          args = Array.empty[String],
          metaParameters = MetaParameters("", Some(checkpoints)),
          businessMetaParameters = metaParameters,
          configuration = withFeatures(appConfig, features)) {
          override def failIfAnyDummyEnabled(): Unit = {/*should not fail*/}
        }

        withResult(job.targetTopic, schemaRegistryUrl)

        runAsyncJob(job.stream())

        val result = getResult(kafkaProperties, job.targetTopic, schemaRegistryUrl)

        result.size must be (8)
      }
    }
  }

}
