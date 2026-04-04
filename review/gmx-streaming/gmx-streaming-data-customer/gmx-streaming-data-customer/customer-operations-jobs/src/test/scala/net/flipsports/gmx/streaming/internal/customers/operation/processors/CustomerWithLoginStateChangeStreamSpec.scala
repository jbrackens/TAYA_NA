package net.flipsports.gmx.streaming.internal.customers.operation.processors

import net.flipsports.gmx.streaming.common.job.MetaParameters
import net.flipsports.gmx.streaming.internal.customers.operation.configs.{Features, TopicNames}
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.{CustomerDetailsDataProvider, LoginDataProvider}
import net.flipsports.gmx.streaming.internal.customers.operation.streams.CustomerStateChangeStream
import net.flipsports.gmx.streaming.tests.utils.Retriable
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class CustomerWithLoginStateChangeStreamSpec extends BaseCustomerStateChangeStream with Retriable {

  override val messages = CustomerDetailsDataProvider.asScalaAllWithCurrentRegistration(Some("customerdetails-join.json"))
  override val loginMessages = LoginDataProvider.asScalaAllByCreationDate(Some("logins-join.json"))

  "Application" ignore {
  //TODO: full process not work properlly
    "stream dumy flow customer with login" in {
      withEnvironment { (appConfig, kafkaProperties, schemaRegistryUrl) =>
        val logins = TopicNames.Source.logins(appConfig, metaParameters)
        val customerUpdates = TopicNames.Source.customerUpdates(appConfig, metaParameters)
        val features = Features(dummyJoined = true)

        withCustomers(messages, schemaRegistryUrl, customerUpdates, kafkaProperties)
        withLogins(loginMessages, schemaRegistryUrl, logins, kafkaProperties)

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
       result.isEmpty must be(false)
      }
    }

  }

}
