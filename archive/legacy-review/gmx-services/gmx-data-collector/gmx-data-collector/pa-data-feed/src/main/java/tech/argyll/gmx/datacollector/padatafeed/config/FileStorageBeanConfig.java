package tech.argyll.gmx.datacollector.padatafeed.config;

import java.util.Collections;
import org.apache.camel.Processor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tech.argyll.gmx.datacollector.common.camel.ProcessorGroup;
import tech.argyll.gmx.datacollector.padatafeed.camel.image.PrepareImageStorageProcessor;
import tech.argyll.gmx.datacollector.padatafeed.camel.intake.PrepareIntakeStorageProcessor;

@Configuration
@ConditionalOnProperty(name = "app.env.storage.mode", havingValue = "file")
public class FileStorageBeanConfig {

  @Bean
  public Processor intakeStorageProcessorGroup(PrepareIntakeStorageProcessor prepareIntakeStorageProcessor) {
    return new ProcessorGroup(Collections.singleton(prepareIntakeStorageProcessor));
  }

  @Bean
  public Processor imageStorageProcessorGroup(PrepareImageStorageProcessor prepareImageStorageProcessor) {
    return new ProcessorGroup(Collections.singleton(prepareImageStorageProcessor));
  }
}
