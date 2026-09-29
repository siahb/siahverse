const SIZE = 6;
const SAVE_KEY = 'nursedoku-v1';

const REGIONS = [
  [0, 0, 0, 1, 1, 2],
  [0, 3, 1, 1, 1, 2],
  [3, 3, 1, 2, 2, 2],
  [3, 3, 4, 4, 4, 5],
  [4, 4, 4, 5, 5, 5],
  [4, 4, 5, 5, 5, 5]
];

// Shift 001 has one unique legal solution:
// row 1→col 2, row 2→col 4, row 3→col 6,
// row 4→col 1, row 5→col 3, row 6→col 5.

const boardEl = document.getElementById('board');
const timerEl = document.getElementById('timer');
const rnCountEl = document.getElementById('rnCount');
const messageEl = document.getElementById('message');
const howToDialog = document.getElementById('howToDialog');
const winDialog = document.getElementById('winDialog');
const finalTimeEl = document.getElementById('finalTime');

let mode = 'rn';
let startedAt = Date.now();
let timerId = null;
let finished = false;
let state = blankState();

function blankState() {
  return Array.from({ length: SIZE }, function () {
    return Array(SIZE).fill('');
  });
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return minutes + ':' + seconds;
}

function beginTimer(resetStart) {
  clearInterval(timerId);
  if (resetStart) startedAt = Date.now();
  timerEl.textContent = formatTime(Date.now() - startedAt);
  timerId = setInterval(function () {
    if (!finished) timerEl.textContent = formatTime(Date.now() - startedAt);
  }, 250);
}

function sameRegion(r1, c1, r2, c2) {
  return r2 >= 0 && r2 < SIZE && c2 >= 0 && c2 < SIZE &&
    REGIONS[r1][c1] === REGIONS[r2][c2];
}

function addRegionBorders(cell, row, col) {
  if (row > 0 && !sameRegion(row, col, row - 1, col)) cell.dataset.top = 'strong';
  if (row < SIZE - 1 && !sameRegion(row, col, row + 1, col)) cell.dataset.bottom = 'strong';
  if (col > 0 && !sameRegion(row, col, row, col - 1)) cell.dataset.left = 'strong';
  if (col < SIZE - 1 && !sameRegion(row, col, row, col + 1)) cell.dataset.right = 'strong';
}

function renderBoard() {
  boardEl.innerHTML = '';
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell region-' + REGIONS[row][col];
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute('role', 'gridcell');
      addRegionBorders(cell, row, col);

      cell.addEventListener('click', function () {
        if (!finished) applyMark(row, col, mode);
      });

      cell.addEventListener('contextmenu', function (event) {
        event.preventDefault();
        if (!finished) applyMark(row, col, 'x');
      });

      boardEl.appendChild(cell);
    }
  }
  paintState();
}

function applyMark(row, col, selectedMode) {
  const current = state[row][col];
  state[row][col] = current === selectedMode ? '' : selectedMode;
  messageEl.className = 'message';
  messageEl.textContent = '';
  saveGame();
  paintState();
}

function getRNPositions() {
  const positions = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (state[row][col] === 'rn') positions.push([row, col]);
    }
  }
  return positions;
}

function getConflicts() {
  const positions = getRNPositions();
  const conflicts = new Set();

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const r1 = positions[i][0];
      const c1 = positions[i][1];
      const r2 = positions[j][0];
      const c2 = positions[j][1];

      const sameRow = r1 === r2;
      const sameCol = c1 === c2;
      const sameZone = REGIONS[r1][c1] === REGIONS[r2][c2];
      const touching = Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;

      if (sameRow || sameCol || sameZone || touching) {
        conflicts.add(r1 + ',' + c1);
        conflicts.add(r2 + ',' + c2);
      }
    }
  }

  return conflicts;
}

function paintState() {
  const conflicts = getConflicts();
  const cells = boardEl.querySelectorAll('.cell');

  cells.forEach(function (cell) {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const value = state[row][col];
    cell.innerHTML = '';
    cell.classList.toggle('conflict', conflicts.has(row + ',' + col));

    if (value === 'rn') {
      const marker = document.createElement('span');
      marker.className = 'rn-marker';
      marker.textContent = 'RN';
      cell.appendChild(marker);
      cell.setAttribute('aria-label', 'Row ' + (row + 1) + ', column ' + (col + 1) + ', RN placed');
    } else if (value === 'x') {
      const marker = document.createElement('span');
      marker.className = 'x-marker';
      marker.textContent = '×';
      cell.appendChild(marker);
      cell.setAttribute('aria-label', 'Row ' + (row + 1) + ', column ' + (col + 1) + ', marked unavailable');
    } else {
      cell.setAttribute('aria-label', 'Row ' + (row + 1) + ', column ' + (col + 1) + ', empty');
    }
  });

  rnCountEl.textContent = String(getRNPositions().length);
}

function isSolved() {
  const positions = getRNPositions();
  if (positions.length !== SIZE || getConflicts().size > 0) return false;

  const rows = new Set(positions.map(function (p) { return p[0]; }));
  const cols = new Set(positions.map(function (p) { return p[1]; }));
  const regions = new Set(positions.map(function (p) { return REGIONS[p[0]][p[1]]; }));

  return rows.size === SIZE && cols.size === SIZE && regions.size === SIZE;
}

function checkShift() {
  const count = getRNPositions().length;
  const conflicts = getConflicts();

  if (isSolved()) {
    finished = true;
    clearInterval(timerId);
    timerEl.textContent = formatTime(Date.now() - startedAt);
    finalTimeEl.textContent = timerEl.textContent;
    messageEl.className = 'message success';
    messageEl.textContent = 'Shift complete. All staffing rules are satisfied.';
    localStorage.removeItem(SAVE_KEY);
    winDialog.showModal();
    return;
  }

  messageEl.className = 'message error';
  if (conflicts.size > 0) {
    messageEl.textContent = 'Staffing conflict: check rows, columns, care zones, and neighboring cells.';
  } else if (count < SIZE) {
    const remaining = SIZE - count;
    messageEl.textContent = 'You still need ' + remaining + ' RN placement' + (remaining === 1 ? '.' : 's.');
  } else {
    messageEl.textContent = 'Not quite. Recheck every row, column, and care zone.';
  }
}

function resetGame() {
  state = blankState();
  finished = false;
  messageEl.className = 'message';
  messageEl.textContent = '';
  localStorage.removeItem(SAVE_KEY);
  paintState();
  beginTimer(true);
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    state: state,
    elapsed: Date.now() - startedAt
  }));
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    const saved = JSON.parse(raw);
    if (!Array.isArray(saved.state) || saved.state.length !== SIZE) return false;
    if (!saved.state.every(function (row) { return Array.isArray(row) && row.length === SIZE; })) return false;

    state = saved.state;
    startedAt = Date.now() - Math.max(0, Number(saved.elapsed) || 0);
    return true;
  } catch (error) {
    return false;
  }
}

document.querySelectorAll('.mode-btn').forEach(function (button) {
  button.addEventListener('click', function () {
    mode = button.dataset.mode;
    document.querySelectorAll('.mode-btn').forEach(function (item) {
      item.classList.toggle('active', item === button);
    });
  });
});

document.getElementById('checkBtn').addEventListener('click', checkShift);
document.getElementById('resetBtn').addEventListener('click', resetGame);
document.getElementById('howToBtn').addEventListener('click', function () { howToDialog.showModal(); });
document.getElementById('closeHowToBtn').addEventListener('click', function () { howToDialog.close(); });
document.getElementById('startBtn').addEventListener('click', function () { howToDialog.close(); });
document.getElementById('playAgainBtn').addEventListener('click', function () {
  winDialog.close();
  resetGame();
});

renderBoard();
if (loadGame()) {
  paintState();
  beginTimer(false);
} else {
  beginTimer(true);
}
