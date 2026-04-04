package tech.argyll.gmx.datacollector.padatafeed.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tech.argyll.gmx.datacollector.common.assets.AssetsURLBuilder;
import tech.argyll.gmx.datacollector.common.camel.HeaderHelper;
import tech.argyll.gmx.datacollector.common.camel.HeaderHelperImpl;
import tech.argyll.gmx.datacollector.common.camel.LogRequestHeaderProcessor;

@Configuration
public class CommonBeanConfig {

  @Bean
  public AssetsURLBuilder urlBuilder() {
    return new AssetsURLBuilder();
  }

  @Bean
  public HeaderHelper headerHelper() {
    return new HeaderHelperImpl();
  }

  @Bean
  public LogRequestHeaderProcessor logRequestHeaderProcessor(HeaderHelper headerHelper) {
    return new LogRequestHeaderProcessor(headerHelper);
  }
}