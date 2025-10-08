const tableBody = document.querySelector("#issuesTable tbody");
const ws = new WebSocket(`ws://${location.host}`);
let issues = [];

function render() {
  tableBody.innerHTML = "";
  issues.forEach((issue) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${issue.id}</td>
      <td>${issue.title}</td>
      <td>${issue.status}</td>
      <td>${issue.createdBy}</td>
      <td>${issue.comments.map(c => `<div class='comment'>${c.user}: ${c.comment}</div>`).join("")}</td>
      <td>
        <button onclick="updateStatus(${issue.id}, 'In Progress')">In Progress</button>
        <button onclick="updateStatus(${issue.id}, 'Closed')">Close</button>
        <button onclick="addComment(${issue.id})">Comment</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "update") {
    issues = data.issues;
    render();
  }
};

document.getElementById("issueForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const createdBy = document.getElementById("createdBy").value;

  await fetch("/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, createdBy }),
  });

  e.target.reset();
});

async function updateStatus(id, status) {
  await fetch(`/issues/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

async function addComment(id) {
  const user = prompt("Your name:");
  const comment = prompt("Enter comment:");
  if (!comment) return;
  await fetch(`/issues/${id}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, comment }),
  });
}
