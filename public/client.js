const ws = new WebSocket(`ws://${window.location.host}`);
const table = document.querySelector("#issuesTable tbody");
const form = document.getElementById("issueForm");

function getStatusClass(status) {
  return "status-" + status.toLowerCase().replace(" ", "-");
}

function renderIssues(issues) {
  table.innerHTML = "";
  issues.forEach(issue => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${issue.id}</td>
      <td>${issue.title}</td>
      <td>${issue.description}</td>
      <td class="${getStatusClass(issue.status)}">${issue.status}</td>
      <td>${issue.createdBy}</td>
      <td>
        <button class="status-btn in-progress" onclick="updateStatus(${issue.id}, 'In Progress')">In Progress</button>
        <button class="status-btn close" onclick="updateStatus(${issue.id}, 'Closed')">Close</button>
        <button class="status-btn comment" onclick="addComment(${issue.id})">Comment</button>
      </td>
    `;
    table.appendChild(row);
  });
}

async function fetchIssues() {
  const res = await fetch("/issues");
  const issues = await res.json();
  renderIssues(issues);
}

fetchIssues();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const createdBy = document.getElementById("createdBy").value;

  await fetch("/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, createdBy })
  });

  form.reset();
});

async function updateStatus(id, status) {
  await fetch(`/issues/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
}

async function addComment(id) {
  const comment = prompt("Enter your comment:");
  if (!comment) return;
  await fetch(`/issues/${id}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment })
  });
}

ws.onmessage = (message) => {
  const data = JSON.parse(message.data);
  if (data.type === "update") {
    renderIssues(data.issues);
  }
};
