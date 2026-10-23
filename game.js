const tileColors = {
    0: "#2a3a4a", 2: "#1a5276", 4: "#1f6fa8", 8: "#2389c9",
    16: "#4a90d9", 32: "#7b68ee", 64: "#9b4dca", 128: "#b833a1",
    256: "#cc3377", 512: "#e8954a", 1024: "#f0b429", 2048: "#ffcc00",
};

const textColors = {
    0: "#4a6a7a", 2: "#ffffff", 4: "#ffffff", 8: "#ffffff",
    16: "#ffffff", 32: "#ffffff", 64: "#ffffff", 128: "#ffffff",
    256: "#ffffff", 512: "#ffffff", 1024: "#ffffff", 2048: "#004c8e",
};

const savedGameKey = 'gameState';
const moveDuration = 115;
const settleDuration = 135;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let best = Number(localStorage.getItem('bestScore')) || 0;
let overlayDisplayed = false;
let goalReached = false;
let victorySeen = false;
let score = 0;
let isAnimating = false;
let pendingDirection = null;
let moveSequence = 0;
let board = createEmptyBoard();

localStorage.setItem('bestScore', String(best));

function createEmptyBoard() {
    return Array.from({ length: 4 }, () => [0, 0, 0, 0]);
}

function isValidBoard(savedBoard) {
    return Array.isArray(savedBoard) && savedBoard.length === 4
        && savedBoard.every(row => Array.isArray(row) && row.length === 4
            && row.every(tile => Number.isInteger(tile) && tile >= 0));
}

function loadGame() {
    try {
        const savedGame = JSON.parse(localStorage.getItem(savedGameKey));
        if (!savedGame || !isValidBoard(savedGame.board)
            || !Number.isFinite(savedGame.score) || savedGame.score < 0) return false;
        board = savedGame.board;
        score = savedGame.score;
        goalReached = Boolean(savedGame.goalReached);
        victorySeen = Boolean(savedGame.victorySeen);
        return true;
    } catch (error) {
        localStorage.removeItem(savedGameKey);
        return false;
    }
}

function saveGame() {
    localStorage.setItem(savedGameKey, JSON.stringify({ board, score, goalReached, victorySeen }));
}

function tileElement([row, column]) {
    return document.getElementById(`${row}${column}`);
}

function renderBoard() {
    for (let row = 0; row < 4; row++) {
        for (let column = 0; column < 4; column++) {
            const value = board[row][column];
            const tile = tileElement([row, column]);
            tile.textContent = value === 0 ? '' : value;
            tile.style.backgroundColor = tileColors[value] || tileColors[2048];
            tile.style.color = textColors[value] || textColors[2048];
        }
    }
}

function randomEmptyCell() {
    const emptyCells = [];
    for (let row = 0; row < 4; row++) {
        for (let column = 0; column < 4; column++) {
            if (board[row][column] === 0) emptyCells.push([row, column]);
        }
    }
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function spawnPiece() {
    const coords = randomEmptyCell();
    if (!coords) return null;
    board[coords[0]][coords[1]] = Math.random() < 0.1 ? 4 : 2;
    return coords;
}

function getLines(direction) {
    const lines = [];
    for (let index = 0; index < 4; index++) {
        if (direction === 'left') lines.push([0, 1, 2, 3].map(column => [index, column]));
        if (direction === 'right') lines.push([3, 2, 1, 0].map(column => [index, column]));
        if (direction === 'up') lines.push([0, 1, 2, 3].map(row => [row, index]));
        if (direction === 'down') lines.push([3, 2, 1, 0].map(row => [row, index]));
    }
    return lines;
}

function calculateMove(direction) {
    const nextBoard = createEmptyBoard();
    const movements = [];
    const mergedCells = [];
    let scoreGain = 0;

    for (const line of getLines(direction)) {
        const tiles = line.map(coords => ({ coords, value: board[coords[0]][coords[1]] }))
            .filter(tile => tile.value !== 0);
        let sourceIndex = 0;
        let destinationIndex = 0;

        while (sourceIndex < tiles.length) {
            const current = tiles[sourceIndex];
            const next = tiles[sourceIndex + 1];
            const destination = line[destinationIndex];

            if (next && current.value === next.value) {
                const mergedValue = current.value * 2;
                nextBoard[destination[0]][destination[1]] = mergedValue;
                movements.push({ from: current.coords, to: destination, value: current.value });
                movements.push({ from: next.coords, to: destination, value: next.value });
                mergedCells.push(destination);
                scoreGain += mergedValue;
                if (mergedValue === 2048) goalReached = true;
                sourceIndex += 2;
            } else {
                nextBoard[destination[0]][destination[1]] = current.value;
                movements.push({ from: current.coords, to: destination, value: current.value });
                sourceIndex += 1;
            }
            destinationIndex += 1;
        }
    }

    const changed = board.some((row, rowIndex) =>
        row.some((value, columnIndex) => value !== nextBoard[rowIndex][columnIndex]));
    return { changed, nextBoard, movements, mergedCells, scoreGain };
}

function animateMovement(movements) {
    if (reducedMotion.matches) return Promise.resolve();
    const container = document.querySelector('.boardContainer');
    const containerRect = container.getBoundingClientRect();
    const layer = document.createElement('div');
    layer.className = 'movementLayer';
    container.appendChild(layer);
    container.classList.add('isMoving');

    movements.forEach(({ from, to, value }) => {
        const sourceRect = tileElement(from).getBoundingClientRect();
        const targetRect = tileElement(to).getBoundingClientRect();
        const clone = tileElement(from).cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.remove('tileSpawn', 'tileMerge');
        clone.classList.add('movingTile');
        Object.assign(clone.style, {
            left: `${sourceRect.left - containerRect.left}px`,
            top: `${sourceRect.top - containerRect.top}px`,
            width: `${sourceRect.width}px`, height: `${sourceRect.height}px`,
            backgroundColor: tileColors[value] || tileColors[2048],
            color: textColors[value] || textColors[2048],
        });
        layer.appendChild(clone);
        clone.animate([
            { transform: 'translate3d(0, 0, 0)' },
            { transform: `translate3d(${targetRect.left - sourceRect.left}px, ${targetRect.top - sourceRect.top}px, 0)` },
        ], { duration: moveDuration, easing: 'cubic-bezier(.22,.8,.3,1)', fill: 'forwards' });
    });

    return new Promise(resolve => {
        window.setTimeout(() => {
            layer.remove();
            container.classList.remove('isMoving');
            resolve();
        }, moveDuration + 20);
    });
}

function replayClass(element, className) {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
}

function animateSettledTiles(spawnedCell, mergedCells) {
    mergedCells.forEach(coords => replayClass(tileElement(coords), 'tileMerge'));
    if (spawnedCell) replayClass(tileElement(spawnedCell), 'tileSpawn');
}

function clearTransientAnimations() {
    document.querySelectorAll('.tileSpawn, .tileMerge').forEach(tile => {
        tile.classList.remove('tileSpawn', 'tileMerge');
    });
}

function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function isBoardFull() {
    return board.every(row => row.every(value => value !== 0));
}

function hasValidMoves() {
    for (let row = 0; row < 4; row++) {
        for (let column = 0; column < 4; column++) {
            if (column < 3 && board[row][column] === board[row][column + 1]) return true;
            if (row < 3 && board[row][column] === board[row + 1][column]) return true;
        }
    }
    return false;
}

function checkGameOver() {
    return isBoardFull() && !hasValidMoves();
}

function animateScore(scoreGain, bestChanged) {
    if (scoreGain > 0) {
        const scoreValue = document.getElementById('scoreBoard');
        replayClass(scoreValue, 'scoreBump');
        if (!reducedMotion.matches) {
            document.querySelectorAll('.scoreGain').forEach(element => element.remove());
            const gain = document.createElement('span');
            gain.className = 'scoreGain';
            gain.textContent = `+${scoreGain}`;
            scoreValue.closest('.scoreBox').appendChild(gain);
            window.setTimeout(() => gain.remove(), 700);
        }
    }
    if (bestChanged) replayClass(document.getElementById('bestScore'), 'scoreBump');
}

function printScore(scoreGain = 0, bestChanged = false) {
    document.getElementById('scoreBoard').textContent = score;
    document.getElementById('bestScore').textContent = best;
    animateScore(scoreGain, bestChanged);
}

function updateBestScore() {
    if (score <= best) return false;
    best = score;
    localStorage.setItem('bestScore', String(score));
    return true;
}

async function handleMove(direction) {
    if (overlayDisplayed) return;
    if (isAnimating) {
        pendingDirection = direction;
        return;
    }
    const move = calculateMove(direction);
    if (!move.changed) return;
    isAnimating = true;
    clearTransientAnimations();
    const currentMove = ++moveSequence;
    board = move.nextBoard;
    score += move.scoreGain;
    const bestChanged = updateBestScore();
    await animateMovement(move.movements);
    if (currentMove !== moveSequence) return;
    const spawnedCell = spawnPiece();
    renderBoard();
    printScore(move.scoreGain, bestChanged);
    animateSettledTiles(spawnedCell, move.mergedCells);
    saveGame();
    await wait(reducedMotion.matches ? 0 : settleDuration);
    if (currentMove !== moveSequence) return;
    clearTransientAnimations();
    isAnimating = false;
    if (checkGameOver()) {
        pendingDirection = null;
        printGameOver();
        return;
    }
    if (goalReached && !victorySeen) {
        pendingDirection = null;
        printVictory();
        return;
    }

    const queuedDirection = pendingDirection;
    pendingDirection = null;
    if (queuedDirection) handleMove(queuedDirection);
}

function restart() {
    moveSequence += 1;
    isAnimating = false;
    pendingDirection = null;
    document.querySelectorAll('.movementLayer').forEach(layer => layer.remove());
    document.querySelector('.boardContainer').classList.remove('isMoving');
    clearTransientAnimations();
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('victory').classList.add('hidden');
    hideOverlay();
    goalReached = false;
    victorySeen = false;
    score = 0;
    board = createEmptyBoard();
    const firstCell = spawnPiece();
    const secondCell = spawnPiece();
    saveGame();
    renderBoard();
    printScore();
    animateSettledTiles(firstCell, []);
    window.setTimeout(() => {
        if (secondCell) replayClass(tileElement(secondCell), 'tileSpawn');
    }, reducedMotion.matches ? 0 : 70);
}

function printGameOver() {
    document.getElementById('gameOver').classList.remove('hidden');
    showOverlay();
}

function printVictory() {
    document.getElementById('victory').classList.remove('hidden');
    showOverlay();
}

function continuePlaying() {
    document.getElementById('victory').classList.add('hidden');
    hideOverlay();
    victorySeen = true;
    saveGame();
}

function showOverlay() {
    document.getElementById('overlay').classList.remove('hidden');
    overlayDisplayed = true;
}

function hideOverlay() {
    document.getElementById('overlay').classList.add('hidden');
    overlayDisplayed = false;
}

if (!loadGame()) {
    spawnPiece();
    spawnPiece();
    saveGame();
}
renderBoard();
printScore();
if (checkGameOver()) printGameOver();
else if (goalReached && !victorySeen) printVictory();

const directionByKey = {
    ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down',
};

document.addEventListener('keydown', event => {
    const direction = directionByKey[event.key];
    if (!direction) return;
    event.preventDefault();
    handleMove(direction);
});

document.getElementById('retry').addEventListener('click', restart);
document.getElementById('restart').addEventListener('click', restart);
document.getElementById('restartBtn').addEventListener('click', restart);
document.getElementById('continue').addEventListener('click', continuePlaying);
