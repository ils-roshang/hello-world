import express from 'express';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'MCP Storage Server Running' });
});

// MCP endpoint
app.post('/mcp', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Spawn the MCP server process
  const mcpProcess = spawn('npx', ['-y', '@google-cloud/storage-mcp']);
  
  mcpProcess.stdout.on('data', (data) => {
    res.write(data);
  });
  
  mcpProcess.stderr.on('data', (data) => {
    console.error(`Error: ${data}`);
  });
  
  mcpProcess.on('close', () => {
    res.end();
  });
});

app.listen(PORT, () => {
  console.log(`MCP Storage Server listening on port ${PORT}`);
});
