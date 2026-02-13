import express from 'express';
import { exec } from 'child_process';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'MCP Storage Server Running',
    timestamp: new Date().toISOString()
  });
});

// MCP endpoint
app.post('/mcp', (req, res) => {
  const mcpCommand = 'npx -y @google-cloud/storage-mcp';
  
  exec(mcpCommand, {
    env: {
      ...process.env,
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT
    }
  }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
    }
    
    try {
      const result = JSON.parse(stdout);
      res.json(result);
    } catch (e) {
      res.json({ output: stdout });
    }
  });
});

app.listen(PORT, () => {
  console.log(`MCP Storage Server listening on port ${PORT}`);
});
