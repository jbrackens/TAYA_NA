package stella.identity.utils;

import java.io.IOException;

import javax.ws.rs.core.Response.StatusType;

import org.hamcrest.Description;
import org.hamcrest.Matcher;
import org.hamcrest.TypeSafeMatcher;
import org.testcontainers.shaded.okhttp3.Response;

public class ResponseMatcher extends TypeSafeMatcher<Response> {

  private final StatusType expectedStatus;

  public ResponseMatcher(StatusType expectedStatus) {
    this.expectedStatus = expectedStatus;
  }

  @Override
  public boolean matchesSafely(Response response) {
    return response.code() == expectedStatus.getStatusCode();
  }

  public void describeTo(Description description) {
    description.appendText("Response status ").appendValue(expectedStatus.getStatusCode());
  }

  @Override
  protected void describeMismatchSafely(Response response, Description mismatchDescription) {
    mismatchDescription.appendText("was a ").appendValue(response.code());
    try {
      mismatchDescription.appendText(response.body().string());
    } catch (IOException e) {}
  }

  public static Matcher hasStatus(StatusType status) {
    return new ResponseMatcher(status);
  }

}
