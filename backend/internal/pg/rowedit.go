package pg

import (
	"context"
	"errors"
	"fmt"
	"strings"
)

// ErrNoPrimaryKey blocks edits on relations we cannot address a single row in.
var ErrNoPrimaryKey = errors.New("table has no primary key, so rows cannot be edited safely")

// RowChange is one pending edit from the grid.
//
// Kind is "insert", "update" or "delete". Values carries the new column values
// for inserts and updates; Key carries the primary-key values that identify the
// row for updates and deletes.
type RowChange struct {
	Kind   string         `json:"kind"`
	Values map[string]any `json:"values,omitempty"`
	Key    map[string]any `json:"key,omitempty"`
}

// ChangeSet is the batch the grid sends when the user clicks Save.
type ChangeSet struct {
	Schema string      `json:"schema"`
	Table  string      `json:"table"`
	Rows   []RowChange `json:"changes"`
	DryRun bool        `json:"dryRun"`
}

// statement is one generated SQL statement plus its bound arguments.
type statement struct {
	SQL  string
	Args []any
}

// ChangeResult reports what a change set did, or would do on a dry run.
type ChangeResult struct {
	Script       []string `json:"script"`
	Applied      bool     `json:"applied"`
	RowsAffected int64    `json:"rowsAffected"`
	Inserts      int      `json:"inserts"`
	Updates      int      `json:"updates"`
	Deletes      int      `json:"deletes"`
}

// HasDeletes reports whether the batch removes data, which the API treats as a
// critical action needing step-up authentication.
func (cs ChangeSet) HasDeletes() bool {
	for _, c := range cs.Rows {
		if c.Kind == "delete" {
			return true
		}
	}
	return false
}

// ApplyChanges validates a change set against the live table definition and
// runs every statement in one transaction. A dry run generates the same SQL and
// rolls back, so the preview the user approves is the script that executes.
func (s *Store) ApplyChanges(ctx context.Context, cs ChangeSet) (*ChangeResult, error) {
	cols, err := s.Columns(ctx, cs.Schema, cs.Table)
	if err != nil {
		return nil, err
	}
	if len(cols) == 0 {
		return nil, fmt.Errorf("table %s.%s not found", cs.Schema, cs.Table)
	}

	known := map[string]bool{}
	var pk []string
	for _, c := range cols {
		known[c.Name] = true
		if c.IsPK {
			pk = append(pk, c.Name)
		}
	}
	if len(pk) == 0 {
		return nil, ErrNoPrimaryKey
	}

	target := quoteIdent(cs.Schema) + "." + quoteIdent(cs.Table)
	stmts := make([]statement, 0, len(cs.Rows))
	res := &ChangeResult{Script: []string{}}

	for i, change := range cs.Rows {
		st, err := buildStatement(target, known, pk, change)
		if err != nil {
			return nil, fmt.Errorf("change %d: %w", i+1, err)
		}
		stmts = append(stmts, st)
		res.Script = append(res.Script, renderScript(st))
		switch change.Kind {
		case "insert":
			res.Inserts++
		case "update":
			res.Updates++
		case "delete":
			res.Deletes++
		}
	}

	if len(stmts) == 0 {
		return res, nil
	}

	affected, err := s.runInTx(ctx, stmts, cs.DryRun)
	if err != nil {
		return nil, err
	}
	res.RowsAffected = affected
	res.Applied = !cs.DryRun
	return res, nil
}

// runInTx executes every statement in order. On a dry run the transaction is
// rolled back, which still surfaces constraint violations to the caller.
func (s *Store) runInTx(ctx context.Context, stmts []statement, dryRun bool) (int64, error) {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var affected int64
	for i, st := range stmts {
		tag, err := tx.Exec(ctx, st.SQL, st.Args...)
		if err != nil {
			return 0, fmt.Errorf("statement %d (%s): %w", i+1, st.SQL, err)
		}
		if tag.RowsAffected() == 0 {
			return 0, fmt.Errorf("statement %d matched no rows: %s", i+1, st.SQL)
		}
		affected += tag.RowsAffected()
	}

	if dryRun {
		return affected, nil
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return affected, nil
}

func buildStatement(target string, known map[string]bool, pk []string, c RowChange) (statement, error) {
	switch c.Kind {
	case "insert":
		return buildInsert(target, known, c)
	case "update":
		return buildUpdate(target, known, pk, c)
	case "delete":
		return buildDelete(target, pk, c)
	default:
		return statement{}, fmt.Errorf("unknown change kind %q", c.Kind)
	}
}

func buildInsert(target string, known map[string]bool, c RowChange) (statement, error) {
	names, err := sortedKnownKeys(c.Values, known)
	if err != nil {
		return statement{}, err
	}
	if len(names) == 0 {
		return statement{SQL: fmt.Sprintf("INSERT INTO %s DEFAULT VALUES", target)}, nil
	}

	cols := make([]string, len(names))
	holders := make([]string, len(names))
	args := make([]any, len(names))
	for i, n := range names {
		cols[i] = quoteIdent(n)
		holders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = c.Values[n]
	}
	sql := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
		target, strings.Join(cols, ", "), strings.Join(holders, ", "))
	return statement{SQL: sql, Args: args}, nil
}

func buildUpdate(target string, known map[string]bool, pk []string, c RowChange) (statement, error) {
	names, err := sortedKnownKeys(c.Values, known)
	if err != nil {
		return statement{}, err
	}
	if len(names) == 0 {
		return statement{}, errors.New("update has no changed columns")
	}

	args := make([]any, 0, len(names)+len(pk))
	sets := make([]string, len(names))
	for i, n := range names {
		sets[i] = fmt.Sprintf("%s = $%d", quoteIdent(n), i+1)
		args = append(args, c.Values[n])
	}

	where, args, err := pkPredicate(pk, c.Key, args)
	if err != nil {
		return statement{}, err
	}
	sql := fmt.Sprintf("UPDATE %s SET %s WHERE %s", target, strings.Join(sets, ", "), where)
	return statement{SQL: sql, Args: args}, nil
}

func buildDelete(target string, pk []string, c RowChange) (statement, error) {
	where, args, err := pkPredicate(pk, c.Key, nil)
	if err != nil {
		return statement{}, err
	}
	return statement{SQL: fmt.Sprintf("DELETE FROM %s WHERE %s", target, where), Args: args}, nil
}

// pkPredicate builds the WHERE clause that addresses exactly one row.
func pkPredicate(pk []string, key map[string]any, args []any) (string, []any, error) {
	if len(key) == 0 {
		return "", nil, errors.New("missing primary key values")
	}
	parts := make([]string, len(pk))
	for i, col := range pk {
		v, ok := key[col]
		if !ok {
			return "", nil, fmt.Errorf("missing primary key column %q", col)
		}
		args = append(args, v)
		parts[i] = fmt.Sprintf("%s = $%d", quoteIdent(col), len(args))
	}
	return strings.Join(parts, " AND "), args, nil
}

// sortedKnownKeys returns the payload's column names in the caller's order,
// rejecting anything that is not a real column on the table.
func sortedKnownKeys(values map[string]any, known map[string]bool) ([]string, error) {
	names := make([]string, 0, len(values))
	for n := range values {
		if !known[n] {
			return nil, fmt.Errorf("unknown column %q", n)
		}
		names = append(names, n)
	}
	sortStrings(names)
	return names, nil
}

func sortStrings(v []string) {
	for i := 1; i < len(v); i++ {
		for j := i; j > 0 && v[j] < v[j-1]; j-- {
			v[j], v[j-1] = v[j-1], v[j]
		}
	}
}

// renderScript inlines the bound arguments so the preview reads like real SQL.
// It is display-only; execution always uses the parameterised form.
func renderScript(st statement) string {
	sql := st.SQL
	for i := len(st.Args); i >= 1; i-- {
		sql = strings.ReplaceAll(sql, fmt.Sprintf("$%d", i), literalOf(st.Args[i-1]))
	}
	return sql + ";"
}

func literalOf(v any) string {
	switch t := v.(type) {
	case nil:
		return "NULL"
	case bool:
		if t {
			return "true"
		}
		return "false"
	case float64:
		return strings.TrimSuffix(fmt.Sprintf("%v", t), ".0")
	case int, int32, int64:
		return fmt.Sprintf("%d", t)
	default:
		return quoteLiteral(fmt.Sprintf("%v", t))
	}
}
