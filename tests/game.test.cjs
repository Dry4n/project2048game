// Run with: node --test tests/game.test.cjs
// DOM contract tests plus independent movement-engine regression tests.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function boot({ reduced = false, initial } = {}) {
    const all = [];
    const ids = new Map();
    const pendingTimers = [];
    class Element {
        constructor(className = '') {
            this.className = className;
            this.children = [];
            this.parentNode = null;
            this.style = {};
            this.dataset = {};
            this.textContent = '';
            this.offsetLeft = 0;
            this.offsetTop = 0;
            this.offsetWidth = 100;
            this.offsetHeight = 100;
            const classes = () => new Set(this.className.split(' ').filter(Boolean));
            this.classList = {
                add: (...names) => { this.className = [...new Set([...classes(), ...names])].join(' '); },
                remove: (...names) => { this.className = [...classes()].filter(x => !names.includes(x)).join(' '); },
                replace: (from, to) => { this.className = [...classes()].map(x => x === from ? to : x).join(' '); },
                contains: name => classes().has(name),
            };
            all.push(this);
        }
        get firstChild() { return this.children[0]; }
        appendChild(child) { child.parentNode = this; this.children.push(child); }
        remove() {
            if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(x => x !== this);
            this.parentNode = null;
        }
        setAttribute() {}
        addEventListener() {}
        closest() { return scoreBox; }
        animate(frames, options) {
            assert.ok(frames.every(frame => !('transform' in frame)), 'slides never transform text');
            assert.equal(options.duration, 115);
            assert.equal(options.fill, 'both', 'the resting start frame must be held while playback is pending');
            assert.match(frames[0].easing, /^steps\([1-9]\d*, end\)$/);
            const animation = { frames, cancelled: false, cancel() { this.cancelled = true; } };
            this.lastAnimation = animation;
            return animation;
        }
    }
    const container = new Element('boardContainer');
    const grid = new Element('board');
    const scoreBox = new Element('scoreBox');
    container.appendChild(grid);
    for (let row = 0; row < 4; row++) {
        for (let column = 0; column < 4; column++) {
            const cell = new Element('tile');
            cell.offsetLeft = 10 + column * 108;
            cell.offsetTop = 10 + row * 108;
            grid.appendChild(cell);
            ids.set(`${row}${column}`, cell);
        }
    }
    for (const id of ['scoreBoard', 'bestScore', 'gameOver', 'victory', 'overlay', 'retry', 'restart', 'restartBtn', 'continue']) {
        const el = new Element();
        container.appendChild(el);
        ids.set(id, el);
    }
    function matches(el, selector) {
        if (selector === '.board .tile') return el.parentNode === grid && el.classList.contains('tile');
        return selector.startsWith('.') && el.classList.contains(selector.slice(1));
    }
    const storage = new Map();
    if (initial) storage.set('gameState', JSON.stringify(initial));
    const context = vm.createContext({
        console,
        document: {
            getElementById: id => ids.get(id),
            querySelector: selector => all.find(el => matches(el, selector)),
            querySelectorAll: selector => all.filter(el => el.parentNode && selector.split(', ').some(s => matches(el, s))),
            createElement: () => new Element(),
            addEventListener() {},
        },
        window: {
            matchMedia: () => ({ matches: reduced }),
            setTimeout: (callback, milliseconds) => { pendingTimers.push({ callback, milliseconds }); },
        },
        ResizeObserver: class { observe() {} },
        localStorage: {
            getItem: key => storage.get(key) || null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: key => storage.delete(key),
        },
    });
    const source = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
    vm.runInContext(source + `\nthis.game = {
        move: handleMove, restart,
        calculate(input, direction) { board = input; return calculateMove(direction); },
        seed(input) { board = input; renderBoard(); },
        get tiles() { return renderedTiles; },
        get board() { return board; },
        get busy() { return isAnimating; },
        get slides() { return activeSlides; },
        get queued() { return pendingDirection; },
    };`, context);
    return {
        game: context.game, storage, container,
        async tick() {
            const timers = pendingTimers.splice(0);
            timers.forEach(timer => timer.callback());
            await Promise.resolve();
            await Promise.resolve();
        },
        async drain() {
            for (let i = 0; i < 12; i++) await this.tick();
            assert.equal(context.game.busy, false);
        },
    };
}

const empty = () => Array.from({ length: 4 }, () => [0, 0, 0, 0]);
const plain = value => JSON.parse(JSON.stringify(value));

test('a slide retains the actual tile and label, including after settling', async () => {
    const env = boot();
    const input = empty(); input[2][3] = 128;
    env.game.seed(input);
    const tile = env.game.tiles.get('2,3');
    const label = tile.firstChild;
    const moving = env.game.move('left');
    assert.equal(tile.parentNode.className, 'tileLayer');
    assert.equal(tile.style.left, '10px');
    assert.equal(tile.style.top, '226px');
    assert.equal(tile.firstChild, label);
    assert.deepEqual(plain(tile.lastAnimation.frames), [
        { left: '334px', top: '226px', easing: 'steps(324, end)' }, { left: '10px', top: '226px' },
    ]);
    await env.drain(); await moving;
    assert.equal(env.game.tiles.get('2,0'), tile);
    assert.equal(tile.firstChild, label);
    assert.equal(tile.firstChild.textContent, '128');
    assert.equal(env.game.slides.size, 0);
});

test('merges retain one original tile and label; consumed pieces are removed', async () => {
    const env = boot();
    const input = empty(); input[0] = [2, 2, 2, 2];
    env.game.seed(input);
    const first = env.game.tiles.get('0,0');
    const label = first.firstChild;
    const consumed = env.game.tiles.get('0,1');
    const moving = env.game.move('left');
    await env.drain(); await moving;
    assert.equal(env.game.tiles.get('0,0'), first);
    assert.equal(first.firstChild, label);
    assert.equal(first.firstChild.textContent, '4');
    assert.equal(consumed.parentNode, null);
    assert.equal(env.game.tiles.size, 3); // two merges plus the spawned tile
});

test('all twelve tile values keep their own label in all four directions', async () => {
    for (const value of [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096]) {
        for (const [direction, from, to] of [
            ['left', [1, 3], [1, 0]], ['right', [1, 0], [1, 3]],
            ['up', [3, 1], [0, 1]], ['down', [0, 1], [3, 1]],
        ]) {
            const env = boot(); const input = empty(); input[from[0]][from[1]] = value;
            env.game.seed(input);
            const tile = env.game.tiles.get(from.join(','));
            const label = tile.firstChild;
            env.game.move(direction); await env.drain();
            assert.equal(env.game.tiles.get(to.join(',')), tile);
            assert.equal(tile.firstChild, label);
            assert.equal(label.textContent, String(value));
        }
    }
});

test('fast keys retain only the most recent queued direction', async () => {
    const env = boot(); const input = empty(); input[0][3] = 16;
    env.game.seed(input);
    env.game.move('left'); env.game.move('up'); env.game.move('right'); env.game.move('down');
    assert.equal(env.game.queued, 'down');
    await env.drain();
    assert.equal(env.game.queued, null);
    assert.equal(env.game.slides.size, 0);
    // A spawned tile below it may occupy row 3; either way it moved down.
    assert.ok(env.game.board[2][0] === 16 || env.game.board[3][0] === 16);
});

test('restart cancels pending slides and cannot be overwritten by an old move', async () => {
    const env = boot(); const input = empty(); input[0][3] = 1024;
    env.game.seed(input); env.game.move('left'); env.game.move('down');
    env.game.restart();
    const restarted = JSON.stringify(env.game.board);
    await env.drain();
    assert.equal(JSON.stringify(env.game.board), restarted);
    assert.equal(env.game.tiles.size, 2);
    assert.equal(env.game.slides.size, 0);
    assert.equal(env.game.queued, null);
});

test('reduced motion and persistence retain the same board and score', async () => {
    const input = empty(); input[0] = [0, 4, 0, 4];
    const env = boot({ reduced: true, initial: { board: input, score: 12 } });
    env.game.move('left'); await env.drain();
    assert.equal(env.game.slides.size, 0);
    const saved = JSON.parse(env.storage.get('gameState'));
    assert.equal(saved.score, 20);
    assert.deepEqual(saved.board, plain(env.game.board));
    const reopened = boot({ initial: saved });
    assert.deepEqual(plain(reopened.game.board), saved.board);
});

test('4000 directional moves match an independent reference', () => {
    const env = boot();
    function reference(input, direction) {
        const result = empty(); let gain = 0;
        for (let index = 0; index < 4; index++) {
            const coords = Array.from({ length: 4 }, (_, i) =>
                direction === 'left' ? [index, i] : direction === 'right' ? [index, 3 - i]
                    : direction === 'up' ? [i, index] : [3 - i, index]);
            const values = coords.map(([r, c]) => input[r][c]).filter(Boolean);
            const compressed = [];
            while (values.length) {
                let value = values.shift();
                if (value === values[0]) { value *= 2; gain += value; values.shift(); }
                compressed.push(value);
            }
            coords.forEach(([r, c], i) => { result[r][c] = compressed[i] || 0; });
        }
        return { result, gain };
    }
    for (let i = 0; i < 1000; i++) {
        const input = empty().map(row => row.map(() => [0, 0, 2, 4, 8, 16, 32][Math.floor(Math.random() * 7)]));
        for (const direction of ['left', 'right', 'up', 'down']) {
            const expected = reference(input, direction);
            const actual = env.game.calculate(input, direction);
            assert.deepEqual(plain(actual.nextBoard), expected.result);
            assert.equal(actual.scoreGain, expected.gain);
        }
    }
});
