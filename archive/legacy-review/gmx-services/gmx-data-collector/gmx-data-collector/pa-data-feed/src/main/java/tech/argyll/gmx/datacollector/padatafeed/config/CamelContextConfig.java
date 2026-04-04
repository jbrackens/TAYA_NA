package tech.argyll.gmx.datacollector.padatafeed.config;

import org.apache.camel.CamelContext;
import org.apache.camel.Endpoint;
import org.apache.camel.spring.boot.CamelContextConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CamelContextConfig {

  @Autowired
  private CamelContext camelContext;

  @Bean
  public CamelContextConfiguration contextConfiguration() {
    return new CamelContextConfiguration() {
      @Override
      public void beforeApplicationStart(CamelContext context) {
        context.setUseMDCLogging(true);
      }

      @Override
      public void afterApplicationStart(CamelContext camelContext) {
      }
    };
  }

  @Bean
  public Endpoint storeIntakeEndpoint(@Value("${app.storage.intake.endpoint.uri}") String silksUri) {
    return camelContext.getEndpoint(silksUri);
  }

  @Bean
  public Endpoint storeImageEndpoint(@Value("${app.storage.silks.endpoint.uri}") String silksUri) {
    return camelContext.getEndpoint(silksUri);
  }

  @Bean
  public Endpoint pipelineKafkaEndpoint(@Value("${app.pipeline.kafka.endpoint.uri}") String silksUri) {
    return camelContext.getEndpoint(silksUri);
  }
}
