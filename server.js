const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_FILE = path.join(__dirname, 'issues.json');
const PORT = process.env.PORT || 3000;

// Ensure issues.json exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ nextId: 1, issues: [] }, null, 2));
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function safeWriteData(data, commitMessage) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  gitCommit(commitMessage);
}

function gitCommit(message) {
  try {
    execSync(`git add ${DATA_FILE}`);
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    console.log('Committed to git:', message);
  } catch (err) {
    console.log('Git commit skipped:', err.message.split('\n')[0]);
  }
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/issues', (req, res) => {
  res.json(readData());
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.send(JSON.stringify({ type: 'init', data: readData() }));

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    const data = readData();
    if (msg.action === 'create') {
      const { title, description, createdBy } = msg.payload;
      const id = data.nextId++;
      const issue = {
        id,
        title,
        description,
        status: 'Open',
        createdBy: createdBy || 'Unknown',
        createdAt: new Date().toISOString(),
        comments: []
      };
      data.issues.push(issue);
      safeWriteData(data, `Issue #${id} created by ${issue.createdBy}: ${issue.title}`);
      broadcast({ type: 'created', issue });
    } else if (msg.action === 'update') {
      const { id, fields, updatedBy } = msg.payload;
      const issue = data.issues.find(i => i.id === id);
      if (!issue) {
        ws.send(JSON.stringify({ type: 'error', message: 'Issue not found' }));
        return;
      }
      for (const key of ['status', 'title', 'description']) {
        if (fields[key]) issue[key] = fields[key];
      }
      issue.updatedAt = new Date().toISOString();
      safeWriteData(data, `Issue #${id} updated by ${updatedBy}`);
      broadcast({ type: 'updated', issue });
    } else if (msg.action === 'comment') {
      const { id, comment, author } = msg.payload;
      const issue = data.issues.find(i => i.id === id);
      if (!issue) {
        ws.send(JSON.stringify({ type: 'error', message: 'Issue not found' }));
        return;
      }
      const c = { author, text: comment, at: new Date().toISOString() };
      issue.comments.push(c);
      safeWriteData(data, `Comment on Issue #${id} by ${author}`);
      broadcast({ type: 'commented', id, comment: c });
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
