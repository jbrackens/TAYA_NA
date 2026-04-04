package stella.identity.rest;

public interface ResponseWrapper<T> {
  String OK_STATUS = "ok";
  String ERROR_STATUS = "error";

  String getStatus();

  T getDetails();
}
