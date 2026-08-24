package update

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

func downloadFile(url, dest string) error {
	client := &http.Client{Timeout: 15 * time.Minute}
	res, err := client.Get(url)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("download %s: %s", url, res.Status)
	}
	f, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, res.Body)
	return err
}
