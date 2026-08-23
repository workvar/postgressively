import { api, apiSafe } from "./api";

export type SetupStatus = { needsSetup: boolean };
export type Session = { token: string; username: string; expiresAt: string };

/** Public. Tells the client whether a console account exists yet. */
export const getSetupStatus = () => api.get<SetupStatus>("/api/setup/status");

/** Public, and only accepted while no account exists. Signs the new user in. */
export const completeSetup = (username: string, password: string) =>
  apiSafe.post<Session>("/api/setup", { username, password });

/** Rotates the signed-in account's password and returns a fresh token. */
export const changePassword = (currentPassword: string, newPassword: string) =>
  apiSafe.post<Session>("/api/account/password", { currentPassword, newPassword });

/** Mirrors the backend rule in internal/auth/policy.go. */
export const MIN_PASSWORD_LENGTH = 10;
