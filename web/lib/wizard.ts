export type Template = {
  id: string;
  name: string;
  description: string;
  extensions: string[];
};

export const templates: Template[] = [
  {
    id: "general",
    name: "General purpose",
    description: "A clean database with UUID and crypto helpers. Good default for app backends.",
    extensions: ["uuid-ossp", "pgcrypto"],
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Query statistics and cross-table tooling for reporting workloads.",
    extensions: ["pg_stat_statements", "tablefunc"],
  },
  {
    id: "vector",
    name: "Vector / AI",
    description: "Embedding storage and similarity search with pgvector.",
    extensions: ["vector", "pgcrypto"],
  },
  {
    id: "empty",
    name: "Empty",
    description: "No extensions. Start from a bare database and add what you need.",
    extensions: [],
  },
];

export const allExtensions = [
  "uuid-ossp",
  "pgcrypto",
  "pg_stat_statements",
  "postgis",
  "vector",
  "hstore",
  "citext",
  "tablefunc",
];

export const encodings = ["UTF8", "LATIN1", "SQL_ASCII"] as const;
export const locales = ["en_US.UTF-8", "C", "POSIX"] as const;
export const poolModes = ["session", "transaction", "statement"] as const;

export type DraftDatabase = {
  name: string;
  template: string;
  encoding: string;
  locale: string;
  extensions: string[];
  owner: string;
  createOwner: boolean;
  connectionLimit: number;
  pooling: boolean;
  poolMode: string;
  poolSize: number;
};

export const emptyDraft: DraftDatabase = {
  name: "",
  template: "general",
  encoding: "UTF8",
  locale: "en_US.UTF-8",
  extensions: templates[0].extensions,
  owner: "postgres",
  createOwner: false,
  connectionLimit: 20,
  pooling: false,
  poolMode: "transaction",
  poolSize: 10,
};

const NAME_RE = /^[a-z_][a-z0-9_-]{0,62}$/;

export function validateName(name: string): string | null {
  if (!name) return "Give the database a name.";
  if (!NAME_RE.test(name))
    return "Use lowercase letters, digits, underscores or hyphens. Must not start with a digit or hyphen.";
  return null;
}

export function stepIsValid(step: number, draft: DraftDatabase): boolean {
  if (step === 0) return validateName(draft.name) === null;
  if (step === 2) return draft.owner.trim().length > 0 && draft.connectionLimit > 0;
  return true;
}
