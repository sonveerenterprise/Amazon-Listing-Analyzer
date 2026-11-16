// Connection to Helium 10's MCP server. A team member signs in to Helium 10
// once in the browser; the resulting tokens are kept in a file on the server
// (never sent to the browser) and refreshed automatically.
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { UnauthorizedError, type OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { OAuthClientInformationMixed, OAuthClientMetadata, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { CallTool } from "./h10Data";

const serverUrl = () => new URL(process.env.H10_MCP_URL || "https://mcp.helium10.com/mcp");
const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const storePath = () => process.env.H10_STORE_PATH || path.join(process.cwd(), "data", "h10-auth.json");

interface Store {
  client?: OAuthClientInformationMixed;
  tokens?: OAuthTokens;
  verifier?: string;
  state?: string;
}

function readStore(): Store {
  try {
    return JSON.parse(fs.readFileSync(storePath(), "utf8")) as Store;
  } catch {
    return {};
  }
}
function writeStore(s: Store) {
  fs.mkdirSync(path.dirname(storePath()), { recursive: true });
  fs.writeFileSync(storePath(), JSON.stringify(s), { mode: 0o600 });
}
const patchStore = (p: Partial<Store>) => writeStore({ ...readStore(), ...p });

class Provider implements OAuthClientProvider {
  authUrl: URL | null = null;
  get redirectUrl() {
    return `${appUrl()}/api/h10/callback`;
  }
  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: "Amazon Listing Analyzer",
      redirect_uris: [this.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };
  }
  state() {
    const state = randomBytes(16).toString("hex");
    patchStore({ state });
    return state;
  }
  clientInformation() {
    return readStore().client;
  }
  saveClientInformation(client: OAuthClientInformationMixed) {
    patchStore({ client });
  }
  tokens() {
    return readStore().tokens;
  }
  saveTokens(tokens: OAuthTokens) {
    patchStore({ tokens });
  }
  redirectToAuthorization(url: URL) {
    this.authUrl = url;
  }
  saveCodeVerifier(verifier: string) {
    patchStore({ verifier });
  }
  codeVerifier() {
    const v = readStore().verifier;
    if (!v) throw new Error("No sign-in is in progress.");
    return v;
  }
}

export const h10Connected = () => Boolean(readStore().tokens?.access_token);

export function h10Disconnect() {
  client = null;
  try {
    fs.rmSync(storePath());
  } catch {
    /* nothing stored */
  }
}

/** Starts the Helium 10 sign-in and returns the address to send the browser to. */
export async function h10StartConnect(): Promise<string> {
  // Start clean so a changed APP_URL registers a matching redirect address.
  h10Disconnect();
  const provider = new Provider();
  const transport = new StreamableHTTPClientTransport(serverUrl(), { authProvider: provider });
  const c = new Client({ name: "amazon-listing-analyzer", version: "0.1.0" });
  try {
    await c.connect(transport);
    await c.close();
    throw new Error("Helium 10 did not ask for sign-in.");
  } catch (e) {
    if (e instanceof UnauthorizedError && provider.authUrl) return provider.authUrl.toString();
    throw e;
  }
}

export async function h10FinishConnect(code: string, state: string | null): Promise<void> {
  const expected = readStore().state;
  if (!expected || state !== expected) throw new Error("The sign-in response did not match the request. Start the connection again.");
  const transport = new StreamableHTTPClientTransport(serverUrl(), { authProvider: new Provider() });
  await transport.finishAuth(code);
  patchStore({ verifier: undefined, state: undefined });
}

export class H10NotConnectedError extends Error {}

let client: Client | null = null;
let sessionId: string | null = null;

async function getClient(): Promise<Client> {
  if (client) return client;
  if (!h10Connected()) throw new H10NotConnectedError("Helium 10 is not connected.");
  const c = new Client({ name: "amazon-listing-analyzer", version: "0.1.0" });
  try {
    await c.connect(new StreamableHTTPClientTransport(serverUrl(), { authProvider: new Provider() }));
  } catch (e) {
    if (e instanceof UnauthorizedError) throw new H10NotConnectedError("The Helium 10 sign-in has expired. Connect again.");
    throw e;
  }
  client = c;
  return c;
}

/** Calls one Helium 10 tool and returns its JSON result. */
export const h10Call: CallTool = async (name, args) => {
  const run = async () => {
    const c = await getClient();
    return c.callTool({ name, arguments: sessionId ? { ...args, session_id: sessionId } : args }, undefined, { timeout: 90_000 });
  };
  let res;
  try {
    res = await run();
  } catch (e) {
    if (e instanceof H10NotConnectedError) throw e;
    if (e instanceof UnauthorizedError) {
      client = null;
      throw new H10NotConnectedError("The Helium 10 sign-in has expired. Connect again.");
    }
    // One retry on a fresh connection covers a dropped session.
    client = null;
    res = await run();
  }
  const text = (Array.isArray(res.content) ? res.content : [])
    .filter((b): b is { type: "text"; text: string } => b?.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n");
  // Helium 10 asks clients to echo the session id it appends to results.
  const meta = text.match(/\[gateway-meta\]\s*session_id=(\S+)/);
  if (meta) sessionId = meta[1];
  const body = text.replace(/\n?\[gateway-meta\][^\n]*/g, "").trim();
  if (res.isError) throw new Error(body.slice(0, 300) || `Helium 10 tool ${name} failed.`);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Helium 10 tool ${name} returned an unreadable response.`);
  }
};

let usageCache: { at: number; value: { limit: number; used: number; remaining: number } } | null = null;

export async function h10Usage(maxAgeMs = 60_000): Promise<{ limit: number; used: number; remaining: number }> {
  if (usageCache && Date.now() - usageCache.at < maxAgeMs) return usageCache.value;
  const r = (await h10Call("get_mcp_usage_info", {})) as { data?: { limit?: number; used?: number; remaining?: number } };
  const value = { limit: Number(r.data?.limit ?? 0), used: Number(r.data?.used ?? 0), remaining: Number(r.data?.remaining ?? 0) };
  usageCache = { at: Date.now(), value };
  return value;
}
export const h10UsageInvalidate = () => {
  usageCache = null;
};
