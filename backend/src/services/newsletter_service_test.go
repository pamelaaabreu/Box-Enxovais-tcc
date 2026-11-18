package services

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestNewsletterDoesNotPromiseUnconfiguredBenefits(t *testing.T) {
	b, e := json.Marshal(newsletterMessage("newsletter@example.invalid"))
	if e != nil {
		t.Fatal(e)
	}
	content := strings.ToLower(string(b))
	for _, s := range []string{"bemvindo10", "cupom", "10%"} {
		if strings.Contains(content, s) {
			t.Fatal("unconfigured benefit in confirmation")
		}
	}
	if !strings.Contains(content, "novidades") {
		t.Fatal("missing subscription confirmation")
	}
}
