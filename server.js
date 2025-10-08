const express = require("express");
const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static("public"));

const ISSUES_FILE = path.join(__dirname, "issues.json");

// Ensure file exists
if (!fs.existsSync(ISSUES_FILE)) {
  fs.writeFileSync(ISSUES_FILE, "[]");
}

// Load issues
function getIssues() {
  const data = fs.readFileSync(ISSUES_FILE);
  return JSON.parse(data);
}

// Save issues + git commit
function saveIssues(issues, message) {
  fs.writeFileSync(ISSUES_FILE, JSON.stringify(issues, null, 2));
  try {
    execSync("git add issues.json");
    execSync(`git commit -m "${message}"`);
  } catch (e) {
    console.log("Git commit skipped:", e.message);
  }
}

// WebSocket broadcast
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Routes
app.get("/issues", (req, res) => {
  res.json(getIssues());
});

app.post("/issues", (req, res) => {
  const { title, description, createdBy } = req.body;
  const issues = getIssues();
  const newIssue = {
    id: issues.length + 1,
    title,
    description,
    status: "Open",
    createdBy,
    comments: [],
  };
  issues.push(newIssue);
  saveIssues(issues, `New issue #${newIssue.id} created by ${createdBy}`);
  broadcast({ type: "update", issues });
  res.json(newIssue);
});

app.post("/issues/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const issues = getIssues();
  const issue = issues.find((i) => i.id == id);
  if (issue) {
    issue.status = status;
    saveIssues(issues, `Issue #${id} marked as ${status}`);
    broadcast({ type: "update", issues });
    res.json(issue);
  } else {
    res.status(404).send("Issue not found");
  }
});

app.post("/issues/:id/comment", (req, res) => {
  const { id } = req.params;
  const { comment, user } = req.body;
  const issues = getIssues();
  const issue = issues.find((i) => i.id == id);
  if (issue) {
    issue.comments.push({ user, comment, time: new Date().toISOString() });
    saveIssues(issues, `Comment added to issue #${id} by ${user}`);
    broadcast({ type: "update", issues });
    res.json(issue);
  } else {
    res.status(404).send("Issue not found");
  }
});

// WebSocket connection
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "update", issues: getIssues() }));
});

const PORT = 3000;
server.listen(PORT, () =>
  console.log(` Server running on http://localhost:${PORT}`)
);
