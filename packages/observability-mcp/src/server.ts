#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerTools } from './tools/registration.js';
import pkg from '../package.json' with { type: 'json' };
import http from 'node:http';

const getServer = (): McpServer => {
  const server = new McpServer({
    name: 'observability-mcp',
    version: pkg.version,
    title: 'Cloud Observability MCP',
  });

  registerTools(server);
  return server;
};

const startHttpTransport = async (server: McpServer) => {
  const port = Number(process.env.PORT || 8080);

  const transport = new StreamableHTTPServerTransport();

  await server.connect(transport);

  const httpServer = http.createServer(transport.requestListener);

  httpServer.listen(port, () => {
    console.error(`🚀 MCP HTTP server listening on port ${port}`);
  });

  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
};

const startStdioTransport = async (server: McpServer) => {
  await server.connect(new StdioServerTransport());
  console.error('🚀 MCP server started (stdio mode)');
};

const main = async () => {
  const server = getServer();

  const transportMode = process.env.MCP_TRANSPORT || 'stdio';

  if (transportMode === 'http') {
    await startHttpTransport(server);
  } else {
    await startStdioTransport(server);
  }

  process.on('uncaughtException', async (err) => {
    console.error('❌ Uncaught exception:', err);
    await server.close();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason) => {
    console.error('❌ Unhandled rejection:', reason);
    await server.close();
    process.exit(1);
  });
};

main().catch((err) => {
  console.error('❌ Failed to start MCP server:', err);
  process.exit(1);
});
