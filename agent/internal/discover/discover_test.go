package discover

import (
	"context"
	"encoding/json"
	"net"
	"testing"
)

func TestScanFindsListeningPort(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:5432")
	if err != nil {
		t.Skip("port 5432 unavailable in this environment")
	}
	defer ln.Close()
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			c.Close()
		}
	}()

	out := Scan(context.Background(), Options{Host: "127.0.0.1", ManagedPort: 5432})
	b, _ := json.MarshalIndent(out, "", "  ")
	t.Log("\n" + string(b))

	var found *Instance
	for i := range out {
		if out[i].Port == 5432 {
			found = &out[i]
		}
	}
	if found == nil {
		t.Fatal("expected the listening port to be discovered")
	}
	if found.Engine != "postgres" || !found.Listening || !found.Managed {
		t.Fatalf("unexpected instance: %+v", *found)
	}
}

func TestParseLsof(t *testing.T) {
	out := parseLsof("p900\ncpostgres\nn127.0.0.1:5432\ncmysqld\nn*:3306\n")
	if out[5432] != "postgres" || out[3306] != "mysqld" {
		t.Fatalf("unexpected parse: %+v", out)
	}
}

func TestParseSS(t *testing.T) {
	line := `LISTEN 0 244 127.0.0.1:5432 0.0.0.0:* users:(("postgres",pid=900,fd=7))`
	if got := parseSS(line); got[5432] != "postgres" {
		t.Fatalf("unexpected parse: %+v", got)
	}
}
