import express from 'express';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'MCP Storage Server Running',
    timestamp: new Date().toISOString(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT
  });
});

// MCP endpoint
app.post('/mcp', (req, res) => {
  console.log('Received MCP request:', JSON.stringify(req.body));
  
  const mcpProcess = spawn('npx', ['-y', '@google-cloud/storage-mcp'], {
    env: {
      ...process.env,
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT
    }
  });

  let stdout = '';
  let stderr = '';
  let responseSent = false;

  // Timeout handler
  const timeout = setTimeout(() => {
    if (!responseSent) {
      responseSent = true;
      mcpProcess.kill();
      res.status(504).json({ 
        error: 'Request timeout',
        stderr: stderr,
        stdout: stdout
      });
    }
  }, 30000);

  // Write request to stdin
  mcpProcess.stdin.write(JSON.stringify(req.body) + '\n');
  mcpProcess.stdin.end();

  // Collect stdout - look for complete JSON-RPC response
  mcpProcess.stdout.on('data', (data) => {
    const chunk = data.toString();
    stdout += chunk;
    console.log('MCP stdout:', chunk);

    // Try to parse each line as JSON
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (line.trim() && !responseSent) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.jsonrpc === '2.0' && parsed.id === req.body.id) {
            clearTimeout(timeout);
            responseSent = true;
            mcpProcess.kill();
            return res.json(parsed);
          }
        } catch (e) {
          // Not complete JSON yet, continue collecting
        }
      }
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    stderr += data.toString();
    console.error('MCP stderr:', data.toString());
  });

  mcpProcess.on('close', (code) => {
    if (!responseSent) {
      clearTimeout(timeout);
      responseSent = true;
      console.log(`MCP process exited with code ${code}`);
      
      // Try one last time to parse the response
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.jsonrpc === '2.0') {
              return res.json(parsed);
            }
          } catch (e) {
            // Continue
          }
        }
      }
      
      res.status(500).json({
        error: 'No valid response',
        code: code,
        stdout: stdout,
        stderr: stderr
      });
    }
  });

  mcpProcess.on('error', (error) => {
    if (!responseSent) {
      clearTimeout(timeout);
      responseSent = true;
      res.status(500).json({
        error: 'Failed to spawn MCP process',
        message: error.message
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`MCP Storage Server listening on port ${PORT}`);
  console.log(`Project ID: ${process.env.GOOGLE_CLOUD_PROJECT}`);
});
