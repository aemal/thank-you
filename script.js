/*
  Renders LinkedIn profile bubbles around a central portrait on animated rings.
  - Loads data.json
  - Bubbles are arranged into concentric rotating rings with adaptive sizing so everyone fits
  - Each bubble shows profile photo and an emoji badge for reaction
*/

const DATA_URL = 'data.json';
const CENTER_PHOTO_URL = 'https://www.aemalsayer.com/assets/images/about/aboutme.png';

// Map reaction keywords to emoji
const reactionToEmoji = {
  like: '👍',
  love: '❤️',
  celebrate: '🎉',
  support: '❤️‍🩹',
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

// Compute ring layout to fit all people within container
function layoutRings(containerRect, peopleCount, centerRadiusPx) {
  const maxRadius = Math.min(containerRect.width, containerRect.height) / 2 - 30; // padding

  // Binary search the largest bubble size that fits
  let low = 28;
  let high = Math.max(56, Math.floor(Math.min(containerRect.width, containerRect.height) / 12));
  let best = 40;
  let bestLayout = null;

  const canFit = (size) => {
    const ringGap = Math.max(size * 0.95, 46);
    let placed = 0;
    let ringIndex = 0;
    const rings = [];
    const safeInnerRadius = Math.max(centerRadiusPx + size * 0.65 + 20, 90);
    for (let r = safeInnerRadius; r <= maxRadius && placed < peopleCount; r += ringGap) {
      const circumference = 2 * Math.PI * r;
      const step = size * 1.2;
      const capacity = Math.max(4, Math.floor(circumference / step));
      const available = Math.min(capacity, peopleCount - placed);
      rings.push({
        radius: r,
        count: available,
        size: Math.max(26, Math.floor(size * (1 - ringIndex * 0.03))),
        spin: (ringIndex % 2 === 0) ? 80 - ringIndex * 6 : -(80 - ringIndex * 6),
      });
      placed += available;
      ringIndex += 1;
    }
    return { fits: placed >= peopleCount, rings };
  };

  for (let i = 0; i < 18 && low <= high; i += 1) {
    const mid = Math.floor((low + high) / 2);
    const result = canFit(mid);
    if (result.fits) {
      best = mid;
      bestLayout = result.rings;
      low = mid + 2; // try bigger
    } else {
      high = mid - 2; // try smaller
    }
  }

  if (!bestLayout) {
    bestLayout = canFit(best).rings;
  }

  return { rings: bestLayout, bubbleSize: best };
}

function buildRings(bubblesContainer, people) {
  bubblesContainer.innerHTML = '';
  const rect = bubblesContainer.getBoundingClientRect();
  const centerEl = document.querySelector('.center-photo');
  const centerRadius = centerEl ? centerEl.getBoundingClientRect().width / 2 : 90;
  const { rings } = layoutRings(rect, people.length, centerRadius);

  // Center placeholder element to measure later
  const center = document.querySelector('.center-photo');
  if (center) center.style.zIndex = '2';

  let index = 0;
  const ringElements = [];

  rings.forEach((ring, ringIdx) => {
    const ringEl = document.createElement('div');
    ringEl.className = 'ring';
    ringEl.style.setProperty('--spin-dur', `${Math.max(24, Math.abs(ring.spin))}s`);
    // Alternate direction by flipping duration sign via animation-direction handled by sign
    if (ring.spin < 0) ringEl.style.animationDirection = 'reverse';

    const angleStep = (2 * Math.PI) / ring.count;
    const size = Math.max(34, Math.floor(ring.size));

    for (let i = 0; i < ring.count && index < people.length; i += 1, index += 1) {
      const person = people[index];
      const wrap = document.createElement('div');
      wrap.className = 'bubble-wrap';
      const angle = i * angleStep;
      const x = ring.radius * Math.cos(angle);
      const y = ring.radius * Math.sin(angle);
      wrap.style.transform = `translate(${x}px, ${y}px)`;

      const el = createBubble(person);
      el.style.setProperty('--sz', `${size}px`);
      el.style.setProperty('--breathe-dur', `${3.6 + (i % 5) * 0.25}s`);
      wrap.appendChild(el);

      ringEl.appendChild(wrap);
    }

    bubblesContainer.appendChild(ringEl);
    ringElements.push(ringEl);
  });

  return ringElements;
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

  const people = data.filter(p => p && p.profileImage);
  const render = () => buildRings(bubbles, people);
  render();

  // Rebuild on resize with debounce
  let raf = null;
  window.addEventListener('resize', () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  });
}

document.addEventListener('DOMContentLoaded', init);

