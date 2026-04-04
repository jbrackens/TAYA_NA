package tech.argyll.video.datafeed.config;

import com.google.inject.CreationException;
import com.google.inject.Guice;
import com.google.inject.Injector;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import tech.argyll.video.common.guice.ExceptionHandler;
import tech.argyll.video.core.sbtech.SBTechOperatorType;

@Getter
@Slf4j
public class DataFeedConfig {

  private final Injector injector;

  public DataFeedConfig(SBTechOperatorType operatorType) {
    injector = configureInjector(operatorType);
  }

  private Injector configureInjector(SBTechOperatorType operatorType) {
    try {
      log.info("Creating the Guice injector");
      return Guice.createInjector(new DataFeedModule(operatorType));
    } catch (CreationException e) {
      ExceptionHandler.handleGuiceInjectorException(e);
    }
    return null;
  }
}
