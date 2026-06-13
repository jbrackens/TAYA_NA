package actors;

public class OptaMessage {

	public String url;
	public RequestData data;
	
	public OptaMessage(String url, RequestData data) {
		this.url = url;
		this.data = data;
	}

	@Override
	public String toString() {
		return "OptaMessage [url=" + url + ", data=" + data + "]";
	}
}
