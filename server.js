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
  
  // Spawn the MCP server process
  const mcpProcess = spawn('npx', ['-y', '@google-cloud/storage-mcp'], {
    env: {
      ...process.env,
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT
    }
  });

  let stdout = '';
  let stderr = '';
  let responseStarted = false;

  // Set a timeout
  const timeout = setTimeout(() => {
    if (!responseStarted) {
      mcpProcess.kill();
      res.status(504).json({ 
        error: 'Request timeout',
        stderr: stderr,
        stdout: stdout
      });
    }
  }, 30000); // 30 second timeout

  // Write the request to the MCP process stdin
  mcpProcess.stdin.write(JSON.stringify(req.body) + '\n');
  mcpProcess.stdin.end();

  // Collect stdout
  mcpProcess.stdout.on('data', (data) => {
    stdout += data.toString();
    console.log('MCP stdout:', data.toString());
  });

  // Collect stderr
  mcpProcess.stderr.on('data', (data) => {
    stderr += data.toString();
    console.error('MCP stderr:', data.toString());
  });

  // Handle process completion
  mcpProcess.on('close', (code) => {
    clearTimeout(timeout);
    
    if (responseStarted) return;
    responseStarted = true;

    console.log(`MCP process exited with code ${code}`);
    
    if (code !== 0) {
      return res.status(500).json({
        error: 'MCP process failed',
        code: code,
        stderr: stderr,
        stdout: stdout
      });
    }

    // Try to parse the response
    try {
      // Split by newlines and find JSON responses
      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.jsonrpc === '2.0') {
            return res.json(parsed);
          }
        } catch (e) {
          // Not JSON, continue
        }
      }
      
      // If no valid JSON-RPC response found, return raw output
      res.json({ output: stdout, stderr: stderr });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to parse response',
        message: error.message,
        stdout: stdout,
        stderr: stderr
      });
    }
  });

  // Handle errors
  mcpProcess.on('error', (error) => {
    clearTimeout(timeout);
    
    if (!responseStarted) {
      responseStarted = true;
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
