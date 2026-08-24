package updates

import "testing"

func TestCompare(t *testing.T) {
	cases := []struct {
		current, latest string
		want            int
	}{
		{"v1.0.0", "v1.0.1", -1},
		{"v1.0.1", "v1.0.0", 1},
		{"v1.2.3", "v1.2.3", 0},
		{"1.0.0", "v1.0.1", -1},
		{"v2.0.0", "v1.9.9", 1},
		{"v1.0.0-rc.1", "v1.0.0", -1},
	}
	for _, tc := range cases {
		got, err := Compare(tc.current, tc.latest)
		if err != nil {
			t.Fatalf("Compare(%q,%q): %v", tc.current, tc.latest, err)
		}
		if got != tc.want {
			t.Fatalf("Compare(%q,%q)=%d want %d", tc.current, tc.latest, got, tc.want)
		}
	}
}

func TestUpdateAvailable(t *testing.T) {
	if UpdateAvailable("dev", "v1.2.3") {
		t.Fatal("dev builds must not report updates")
	}
	if UpdateAvailable("", "v1.2.3") {
		t.Fatal("empty current must not report updates")
	}
	if !UpdateAvailable("v1.0.0", "v1.0.1") {
		t.Fatal("expected update available")
	}
	if UpdateAvailable("v1.0.1", "v1.0.0") {
		t.Fatal("current newer should not report update")
	}
}

func TestNormalizeTag(t *testing.T) {
	if got := NormalizeTag("v1.2.3"); got != "v1.2.3" {
		t.Fatalf("got %q", got)
	}
	if got := NormalizeTag("1.2.3"); got != "v1.2.3" {
		t.Fatalf("got %q", got)
	}
}
