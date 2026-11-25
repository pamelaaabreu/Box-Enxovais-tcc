package response

import (
	"bytes"
	"errors"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type failingPayload struct{}

func (failingPayload) MarshalJSON() ([]byte, error) { return nil, errors.New("private-secret") }

type recordingWriter struct {
	header           http.Header
	statuses, writes int
	lastStatus       int
	body             bytes.Buffer
	fail, short      bool
}

func (w *recordingWriter) Header() http.Header {
	if w.header == nil {
		w.header = make(http.Header)
	}
	return w.header
}
func (w *recordingWriter) WriteHeader(status int) { w.statuses++; w.lastStatus = status }
func (w *recordingWriter) Write(p []byte) (int, error) {
	w.writes++
	if w.fail {
		return 0, errors.New("private-secret")
	}
	if w.short {
		return len(p) - 1, nil
	}
	return w.body.Write(p)
}

func TestJSONFallbackAndSafeLogs(t *testing.T) {
	var logs bytes.Buffer
	previous := log.Writer()
	log.SetOutput(&logs)
	defer log.SetOutput(previous)
	w := httptest.NewRecorder()
	JSON(w, http.StatusOK, failingPayload{})
	if w.Code != 500 || strings.TrimSpace(w.Body.String()) != internalErrorJSON {
		t.Fatalf("fallback=%d %s", w.Code, w.Body.String())
	}
	if strings.Contains(logs.String(), "private-secret") || !strings.Contains(logs.String(), "serialização") {
		t.Fatal("unsafe or missing log")
	}
}
func TestNoContentHasNoBody(t *testing.T) {
	for _, call := range []func(http.ResponseWriter){func(w http.ResponseWriter) { JSON(w, 204, failingPayload{}) }, func(w http.ResponseWriter) { Success(w, 204, "ignored", map[string]int{"id": 1}) }, func(w http.ResponseWriter) { Error(w, 204, "ignored") }} {
		w := &recordingWriter{}
		w.Header().Set("Content-Length", "100")
		call(w)
		if w.lastStatus != http.StatusNoContent || w.statuses != 1 || w.writes != 0 || w.body.Len() != 0 || w.Header().Get("Content-Length") != "" {
			t.Fatal("204 wrote content")
		}
	}
}
func TestWriteFailureDoesNotRetry(t *testing.T) {
	var logs bytes.Buffer
	previous := log.Writer()
	log.SetOutput(&logs)
	defer log.SetOutput(previous)
	for _, writer := range []*recordingWriter{{fail: true}, {short: true}} {
		JSON(writer, 200, map[string]int{"id": 1})
		if writer.statuses != 1 || writer.writes != 1 {
			t.Fatal("multiple writes")
		}
	}
	if strings.Contains(logs.String(), "private-secret") || !strings.Contains(logs.String(), "bytes=") {
		t.Fatal("unsafe or missing write log")
	}
}
func TestResponseContracts(t *testing.T) {
	w := httptest.NewRecorder()
	Success(w, 201, "ok", map[string]int{"id": 1})
	if w.Code != 201 || w.Body.String() != `{"success":true,"message":"ok","data":{"id":1}}`+"\n" {
		t.Fatal(w.Code, w.Body.String())
	}
	w = httptest.NewRecorder()
	Error(w, 400, "invalid")
	if w.Code != 400 || w.Body.String() != `{"success":false,"message":"invalid"}`+"\n" {
		t.Fatal(w.Code, w.Body.String())
	}
}
