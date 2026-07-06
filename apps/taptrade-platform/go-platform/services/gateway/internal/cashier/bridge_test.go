package cashier

import "testing"

func TestNextDepositStatusForBridgeEventAdvancesConservatively(t *testing.T) {
	cases := []struct {
		name    string
		current DepositStatus
		event   BridgeEventStatus
		want    DepositStatus
	}{
		{
			name:    "source confirmation after address issued",
			current: DepositAddressIssued,
			event:   BridgeEventSourceConfirmed,
			want:    DepositSourceDetected,
		},
		{
			name:    "destination confirmation first moves source_detected to bridging",
			current: DepositSourceDetected,
			event:   BridgeEventDestinationConfirmed,
			want:    DepositBridging,
		},
		{
			name:    "destination confirmation settles bridging",
			current: DepositBridging,
			event:   BridgeEventDestinationConfirmed,
			want:    DepositSettled,
		},
		{
			name:    "quarantine routes non-terminal intent to recovery",
			current: DepositSourceDetected,
			event:   BridgeEventQuarantined,
			want:    DepositRecoveryRequired,
		},
		{
			name:    "terminal settled ignores later quarantine",
			current: DepositSettled,
			event:   BridgeEventQuarantined,
			want:    DepositSettled,
		},
		{
			name:    "duplicate event does not transition",
			current: DepositAddressIssued,
			event:   BridgeEventIgnoredDuplicate,
			want:    DepositAddressIssued,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := NextDepositStatusForBridgeEvent(tc.current, tc.event)
			if got != tc.want {
				t.Fatalf("NextDepositStatusForBridgeEvent(%q, %q) = %q, want %q", tc.current, tc.event, got, tc.want)
			}
		})
	}
}
