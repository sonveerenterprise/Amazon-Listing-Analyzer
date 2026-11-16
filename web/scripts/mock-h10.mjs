// A local stand-in for Helium 10's MCP server, for trying the team features
// without spending real Helium 10 calls. It asks for sign-in the same way
// (OAuth with dynamic client registration; the demo sign-in approves at once)
// and answers the tools the app uses with the sample data in
// test/fixtures/h10.json.
//
//   node scripts/mock-h10.mjs
//   H10_MCP_URL=http://localhost:3310/mcp TEAM_PASSWORD=... npm run dev
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { setupAuthServer } from "@modelcontextprotocol/sdk/examples/server/demoInMemoryOAuthProvider.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { getOAuthProtectedResourceMetadataUrl, mcpAuthMetadataRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(fs.readFileSync(path.join(here, "..", "test", "fixtures", "h10.json"), "utf8"));
const MCP_PORT = Number(process.env.MOCK_H10_PORT) || 3310;
const AUTH_PORT = MCP_PORT + 1;
const mcpServerUrl = new URL(`http://localhost:${MCP_PORT}/mcp`);
const authServerUrl = new URL(`http://localhost:${AUTH_PORT}`);

let used = fixtures.get_mcp_usage_info.data.used;
const calls = [];

function buildServer() {
  const server = new McpServer({ name: "mock-helium10", version: "0.0.1" });
  for (const name of Object.keys(fixtures)) {
    server.registerTool(name, { description: `Mock ${name}`, inputSchema: { asin: z.string().optional() } }, async (args) => {
      calls.push(name);
      let body = fixtures[name];
      if (name === "get_mcp_usage_info") body = { data: { limit: 1000, used, remaining: 1000 - used }, error: null };
      else used += 1;
      if (name === "retrieve_listing_by_asin" && args.asin === "B0NOTFOUND") body = { data: { asin: args.asin, images: [], product_name: "", bullet_points: [] }, error: null };
      return { content: [{ type: "text", text: `${JSON.stringify(body)}\n[gateway-meta] session_id=mock-session-1` }] };
    });
  }
  return server;
}

const oauthMetadata = setupAuthServer({ authServerUrl, mcpServerUrl, strictResource: false });
const verifier = {
  verifyAccessToken: async (token) => {
    const res = await fetch(oauthMetadata.introspection_endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }).toString() });
    if (!res.ok) throw new Error("Invalid or expired token");
    const data = await res.json();
    return { token, clientId: data.client_id, scopes: data.scope ? data.scope.split(" ") : [], expiresAt: data.exp };
  },
};

const app = createMcpExpressApp();
app.use(mcpAuthMetadataRouter({ oauthMetadata, resourceServerUrl: mcpServerUrl, scopesSupported: ["mcp:tools"], resourceName: "Mock Helium 10" }));
const auth = requireBearerAuth({ verifier, requiredScopes: [], resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpServerUrl) });
app.post("/mcp", auth, async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
app.all("/mcp", auth, (_req, res) => res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }));
app.get("/calls", (_req, res) => res.json({ calls, used }));
app.listen(MCP_PORT, () => console.log(`Mock Helium 10 on ${mcpServerUrl} (sign-in server on ${authServerUrl})`));
