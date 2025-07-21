// UI Elements
const form = document.getElementById('ielts-form');
const bandSelect = document.getElementById('band-select');
const partSelect = document.getElementById('part-select');
const questionInput = document.getElementById('question-input');
const imageInput = document.getElementById('image-input');
const imagePreview = document.getElementById('image-preview');
const answerInput = document.getElementById('answer-input');
const resultSection = document.getElementById('result-section');
const gauge = document.getElementById('gauge');
const scoreLabel = document.getElementById('score-label');
const correctionOutput = document.getElementById('correction-output');
const modelAnswerOutput = document.getElementById('model-answer-output');
const submitBtn = document.getElementById('submit-btn');

// Loader tips
const loaderTips = [
  "Tip: Use linking words to improve coherence!",
  "Did you know? Task Achievement is 25% of your IELTS Writing score.",
  "Fun fact: Band 9 answers are rare, but you can get close!",
  "Tip: Vary your sentence structures for higher bands.",
  "Remember: Check your grammar and punctuation!",
  "Tip: For Part 1, always compare key features in the data.",
  "Fun fact: Examiners love clear topic sentences!"
];

function getRandomTip() {
  return loaderTips[Math.floor(Math.random() * loaderTips.length)];
}

let loaderTipInterval = null;
let currentTipIndex = 0;

function getLoaderHTML() {
  return `
    <div class="loader-animation">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="24" stroke="#4b6cb7" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="110" stroke-dashoffset="0">
          <animateTransform attributeName="transform" type="rotate" from="0 30 30" to="360 30 30" dur="1s" repeatCount="indefinite"/>
        </circle>
      </svg>
      <div style="margin-top:0.7em;color:#4b6cb7;font-weight:600;">Evaluating...</div>
      <div id="loader-tip" style="margin-top:0.5em;color:#6a7ba2;font-size:0.98em;font-style:italic;min-height:1.5em;">${loaderTips[0]}</div>
    </div>
  `;
}

function startLoaderTipRotation() {
  const tipElem = document.getElementById('loader-tip');
  if (!tipElem) return;
  currentTipIndex = 0;
  loaderTipInterval = setInterval(() => {
    currentTipIndex = (currentTipIndex + 1) % loaderTips.length;
    tipElem.textContent = loaderTips[currentTipIndex];
  }, 2500); // Gap 2.5s
}

function stopLoaderTipRotation() {
  if (loaderTipInterval) {
    clearInterval(loaderTipInterval);
    loaderTipInterval = null;
  }
}

// Image preview logic
imageInput.addEventListener('change', function() {
  imagePreview.innerHTML = '';
  const file = imageInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = document.createElement('img');
      img.src = e.target.result;
      imagePreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  }
});

// Markdown rendering (bold=green, strikethrough=red)
function renderMarkdown(md) {
  if (!md) return '';
  // Replace **bold** with <strong>
  let html = md.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Replace ~~strike~~ with <del>
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
  // Replace line breaks
  html = html.replace(/\n/g, '<br>');
  return html;
}

// Gauge rendering
function drawGauge(score) {
  // score: float, 0-9
  const min = 4.5, max = 9.0;
  const percent = Math.max(0, Math.min(1, (score - min) / (max - min)));
  const angle = percent * 180;
  const radius = 90;
  const cx = 110, cy = 110;
  const startAngle = 180, endAngle = 0;
  // Color logic
  let color = '#e74c3c'; // red
  if (score >= 6 && score < 7) color = '#f1c40f'; // yellow
  else if (score >= 7 && score < 8) color = '#1db954'; // green
  else if (score >= 8) color = '#a259ff'; // purple
  // Arc calculation
  const largeArc = angle > 180 ? 1 : 0;
  const theta = (angle - 180) * Math.PI / 180;
  const x = cx + radius * Math.cos(theta);
  const y = cy + radius * Math.sin(theta);
  // SVG
  gauge.innerHTML = `
    <path d="M${cx - radius},${cy} A${radius},${radius} 0 1,1 ${cx + radius},${cy}" fill="none" stroke="#eee" stroke-width="18"/>
    <path d="M${cx - radius},${cy} A${radius},${radius} 0 ${largeArc},1 ${x},${y}" fill="none" stroke="${color}" stroke-width="18" style="transition: stroke 0.5s;"/>
    <circle cx="${x}" cy="${y}" r="10" fill="${color}" style="filter: drop-shadow(0 2px 8px #c3cfe2); transition: fill 0.5s;"/>
  `;
  scoreLabel.textContent = score ? score.toFixed(1) : '';
  scoreLabel.style.color = color;
}

// Disable/enable form fields
function setFormDisabled(disabled) {
  bandSelect.disabled = disabled;
  partSelect.disabled = disabled;
  questionInput.disabled = disabled;
  imageInput.disabled = disabled;
  answerInput.disabled = disabled;
  submitBtn.disabled = disabled;
  if (disabled) {
    submitBtn.style.opacity = 0;
    submitBtn.style.pointerEvents = 'none';
    submitBtn.style.position = 'absolute';
    submitBtn.style.left = '-9999px';
  } else {
    submitBtn.style.opacity = 1;
    submitBtn.style.pointerEvents = 'auto';
    submitBtn.style.position = 'static';
    submitBtn.style.left = 'unset';
  }
}

// Form submission
form.addEventListener('submit', async function(e) {
  e.preventDefault();
  setFormDisabled(true);
  resultSection.classList.remove('hidden');
  scoreLabel.textContent = '';
  gauge.innerHTML = '';
  correctionOutput.innerHTML = '';
  modelAnswerOutput.innerHTML = '';
  correctionOutput.innerHTML = getLoaderHTML();
  modelAnswerOutput.innerHTML = '';
  setTimeout(startLoaderTipRotation, 50); // ensure DOM is updated

  const band = bandSelect.value;
  const part = partSelect.value;
  const question = questionInput.value;
  const answer = answerInput.value;
  let imageBase64 = '';
  if (imageInput.files[0]) {
    const file = imageInput.files[0];
    imageBase64 = await toBase64(file);
  }

  // Show loading animation in gauge
  scoreLabel.textContent = '...';
  gauge.innerHTML = '<circle cx="110" cy="110" r="60" fill="none" stroke="#bfc9d9" stroke-width="18" stroke-dasharray="10 10"><animate attributeName="stroke-dashoffset" values="0;100" dur="1s" repeatCount="indefinite"/></circle>';

  // Send to backend
  try {
    const res = await fetch('/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ band, part, question, answer, image: imageBase64 })
    });
    const data = await res.json();
    // Animate gauge
    setTimeout(() => {
      stopLoaderTipRotation();
      drawGauge(data.score);
      correctionOutput.innerHTML = '<b>Correction & Guidance:</b><br>' + renderMarkdown(data.correction);
      modelAnswerOutput.innerHTML = '<b>Model Answer:</b><br>' + renderMarkdown(data.modelAnswer);
      setFormDisabled(false);
    }, 600);
  } catch (err) {
    stopLoaderTipRotation();
    scoreLabel.textContent = '!';
    gauge.innerHTML = '';
    correctionOutput.innerHTML = '<span style="color:#e74c3c">Error: Could not get evaluation. Please try again.</span>';
    setFormDisabled(false);
  }
});

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Loader CSS (inject if not present)
if (!document.getElementById('loader-style')) {
  const style = document.createElement('style');
  style.id = 'loader-style';
  style.textContent = `
    .loader-animation { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80px; }
    .loader-animation svg { animation: loader-rotate 1s linear infinite; }
    @keyframes loader-rotate { 100% { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
}
