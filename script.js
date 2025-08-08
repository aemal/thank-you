/*
  Renders LinkedIn profile bubbles around a central portrait in a spiral.
  - Loads data.json from project root
  - Each bubble shows user's profile image and a small emoji badge for reaction
*/

const DATA_URL = 'data.json';
const CENTER_PHOTO_URL = 'https://www.aemalsayer.com/assets/images/about/aboutme.png';

// Map reaction keywords to emoji
const reactionToEmoji = {
  like: '👍',
  love: '❤️',
  celebrate: '🎉',
  support: '🤝',
  curious: '🤔',
  insightful: '💡'
};

function pickEmoji(reaction) {
  if (!reaction) return '💙';
  const key = String(reaction).toLowerCase();
  return reactionToEmoji[key] || '💙';
}

async function loadData() {
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load data.json');
  return res.json();
}

function createCenterPhoto(container) {
  const center = document.createElement('div');
  center.className = 'center-photo';
  center.style.backgroundImage = `url(${CENTER_PHOTO_URL})`;
  container.appendChild(center);
}

function createBubble(person) {
  const el = document.createElement('div');
  el.className = 'bubble';
  el.style.backgroundImage = `url(${person.profileImage})`;
  el.title = `${person.name.replace(/\n.*/, '')} — ${person.reaction || ''}`.trim();

  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.textContent = pickEmoji(person.reaction);
  el.appendChild(badge);

  el.addEventListener('click', () => {
    if (person.profileLink) window.open(person.profileLink, '_blank');
  });

  return el;
}

// Position items on a spiral around center
function positionBubbles(bubblesContainer, elements) {
  const rect = bubblesContainer.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  // Spiral parameters
  const angleStep = Math.PI / 10; // radians between bubbles
  const radiusStep = 6; // px added per bubble

  let angle = 0;
  let radius = 90; // start radius around center image

  elements.forEach((el, idx) => {
    const x = centerX + radius * Math.cos(angle) - el.offsetWidth / 2;
    const y = centerY + radius * Math.sin(angle) - el.offsetHeight / 2;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    angle += angleStep;
    radius += radiusStep * (0.9 + Math.random() * 0.4); // small variation for organic feel
  });
}

function onResizePositioning(bubblesContainer, elements) {
  let raf = null;
  const handler = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => positionBubbles(bubblesContainer, elements));
  };
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}

async function init() {
  const universe = document.getElementById('universe');
  const bubbles = document.getElementById('bubbles');
  if (!universe || !bubbles) return;

  createCenterPhoto(universe);

  let data;
  try {
    data = await loadData();
  } catch (err) {
    console.error(err);
    bubbles.innerHTML = '<p style="text-align:center;color:#f88">Failed to load data.</p>';
    return;
  }

  const elements = [];
  data.forEach(person => {
    if (!person || !person.profileImage) return;
    const el = createBubble(person);
    bubbles.appendChild(el);
    elements.push(el);
  });

  // After DOM paint, measure and position
  requestAnimationFrame(() => positionBubbles(bubbles, elements));

  // Reposition on resize
  onResizePositioning(bubbles, elements);
}

document.addEventListener('DOMContentLoaded', init);

