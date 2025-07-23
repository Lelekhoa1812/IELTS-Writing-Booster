// Chatbox logic
const chatbotBtn = document.getElementById('draggable-chatbot');
const chatbox = document.getElementById('chatbox');
const closeChatboxBtn = document.getElementById('close-chatbox');
const chatboxForm = document.getElementById('chatbox-form');
const chatboxInput = document.getElementById('chatbox-input');
const chatboxMessages = document.getElementById('chatbox-messages');

// Use a unique global for chatbox position if needed
window.originalChatbotPos = { bottom: 32, right: 32 };

// Open chatbox and reset button position
function openChatbox() {
  if (window.wasDragged) {
    window.wasDragged = false;
    return;
  }
  chatbox.classList.remove('hidden');
  chatbotBtn.style.bottom = window.originalChatbotPos.bottom + 'px';
  chatbotBtn.style.right = window.originalChatbotPos.right + 'px';
  chatbotBtn.style.transition = 'bottom 0.3s, right 0.3s';
}

chatbotBtn.addEventListener('click', openChatbox);
closeChatboxBtn.addEventListener('click', () => {
  chatbox.classList.add('hidden');
});

// Tooltip on hover (draggable.js can trigger this, but fallback to native title)
chatbotBtn.addEventListener('mouseenter', () => {
  // Optionally enhance tooltip here
});

// Markdown rendering for chatbox (custom tags/colors)
function renderChatboxMarkdown(md) {
  if (!md) return '';
  let html = md
    .replace(/\*\*(.*?)\*\*/g, '<h6 style="color:#1db954;display:inline;font-weight:900;">$1</h6>')
    .replace(/~~(.*?)~~/g, '<h7 style="color:#e74c3c;display:inline;text-decoration:line-through;">$1</h7>')
    .replace(/`([^`]+)`/g, '<p6 style="color:#4b6cb7;background:#eaf1fb;padding:0.1em 0.3em;border-radius:4px;">$1</p6>')
    .replace(/\n/g, '<br>');
  // Optionally highlight AI notes
  html = html.replace(/\[note\](.*?)\[\/note\]/gi, '<p7 style="color:#f7971e;font-style:italic;">$1</p7>');
  return html;
}

// Chat logic
function appendMessage(text, isUser) {
  const div = document.createElement('div');
  div.className = isUser ? 'chatbox-message-user' : 'chatbox-message-ai';
  div.innerHTML = isUser ? text : renderChatboxMarkdown(text);
  chatboxMessages.appendChild(div);
  chatboxMessages.scrollTop = chatboxMessages.scrollHeight;
}

chatboxForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userMsg = chatboxInput.value.trim();
  if (!userMsg) return;
  appendMessage(userMsg, true);
  chatboxInput.value = '';
  appendMessage('<span style="color:#aaa">AI is thinking...</span>', false);
  try {
    const res = await fetch('/chat-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg })
    });
    const data = await res.json();
    // Remove 'AI is typing...'
    chatboxMessages.removeChild(chatboxMessages.lastChild);
    appendMessage(data.reply, false);
  } catch (err) {
    chatboxMessages.removeChild(chatboxMessages.lastChild);
    appendMessage('<span style="color:#e74c3c">Error: Could not get response.</span>', false);
  }
});

// Auto-expand textarea from 2 to 5 lines
chatboxInput.addEventListener('input', function() {
  this.style.height = 'auto';
  const maxHeight = 8.5 * 16; // 5 lines * 1.7em (approx 16px per em)
  this.style.height = Math.min(this.scrollHeight, maxHeight) + 'px';
}); 