package prediction

import "encoding/json"

var emptyJSONObject = json.RawMessage(`{}`)

func defaultJSONObject(value json.RawMessage) json.RawMessage {
	if len(value) == 0 {
		return append(json.RawMessage(nil), emptyJSONObject...)
	}
	return value
}
