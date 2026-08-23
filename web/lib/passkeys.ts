import { api, publicPost } from "./api";
import { fromBuffer, toBuffer } from "./base64url";
import type { Passkey } from "./types";

/** The envelope every begin-ceremony endpoint returns. */
type Challenge<T> = { sessionId: string; options: { publicKey: T } };

type CreationOptions = PublicKeyCredentialCreationOptions & {
  challenge: string;
  user: { id: string; name: string; displayName: string };
  excludeCredentials?: { id: string; type: string; transports?: string[] }[];
};

type RequestOptions = PublicKeyCredentialRequestOptions & {
  challenge: string;
  allowCredentials?: { id: string; type: string; transports?: string[] }[];
};

/** True when this browser can do WebAuthn at all (needs HTTPS or localhost). */
export function passkeysSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

function decodeDescriptors(list?: { id: string; type: string; transports?: string[] }[]) {
  return (list ?? []).map((d) => ({
    ...d,
    id: toBuffer(d.id),
    type: "public-key" as const,
    transports: d.transports as AuthenticatorTransport[] | undefined,
  }));
}

function encodeCredential(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAttestationResponse &
    AuthenticatorAssertionResponse;

  const payload: Record<string, unknown> = {
    id: credential.id,
    rawId: fromBuffer(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: fromBuffer(response.clientDataJSON),
    },
  };
  const inner = (payload.response as Record<string, unknown>);

  if (response.attestationObject) {
    inner.attestationObject = fromBuffer(response.attestationObject);
  }
  if (response.authenticatorData) {
    inner.authenticatorData = fromBuffer(response.authenticatorData);
  }
  if (response.signature) inner.signature = fromBuffer(response.signature);
  if (response.userHandle) inner.userHandle = fromBuffer(response.userHandle);

  return payload;
}

async function createCredential(options: CreationOptions) {
  const credential = (await navigator.credentials.create({
    publicKey: {
      ...options,
      challenge: toBuffer(options.challenge),
      user: { ...options.user, id: toBuffer(options.user.id) },
      excludeCredentials: decodeDescriptors(options.excludeCredentials),
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("no passkey was created");
  return encodeCredential(credential);
}

async function getCredential(options: RequestOptions) {
  const credential = (await navigator.credentials.get({
    publicKey: {
      ...options,
      challenge: toBuffer(options.challenge),
      allowCredentials: decodeDescriptors(options.allowCredentials),
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("no passkey was used");
  return encodeCredential(credential);
}

/** Lists the passkeys registered to the signed-in account. */
export const listPasskeys = () => api.get<Passkey[]>("/api/passkeys");

/** Registers a new passkey on the signed-in account. */
export async function registerPasskey(label: string): Promise<Passkey> {
  const begin = await api.post<Challenge<CreationOptions>>("/api/passkeys/register/begin");
  const credential = await createCredential(begin.options.publicKey);
  return api.post<Passkey>("/api/passkeys/register/finish", {
    sessionId: begin.sessionId,
    label,
    credential,
  });
}

export const renamePasskey = (id: number, label: string) =>
  api.patch<{ id: number; label: string }>(`/api/passkeys/${id}`, { label });

export const deletePasskey = (id: number) =>
  api.del<{ deleted: number }>(`/api/passkeys/${id}`, {
    reason: "Removing a passkey needs confirmation.",
  });

/** Signs in with a discoverable passkey, no username needed. */
export async function loginWithPasskey() {
  const begin = await publicPost<Challenge<RequestOptions>>("/api/login/passkey/begin");
  const credential = await getCredential(begin.options.publicKey);
  return publicPost<{ token: string; username: string; expiresAt: string }>(
    "/api/login/passkey/finish",
    { sessionId: begin.sessionId, credential }
  );
}

/** Confirms identity with a passkey to unlock one critical action. */
export async function stepUpWithPasskey() {
  const begin = await api.post<Challenge<RequestOptions>>("/api/stepup/passkey/begin");
  const credential = await getCredential(begin.options.publicKey);
  return api.post<{ elevatedToken: string; expiresAt: string }>("/api/stepup/passkey/finish", {
    sessionId: begin.sessionId,
    credential,
  });
}

/** Confirms identity with the account password instead of a passkey. */
export const stepUpWithPassword = (password: string) =>
  api.post<{ elevatedToken: string; expiresAt: string }>(
    "/api/stepup/password",
    { password },
    { keep401: true }
  );
