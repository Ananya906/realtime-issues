const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
let state = { issues: [] };

const tbody = document.querySelector('#issuesTable tbody');
const form = document.getElementById('createForm');

function render() {
  tbody.innerHTML = '';
  state.issues.forEach(issue => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${issue.id}</td>
      <td>${issue.title}<br><small>${issue.description}</small></td>
      <td>${issue.status}</td>
      <td>${issue.createdBy}</td>
      <td>
        <button onclick="updateIssue(${issue.id}, 'In Progress')">In Progress</button>
        <button onclick="updateIssue(${issue.id}, 'Closed')">Close</button>
        <button onclick="commentIssue(${issue.id})">Comment</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function send(action, payload) {
  ws.send(JSON.stringify({ action, payload }));
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;
  const createdBy = document.getElementById('createdBy').value;
  send('create', { title, description, createdBy });
  form.reset();
});

function updateIssue(id, status) {
  const name = prompt('Your name?');
  send('update', { id, fields: { status }, updatedBy: name });
}

function commentIssue(id) {
  const name = prompt('Your name?');
  const comment = prompt('Enter comment:');
  if (comment) send('comment', { id, comment, author: name });
}

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'init') state = msg.data;
  if (msg.type === 'created') state.issues.push(msg.issue);
  if (msg.type === 'updated') {
    const i = state.issues.findIndex(x => x.id === msg.issue.id);
    if (i !== -1) state.issues[i] = msg.issue;
  }
  if (msg.type === 'commented') {
    const i = state.issues.findIndex(x => x.id === msg.id);
    if (i !== -1) state.issues[i].comments.push(msg.comment);
  }
  render();
};
