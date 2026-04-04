package tech.argyll.gmx.datacollector.padatafeed;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.PropertySource;
import org.springframework.context.annotation.PropertySources;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;

@SpringBootApplication(
    scanBasePackages = "tech.argyll.gmx.datacollector"
)
@PropertySources({
    @PropertySource("classpath:env/${app.env.env}/env.properties"),
    @PropertySource("classpath:storage/${app.env.storage.mode}/storage.properties")
})
public class PADataFeedApplication {

  public static void main(String[] args) {
    SpringApplication.run(PADataFeedApplication.class, args);
  }

  @Bean
  public static PropertySourcesPlaceholderConfigurer propertySourcesPlaceholderConfigurer() {
    PropertySourcesPlaceholderConfigurer result = new PropertySourcesPlaceholderConfigurer();
    result.setIgnoreUnresolvablePlaceholders(false);
    return result;
  }
}