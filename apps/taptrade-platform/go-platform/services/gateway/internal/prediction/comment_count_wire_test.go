package prediction

// Step 10 (§3-09) regression: Market has a HAND-ROLLED MarshalJSON
// whitelist — a struct tag alone never reaches the wire. This pins
// commentCount into that whitelist so the field can't silently vanish
// again (it did, during implementation).
import (
	"encoding/json"
	"strings"
	"testing"
)

func TestMarketMarshalCarriesCommentCount(t *testing.T) {
	withCount, err := json.Marshal(Market{ID: "m1", CommentCount: 3})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(withCount), `"commentCount":3`) {
		t.Fatalf("commentCount missing from wire payload: %s", withCount)
	}
	without, err := json.Marshal(Market{ID: "m1"})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(without), "commentCount") {
		t.Fatalf("zero/unstitched count must stay off the wire (omitempty): %s", without)
	}
}
