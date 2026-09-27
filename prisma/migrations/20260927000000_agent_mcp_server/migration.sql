-- Tracks which agents are wired up to use which MCP server (previously
-- unmodeled — MCPServerSummary.agents was hardcoded to [] in DB mode).
CREATE TABLE "agent_mcp_servers" (
  "agentId" TEXT NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "mcpServerId" TEXT NOT NULL REFERENCES "mcp_servers"("id") ON DELETE CASCADE,
  PRIMARY KEY ("agentId", "mcpServerId")
);
