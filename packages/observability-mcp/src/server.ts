#!/usr/bin/env node

/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *	http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { registerTools } from './tools/registration.js';
import pkg from '../package.json' with { type: 'json' };
import yargs, { ArgumentsCamelCase, CommandModule } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { init } from './commands/init.js';
import express from 'express';
import cors from 'cors';

// Helper to create the MCP server instance
const getServer = (): McpServer => {
  const server = new McpServer({
    name: 'observability-mcp',
    version: pkg.version,
    title: 'Cloud Observability MCP',
  });
  registerTools(server);
  return server;
};

// Helper for CLI commands
const exitProcessAfter = <T, U>(cmd: CommandModule<T, U>): CommandModule<T, U> => ({
  ...cmd,
  handler: async (argv: ArgumentsCamelCase<U>) => {
    await cmd.handler(argv);
    process.exit(0);
  },
});

/**
 * Starts the server in HTTP mode (Server-Sent Events) for Cloud Run.
 */
const startHttpServer = async (port: number) => {
  const server = getServer();
  const app = express();
  
  // Enable CORS to allow browser/web-based clients to connect
  app.use(cors());

  let transport: SSEServerTransport | undefined;

  // 1. SSE Endpoint: Clients connect here to receive events
  app.get('/sse', async (req, res) => {
    console.log('New SSE connection established');
    transport = new SSEServerTransport('/messages', res);
    await server.connect(transport);
  });

  // 2. Messages Endpoint: Clients POST commands here
  app.post('/messages', async (req, res) => {
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).send('No active connection');
    }
  });

  // 3. Health Check: Required for Cloud Run to know the container is healthy
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  app.listen(port, () => {
    console.error(`🚀 Cloud Observability MCP HTTP server listening on port ${port}`);
  });
};

/**
 * Starts the server in Stdio mode for local CLI usage.
 */
const startStdioServer = async () => {
  await yargs(hideBin(process.argv))
    .command('$0', 'Run the Cloud Observability MCP server')
    .command(exitProcessAfter(init))
    .version(pkg.version)
    .help()
    .parse();

  const server = getServer();
  await server.connect(new StdioServerTransport());
  
  // eslint-disable-next-line no-console
  console.error('🚀 Cloud Observability MCP server started (Stdio Mode)');
  
  return server;
};

const main = async () => {
  // === MODE DETECTION ===
  // If PORT is set, we are likely in Cloud Run (or another container environment)
  if (process.env.PORT) {
    await startHttpServer(Number(process.env.PORT));
  } else {
    // Otherwise, default to standard CLI/Stdio mode
    const server = await startStdioServer();
    
    // Set up cleanup handlers specifically for Stdio mode
    // (HTTP mode relies on the container lifecycle)
    const cleanup = async () => {
        await server.close();
        process.exit(0);
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }
};

// Global Error Handlers
process.on('uncaughtException', (err: unknown) => {
  const error = err instanceof Error ? err : undefined;
  // eslint-disable-next-line no-console
  console.error('❌ Uncaught exception.', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  const error = reason instanceof Error ? reason : undefined;
  // eslint-disable-next-line no-console
  console.error(`❌ Unhandled rejection: ${promise}`, error);
  process.exit(1);
});

main().catch((err: unknown) => {
  const error = err instanceof Error ? err : undefined;
  // eslint-disable-next-line no-console
  console.error('❌ Unable to start Cloud Observability MCP server.', error);
  process.exit(1);
});
