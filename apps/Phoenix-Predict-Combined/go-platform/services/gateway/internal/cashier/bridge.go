package cashier

type BridgeEventStatus string

const (
	BridgeEventReceived             BridgeEventStatus = "received"
	BridgeEventSignatureVerified    BridgeEventStatus = "signature_verified"
	BridgeEventSourceConfirmed      BridgeEventStatus = "source_confirmed"
	BridgeEventDestinationConfirmed BridgeEventStatus = "destination_confirmed"
	BridgeEventIgnoredDuplicate     BridgeEventStatus = "ignored_duplicate"
	BridgeEventQuarantined          BridgeEventStatus = "quarantined"
	BridgeEventFailed               BridgeEventStatus = "failed"
)

func NextDepositStatusForBridgeEvent(current DepositStatus, event BridgeEventStatus) DepositStatus {
	if IsTerminalDeposit(current) {
		return current
	}

	switch event {
	case BridgeEventSourceConfirmed:
		if CanTransitionDeposit(current, DepositSourceDetected) {
			return DepositSourceDetected
		}
	case BridgeEventDestinationConfirmed:
		if CanTransitionDeposit(current, DepositSettled) {
			return DepositSettled
		}
		if CanTransitionDeposit(current, DepositBridging) {
			return DepositBridging
		}
	case BridgeEventQuarantined:
		if CanTransitionDeposit(current, DepositRecoveryRequired) {
			return DepositRecoveryRequired
		}
	case BridgeEventFailed:
		if CanTransitionDeposit(current, DepositFailed) {
			return DepositFailed
		}
	}

	return current
}
