package auth

import (
	"errors"
	"fmt"
	"strings"
	"unicode"
)

// MinPasswordLength is the floor for console passwords.
const MinPasswordLength = 10

// ValidateUsername checks the shape of a console account name.
func ValidateUsername(name string) error {
	name = strings.TrimSpace(name)
	if len(name) < 3 || len(name) > 64 {
		return errors.New("username must be between 3 and 64 characters")
	}
	for _, r := range name {
		ok := unicode.IsLetter(r) || unicode.IsDigit(r) || r == '.' || r == '_' || r == '-'
		if !ok {
			return errors.New("username may contain only letters, digits, dot, underscore and hyphen")
		}
	}
	return nil
}

// ValidatePassword enforces a minimum length and a little variety.
func ValidatePassword(pw string) error {
	if len([]rune(pw)) < MinPasswordLength {
		return fmt.Errorf("password must be at least %d characters", MinPasswordLength)
	}
	var hasLetter, hasOther bool
	for _, r := range pw {
		switch {
		case unicode.IsLetter(r):
			hasLetter = true
		default:
			hasOther = true
		}
	}
	if !hasLetter || !hasOther {
		return errors.New("password must mix letters with at least one digit or symbol")
	}
	return nil
}
