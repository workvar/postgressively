package api

import (
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/postggresively/backend/internal/updates"
	"github.com/postggresively/backend/internal/version"
)

type updateStatusResponse struct {
	Current       string `json:"current"`
	Latest        string `json:"latest,omitempty"`
	Available     bool   `json:"available"`
	Kind          string `json:"kind"`
	CanAutoUpdate bool   `json:"canAutoUpdate"`
	Reason        string `json:"reason,omitempty"`
	Notes         string `json:"notes,omitempty"`
	HTMLURL       string `json:"htmlUrl,omitempty"`
	Commands      string `json:"commands,omitempty"`
	CheckError    string `json:"checkError,omitempty"`
}

// GET /api/updates
func (s *Server) handleUpdatesGet(w http.ResponseWriter, r *http.Request) {
	out := updateStatusResponse{
		Current: version.Version,
		Kind:    s.cfg.InstallKind,
	}

	if s.updates != nil {
		if rel, err := s.updates.Latest(r.Context()); err != nil {
			out.CheckError = "could not check for updates"
		} else {
			out.Latest = rel.Tag
			out.HTMLURL = rel.HTMLURL
			out.Notes = truncateNotes(rel.Notes, 4000)
			out.Available = updates.UpdateAvailable(version.Version, rel.Tag)
		}
	}

	caps, err := s.agent.UpdateCapabilities(r.Context())
	if err != nil {
		if out.Kind == "" {
			out.Reason = "agent unreachable; cannot determine update capabilities"
		} else {
			out.Reason = "agent unreachable"
		}
		writeJSON(w, http.StatusOK, out)
		return
	}
	if kind, _ := caps["kind"].(string); kind != "" {
		out.Kind = kind
	}
	if v, ok := caps["canAutoUpdate"].(bool); ok {
		out.CanAutoUpdate = v
	}
	if reason, _ := caps["reason"].(string); reason != "" && !out.CanAutoUpdate {
		out.Reason = reason
	}
	if cmds, _ := caps["commands"].(string); cmds != "" {
		out.Commands = strings.ReplaceAll(cmds, "VERSION", coalesce(out.Latest, "VERSION"))
	} else if out.Kind == "docker" && !out.CanAutoUpdate {
		out.Commands = dockerFallbackCommands(s.cfg.InstallRoot, out.Latest)
	}
	if out.Available && !out.CanAutoUpdate && out.Reason == "" {
		out.Reason = "download the release manually, or enable auto-update for this install"
	}
	writeJSON(w, http.StatusOK, out)
}

// POST /api/updates/apply — elevated.
func (s *Server) handleUpdatesApply(w http.ResponseWriter, r *http.Request) {
	if s.cfg.ReadOnly {
		writeErr(w, http.StatusForbidden, "server is in read-only mode")
		return
	}
	var req struct {
		Tag string `json:"tag"`
	}
	_ = decode(r, &req)

	tag := strings.TrimSpace(req.Tag)
	if tag == "" && s.updates != nil {
		if rel, err := s.updates.Latest(r.Context()); err == nil {
			tag = rel.Tag
		}
	}
	if tag == "" {
		writeErr(w, http.StatusBadRequest, "tag is required")
		return
	}
	if !updates.UpdateAvailable(version.Version, tag) && version.Version != "dev" {
		// Allow explicit apply of latest even if compare fails oddly; still
		// block applying an older or equal tag for non-dev builds.
		if cmp, err := updates.Compare(version.Version, tag); err == nil && cmp >= 0 {
			writeErr(w, http.StatusBadRequest, "already on this version or newer")
			return
		}
	}

	kind := s.cfg.InstallKind
	out, err := s.agent.UpdateApply(r.Context(), tag, kind)
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	s.audit(r, "update.applied", tag, map[string]any{"kind": kind})
	writeJSON(w, http.StatusAccepted, out)
}

// GET /api/updates/status
func (s *Server) handleUpdatesStatus(w http.ResponseWriter, r *http.Request) {
	out, err := s.agent.UpdateStatus(r.Context())
	if err != nil {
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func truncateNotes(s string, n int) string {
	s = strings.TrimSpace(s)
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	runes := []rune(s)
	return string(runes[:n]) + "…"
}

func coalesce(a, b string) string {
	if a != "" {
		return a
	}
	return b
}

func dockerFallbackCommands(root, tag string) string {
	if root == "" {
		root = "."
	}
	if tag == "" {
		tag = "VERSION"
	}
	return "cd " + root + "\nexport POSTGGRESSIVELY_VERSION=" + tag + "\ndocker compose pull\ndocker compose up -d\n"
}
