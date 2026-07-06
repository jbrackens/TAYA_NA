package cashier

type ReconciliationItemStatus string

const (
	ReconciliationMatched         ReconciliationItemStatus = "matched"
	ReconciliationMissingProvider ReconciliationItemStatus = "missing_provider"
	ReconciliationMissingChain    ReconciliationItemStatus = "missing_chain"
	ReconciliationAmountMismatch  ReconciliationItemStatus = "amount_mismatch"
	ReconciliationQuarantined     ReconciliationItemStatus = "quarantined"
)

type ReconciliationItem struct {
	ID            string
	SubjectType   string
	SubjectID     string
	ExpectedUnits string
	ObservedUnits string
	Asset         string
	Chain         string
	Status        ReconciliationItemStatus
}

type ReconciliationReport struct {
	ID           string
	BusinessDate string
	GeneratedAt  string
	GeneratedBy  string
	Items        []ReconciliationItem
}

type ReconciliationSummary struct {
	ReportID      string
	BusinessDate  string
	ItemCount     int
	MatchedCount  int
	MismatchCount int
	ByStatus      map[ReconciliationItemStatus]int
}

func SummarizeReconciliationReport(report ReconciliationReport) ReconciliationSummary {
	byStatus := map[ReconciliationItemStatus]int{
		ReconciliationMatched:         0,
		ReconciliationMissingProvider: 0,
		ReconciliationMissingChain:    0,
		ReconciliationAmountMismatch:  0,
		ReconciliationQuarantined:     0,
	}

	for _, item := range report.Items {
		byStatus[item.Status]++
	}

	return ReconciliationSummary{
		ReportID:      report.ID,
		BusinessDate:  report.BusinessDate,
		ItemCount:     len(report.Items),
		MatchedCount:  byStatus[ReconciliationMatched],
		MismatchCount: len(report.Items) - byStatus[ReconciliationMatched],
		ByStatus:      byStatus,
	}
}
