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
import {
  commonSafeTools,
  destructiveWriteTools,
  otherDestructiveTools,
  safeWriteTools,
} from './tools/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import pkg from '../package.json' with { type: 'json' };
import yargs, { ArgumentsCamelCase, CommandModule } from 'yargs';
import { hideBin } from 'yargs/helpers';
import { init } from './commands/init.js';
import { log } from './utility/logger.js';
import * as process from 'process';

const exitProcessAfter = <T, U>(cmd: CommandModule<T, U>): CommandModule<T, U> => ({
  ...cmd,
  handler: async (argv: ArgumentsCamelCase<U>) => {
    await cmd.handler(argv);
    process.exit(0);
  },
});

const main = async () => {
  console.log('--- STARTING MCP STORAGE SERVER ---');
  console.log(`Node version: ${process.version}`);
  console.log(`CWD: ${process.cwd()}`);

  try {
    log.info('Parsing arguments...');
    let argv;
    try {
      argv = await yargs(hideBin(process.argv))
        .command('$0', 'Run the storage mcp server', (yargs) => {
          yargs.option('enable-destructive-tools', {
            describe: 'Enable tools that can modify or delete existing GCS content.',
            type: 'boolean',
            default: false,
          });
        })
        .command(exitProcessAfter(init))
        .version(pkg.version)
        .help()
        .parse();
    } catch (err) {
      console.error('CRITICAL: Failed to parse arguments', err);
      process.exit(1);
    }

    log.info('Initializing McpServer instance...');
    const server = new McpServer(
      {
        name: 'storage-mcp-server',
        version: pkg.version,
      },
      { capabilities: { tools: {} } },
    );

    log.info('Registering tools...');
    // Start with the common tools that are always safe and registered.
    const allTools = [...commonSafeTools];

    if (argv['enable-destructive-tools']) {
      allTools.push(...destructiveWriteTools);
      allTools.push(...otherDestructiveTools);
      log.warn('WARNING: Destructive tools are enabled.');
    } else {
      allTools.push(...safeWriteTools);
    }

    for (const registerTool of allTools) {
      registerTool(server);
    }
    log.info(`Total tools registered: ${allTools.length}`);

    const PORT_ENV = process.env['PORT'] || (process.env['K_SERVICE'] ? '8080' : null);

    if (PORT_ENV) {
      log.info(`Running in HTTP/SSE mode on port ${PORT_ENV}...`);
      const app = express();

      // Health check - immediate response
      app.get('/', (_req: express.Request, res: express.Response) => {
        res.json({
          name: 'storage-mcp-server',
          version: pkg.version,
          status: 'running',
          mode: 'sse'
        });
      });

      let sseTransport: SSEServerTransport | null = null;
      app.get('/sse', async (_req: express.Request, res: express.Response) => {
        log.info('New SSE connection requested');
        sseTransport = new SSEServerTransport('/messages', res);
        await server.connect(sseTransport);
        log.info('SSE connection established');
      });

      app.post('/messages', async (req: express.Request, res: express.Response) => {
        if (sseTransport) {
          await sseTransport.handlePostMessage(req, res);
        } else {
          res.status(400).send('SSE connection not established');
        }
      });

      const port = parseInt(PORT_ENV);
      app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 SUCCESS: storage mcp server listening on 0.0.0.0:${port}`);
        log.info(`🚀 storage mcp server listening on 0.0.0.0:${port}`);
      });
    } else {
      log.info('Running in stdio mode...');
      await server.connect(new StdioServerTransport());
      log.info('🚀 SUCCESS: storage mcp server started in stdio mode');
    }
  } catch (err) {
    console.error('FATAL ERROR DURING STARTUP:', err);
    log.error('FATAL ERROR DURING STARTUP', err instanceof Error ? err : undefined);
    process.exit(1);
  }

  process.on('uncaughtException', async (err: unknown) => {
    log.error('❌ Uncaught exception.', err instanceof Error ? err : undefined);
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason: unknown) => {
    log.error('❌ Unhandled rejection.', reason instanceof Error ? reason : undefined);
    process.exit(1);
  });
};

main().catch((err: unknown) => {
  const error = err instanceof Error ? err : undefined;
  log.error('❌ Unable to start storage-mcp server.', error);
  process.exit(1);
});
