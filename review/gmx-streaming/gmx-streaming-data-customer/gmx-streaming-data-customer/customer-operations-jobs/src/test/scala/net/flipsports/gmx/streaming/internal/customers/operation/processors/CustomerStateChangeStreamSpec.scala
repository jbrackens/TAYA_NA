package net.flipsports.gmx.streaming.internal.customers.operation.processors

import net.flipsports.gmx.streaming.common.job.MetaParameters
import net.flipsports.gmx.streaming.internal.customers.operation.configs.{Features, TopicNames}
import net.flipsports.gmx.streaming.internal.customers.operation.streams.CustomerStateChangeStream
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class CustomerStateChangeStreamSpec extends BaseCustomerStateChangeStream {

  "Application" should {

    "stream dummy flow customer registration" in {
      withEnvironment { (appConfig, kafkaProperties, schemaRegistryUrl) =>
        val customerUpdates = TopicNames.Source.customerUpdates(appConfig, metaParameters)
        withCustomers(messages, schemaRegistryUrl, customerUpdates, kafkaProperties)
        val features = Features(dummyPreJoinCustomer = true)

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
        result.size must be (7)
      }
    }
  }

}
