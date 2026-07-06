package cashier

type RecoveryApproval struct {
	ID             string
	RecoveryCaseID string
	OperatorID     string
	ApprovalType   string
	Decision       string
	EvidenceSHA256 string
}

func HasTwoPersonApproval(approvals []RecoveryApproval, approvalType string) bool {
	if approvalType == "" {
		return false
	}
	operators := map[string]bool{}
	for _, approval := range approvals {
		if approval.ApprovalType != approvalType || approval.Decision != "approve" || approval.OperatorID == "" {
			continue
		}
		operators[approval.OperatorID] = true
	}
	return len(operators) >= 2
}
