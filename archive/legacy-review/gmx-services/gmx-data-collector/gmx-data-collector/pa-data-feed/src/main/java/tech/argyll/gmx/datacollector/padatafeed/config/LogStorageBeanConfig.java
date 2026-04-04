package tech.argyll.gmx.datacollector.padatafeed.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "app.env.storage.mode", havingValue = "log")
public class LogStorageBeanConfig extends FileStorageBeanConfig {

}
