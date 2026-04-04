package tech.argyll.video.datafeed.config;

import javax.inject.Provider;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.fluent.Executor;
import org.apache.http.impl.client.HttpClients;

public class HttpClientExecutorProvider implements Provider<Executor> {

  @Override
  public Executor get() {
    return Executor.newInstance(
        HttpClients.custom()
            .setDefaultRequestConfig(
                RequestConfig.custom().setCookieSpec(CookieSpecs.STANDARD).build())
            .build());
  }
}
