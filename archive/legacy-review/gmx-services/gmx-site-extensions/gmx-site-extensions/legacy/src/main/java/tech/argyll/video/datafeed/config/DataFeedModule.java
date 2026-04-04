package tech.argyll.video.datafeed.config;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JSR310Module;
import com.google.inject.AbstractModule;
import com.google.inject.Provides;
import com.google.inject.assistedinject.FactoryModuleBuilder;
import io.ebean.EbeanServer;
import javax.inject.Singleton;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.client.fluent.Executor;
import tech.argyll.video.common.http.GetMethodCall;
import tech.argyll.video.common.http.PostMethodCall;
import tech.argyll.video.core.sbtech.SBTechOperatorType;

@Slf4j
@AllArgsConstructor
public class DataFeedModule extends AbstractModule {

  private final SBTechOperatorType operatorType;

  @Override
  protected void configure() {
    try {
      bind(Executor.class).toProvider(HttpClientExecutorProvider.class).asEagerSingleton();
      bind(GetMethodCall.class)
          .toConstructor(GetMethodCall.class.getConstructor(Executor.class))
          .in(Singleton.class);
      bind(PostMethodCall.class)
          .toConstructor(PostMethodCall.class.getConstructor(Executor.class))
          .in(Singleton.class);
      bind(SBTechOperatorType.class).toInstance(operatorType);

      install(new FactoryModuleBuilder().build(OddsJSONFeedOperationFactory.class));

      bind(EbeanServer.class).toProvider(EbeanServerProvider.class).asEagerSingleton();
    } catch (Exception e) {
      log.error("Could not configure Guice module", e);
    }
  }

  @Provides
  public ObjectMapper buildObjectMapper() {
    ObjectMapper result = new ObjectMapper();

    result.registerModule(new JSR310Module());
    result.configure(SerializationFeature.WRITE_DATE_TIMESTAMPS_AS_NANOSECONDS, false);
    result.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);

    result.setPropertyNamingStrategy(new PropertyNamingStrategy.PascalCaseStrategy());
    result.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    result.setSerializationInclusion((JsonInclude.Include.NON_EMPTY));

    return result;
  }
}
