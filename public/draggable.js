// Draggable logic for chatbot button
const draggableBtn = document.getElementById('draggable-chatbot');
let isDragging = false;
let offsetX, offsetY;
let startX, startY;

// Initial position (bottom right)
window.originalDraggablePos = { bottom: 32, right: 32 };
let lastPos = { bottom: 32, right: 32 };
window.wasDragged = false;

function setBtnPosition(bottom, right) {
  draggableBtn.style.bottom = bottom + 'px';
  draggableBtn.style.right = right + 'px';
  draggableBtn.style.left = '';
  draggableBtn.style.top = '';
}
setBtnPosition(window.originalDraggablePos.bottom, window.originalDraggablePos.right);

// Mouse events

draggableBtn.addEventListener('mousedown', (e) => {
  isDragging = false;
  startX = e.clientX;
  startY = e.clientY;
  const rect = draggableBtn.getBoundingClientRect();
  offsetX = startX - rect.left;
  offsetY = startY - rect.top;
  draggableBtn.style.transition = 'none';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (typeof startX !== 'number') return;
  const moved = Math.abs(e.clientX - startX) > 3 || Math.abs(e.clientY - startY) > 3;
  if (moved) isDragging = true;
  if (!isDragging) return;
  const x = e.clientX - offsetX;
  const y = e.clientY - offsetY;
  // Constrain within viewport
  const maxX = window.innerWidth - draggableBtn.offsetWidth;
  const maxY = window.innerHeight - draggableBtn.offsetHeight;
  const left = Math.min(Math.max(0, x), maxX);
  const top = Math.min(Math.max(0, y), maxY);
  draggableBtn.style.left = left + 'px';
  draggableBtn.style.top = top + 'px';
  draggableBtn.style.bottom = '';
  draggableBtn.style.right = '';
});

document.addEventListener('mouseup', (e) => {
  if (isDragging) {
    isDragging = false;
    window.wasDragged = true;
    setTimeout(() => { window.wasDragged = false; }, 200);
    document.body.style.userSelect = '';
    // Save last position
    if (draggableBtn.style.left && draggableBtn.style.top) {
      lastPos = { left: draggableBtn.style.left, top: draggableBtn.style.top };
    }
    draggableBtn.style.transition = 'box-shadow 0.2s, background 0.2s';
  }
  startX = startY = undefined;
});

// Touch events
draggableBtn.addEventListener('touchstart', (e) => {
  isDragging = false;
  const touch = e.touches[0];
  startX = touch.clientX;
  startY = touch.clientY;
  const rect = draggableBtn.getBoundingClientRect();
  offsetX = startX - rect.left;
  offsetY = startY - rect.top;
  draggableBtn.style.transition = 'none';
});
document.addEventListener('touchmove', (e) => {
  if (typeof startX !== 'number') return;
  const touch = e.touches[0];
  const moved = Math.abs(touch.clientX - startX) > 3 || Math.abs(touch.clientY - startY) > 3;
  if (moved) isDragging = true;
  if (!isDragging) return;
  const x = touch.clientX - offsetX;
  const y = touch.clientY - offsetY;
  const maxX = window.innerWidth - draggableBtn.offsetWidth;
  const maxY = window.innerHeight - draggableBtn.offsetHeight;
  const left = Math.min(Math.max(0, x), maxX);
  const top = Math.min(Math.max(0, y), maxY);
  draggableBtn.style.left = left + 'px';
  draggableBtn.style.top = top + 'px';
  draggableBtn.style.bottom = '';
  draggableBtn.style.right = '';
});
document.addEventListener('touchend', () => {
  if (isDragging) {
    isDragging = false;
    window.wasDragged = true;
    setTimeout(() => { window.wasDragged = false; }, 200);
    // Save last position
    if (draggableBtn.style.left && draggableBtn.style.top) {
      lastPos = { left: draggableBtn.style.left, top: draggableBtn.style.top };
    }
    draggableBtn.style.transition = 'box-shadow 0.2s, background 0.2s';
  }
  startX = startY = undefined;
});

// Snap back to original position when chatbox is opened
window.openChatbox = function() {
  setBtnPosition(window.originalDraggablePos.bottom, window.originalDraggablePos.right);
};

// Tooltip: native title is used, but you can enhance here if needed
// (Optional: add custom tooltip logic if you want a styled tooltip)
