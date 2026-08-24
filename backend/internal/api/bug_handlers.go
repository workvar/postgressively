package api

import (
	"errors"
	"log"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/postggresively/backend/internal/bugs"
	"github.com/postggresively/backend/internal/version"
)

const (
	maxBugTitleLen = 120
	maxBugBodyLen  = 8000
)

type bugStatusResponse struct {
	Configured bool `json:"configured"`
}

type bugCreateResponse struct {
	URL    string `json:"url"`
	Number int    `json:"number"`
	Title  string `json:"title"`
}

// GET /api/bugs — whether this build can file issues upstream.
func (s *Server) handleBugsStatus(w http.ResponseWriter, r *http.Request) {
	configured := s.bugs != nil && s.bugs.Configured()
	writeJSON(w, http.StatusOK, bugStatusResponse{Configured: configured})
}

// POST /api/bugs — create a GitHub Issue labelled "bug".
func (s *Server) handleBugCreate(w http.ResponseWriter, r *http.Request) {
	if s.bugs == nil || !s.bugs.Configured() {
		writeErr(w, http.StatusServiceUnavailable, "bug reporting is not available in this build")
		return
	}

	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Path        string `json:"path"`
		UserAgent   string `json:"userAgent"`
	}
	if err := decode(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		writeErr(w, http.StatusBadRequest, "title is required")
		return
	}
	if utf8.RuneCountInString(title) > maxBugTitleLen {
		writeErr(w, http.StatusBadRequest, "title is too long")
		return
	}
	desc := strings.TrimSpace(req.Description)
	if utf8.RuneCountInString(desc) > maxBugBodyLen {
		writeErr(w, http.StatusBadRequest, "description is too long")
		return
	}

	actor := subject(r)
	if err := s.bugs.Allow(actor); err != nil {
		if errors.Is(err, bugs.ErrRateLimited) {
			writeErr(w, http.StatusTooManyRequests, "too many bug reports; try again later")
			return
		}
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	body := bugs.FormatBody(desc, bugs.Meta{
		Version:   version.Version,
		UserAgent: strings.TrimSpace(req.UserAgent),
		Path:      strings.TrimSpace(req.Path),
	})

	issue, err := s.bugs.Create(r.Context(), bugs.Report{Title: title, Body: body})
	if err != nil {
		if errors.Is(err, bugs.ErrNotConfigured) {
			writeErr(w, http.StatusServiceUnavailable, "bug reporting is not available in this build")
			return
		}
		if errors.Is(err, bugs.ErrInvalidTitle) {
			writeErr(w, http.StatusBadRequest, "title is required")
			return
		}
		log.Printf("bug report: %v", err)
		writeErr(w, http.StatusBadGateway, "could not create GitHub issue")
		return
	}

	s.audit(r, "bug.reported", issue.URL, map[string]any{
		"number": issue.Number,
		"title":  issue.Title,
	})
	writeJSON(w, http.StatusCreated, bugCreateResponse{
		URL:    issue.URL,
		Number: issue.Number,
		Title:  issue.Title,
	})
}
