package idcomply

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/phoenixbot/phoenix-user/internal/models"
)

type Adapter struct {
	kbaProvider  string
	idpvProvider string
}

func New(kbaProvider, idpvProvider string) *Adapter {
	return &Adapter{
		kbaProvider:  normalizedProvider(kbaProvider),
		idpvProvider: normalizedProvider(idpvProvider),
	}
}

func (a *Adapter) BuildKBASession(sessionID string) ([]models.KBAQuestion, string) {
	return defaultQuestions(), fmt.Sprintf("%s:kba:%s", a.kbaProvider, sessionID)
}

func (a *Adapter) EvaluateKBAAnswers(answers []models.KBAAnswer) (bool, string) {
	if len(answers) < 3 {
		return false, "KBA_MIN_ANSWERS_NOT_MET"
	}
	seen := make(map[string]struct{}, len(answers))
	for _, answer := range answers {
		questionID := strings.TrimSpace(answer.QuestionID)
		if questionID == "" {
			return false, "KBA_INVALID_QUESTION"
		}
		if _, exists := seen[questionID]; exists {
			return false, "KBA_DUPLICATE_QUESTION"
		}
		seen[questionID] = struct{}{}
		if strings.TrimSpace(answer.Answer) == "" && strings.TrimSpace(answer.Choice) == "" {
			return false, "KBA_EMPTY_ANSWER"
		}
	}
	return true, ""
}

func (a *Adapter) StartIDPV(sessionID, redirectBase string) (string, string, string) {
	redirectURL := appendSessionID(redirectBase, sessionID)
	return redirectURL, fmt.Sprintf("%s:idpv:%s", a.idpvProvider, sessionID), "pending_review"
}

func (a *Adapter) NextIDPVStatus(session *models.VerificationSession, user *models.User) (string, string, bool) {
	if user != nil && user.PublicKYCStatus() == "approved" {
		return "approved", "", true
	}
	switch strings.ToLower(strings.TrimSpace(session.Status)) {
	case "approved":
		return "approved", "", true
	case "rejected", "failed":
		return "rejected", firstNonEmpty(session.LastErrorCode, "IDPV_REJECTED"), true
	case "submitted_to_provider":
		return "provider_reviewing", "", false
	case "provider_reviewing", "pending_review":
		return "pending_review", "", false
	default:
		return "pending_review", "", false
	}
}

func (a *Adapter) KBAProvider() string {
	return a.kbaProvider
}

func (a *Adapter) IDPVProvider() string {
	return a.idpvProvider
}

func defaultQuestions() []models.KBAQuestion {
	return []models.KBAQuestion{
		{QuestionID: "0", Text: "What is your ZIP code?", Choices: []string{"36101", "27513", "10001"}},
		{QuestionID: "1", Text: "Which city is associated with your address?", Choices: []string{"NEWPORT NEWS CITY", "AUSTIN", "TAMPA"}},
		{QuestionID: "2", Text: "Which street have you been associated with?", Choices: []string{"GLADSTONE", "BROADWAY", "ELM"}},
	}
}

func normalizedProvider(value string) string {
	if strings.TrimSpace(value) == "" {
		return "idcomply"
	}
	return strings.ToLower(strings.TrimSpace(value))
}

func appendSessionID(baseURL, sessionID string) string {
	if strings.TrimSpace(baseURL) == "" {
		return sessionID
	}
	parsed, err := url.Parse(baseURL)
	if err != nil {
		return baseURL
	}
	query := parsed.Query()
	query.Set("sessionId", sessionID)
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
