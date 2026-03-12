// const tileColors = {
//     0: "#e0e0e0",
//     2: "#cce5ff",
//     4: "#99cbff",
//     8: "#66b0ff",
//     16: "#3395ff",
//     32: "#0077ff",
//     64: "#0055cc",
//     128: "#6600cc",
//     256: "#7b00bb",
//     512: "#9900aa",
//     1024: "#cc6600",
//     2048: "#ffaa00",

// }

// const textColors = {
//     0: "#e0e0e0",
//     2: "#333333",
//     4: "#333333",
//     8: "#ffffff",
//     16: "#ffffff",
//     32: "#ffffff",
//     64: "#ffffff",
//     128: "#ffffff",
//     256: "#ffffff",
//     512: "#ffffff",
//     1024: "#ffffff",
//     2048: "#1a1a1a",
// }
const tileColors = {
    0:    "#d9d9d9",
    2:    "#a8c8e8",
    4:    "#5ba3d9",
    8:    "#ff9f5b",
    16:   "#ff7043",
    32:   "#ff3d2e",
    64:   "#e8001a",
    128:  "#c2006e",
    256:  "#744786",
    512:  "#6a00ff",
    1024: "#ffe854",
    2048: "#ffcc00",
}

const textColors = {
    0:    "#888888",
    2:    "#444444",
    4:    "#ffffff",
    8:    "#ffffff",
    16:   "#ffffff",
    32:   "#ffffff",
    64:   "#ffffff",
    128:  "#ffffff",
    256:  "#ffffff",
    512:  "#ffffff",
    1024: "#1a1a1a",
    2048: "#1a1a1a",
}

let goalReached = false;
let score = 0;
let moved = false;
let board = [
    [2, 4, 8, 16],
    [256, 128, 64, 32],
    [512, 1024, 2048, 4096],
    [0, 0, 0, 0],
]

function renderBoard() {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board.length; j++) {
            let id = "" + i + j;
            document.getElementById(id).innerHTML = board[i][j] != 0 ? board[i][j] : "";
            document.getElementById(id).style.backgroundColor = tileColors[board[i][j]] || "#FFCC00";
            document.getElementById(id).style.color = textColors[board[i][j]] || "#004c8e";
        }
    }
}

function spawnPiece() {
    let coords = genRandomTile();
    let tile = Math.round(Math.random() * 9);

    while (board[coords[0]][coords[1]] != 0) {
        coords = genRandomTile();
    }
    board[coords[0]][coords[1]] = (tile == 0) ? 4 : 2;
}

function genRandomTile() {
    let x = Math.round(Math.random() * 3)
    let y = Math.round(Math.random() * 3)
    return [x, y]
}


function checkGameOver() {
    return (isBoardFull() && !hasValidMoves());
}

function isBoardFull() {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board.length; j++) {
            if (board[i][j] == 0) {
                return false
            }
        }
    }
    return true;
}

function hasValidMoves() {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board.length - 1; j++) {
            if (board[i][j] == board[i][j + 1]) {
                return true;
            }
        }
    }
    for (let i = 0; i < board.length - 1; i++) {
        for (let j = 0; j < board.length; j++) {
            if (board[i][j] == board[i + 1][j]) {
                return true;
            }
        }
    }
    return false;
}

function moveLeft() {
    //Quitamos 0s
    for (const row of board) {
        for (let i = 0; i < row.length; i++) {
            if (row[i] == 0) {
                row.splice(i, 1);
                i--;
                console.log(row);
            }
        }
    }

    //Mergeamos tiles
    for (const row of board) {
        if (row.length > 1) {
            for (let i = 0; i < row.length; i++) {
                if (row[i] == row[i + 1]) {
                    row[i] *= 2
                    score += row[i];
                    goalReached = row[i] == 2048 ? true : false;
                    row.splice(i + 1, 1)
                }
            }
        }
        //Añadimos 0s al final
        while (row.length < 4) {
            row.push(0);
        }
    }

}

function moveRight() {
    for (let i = 0; i < board.length; i++) {
        board[i].reverse();
    }
    moveLeft();
    for (let i = 0; i < board.length; i++) {
        board[i].reverse();
    }
}

function moveUp() {
    transposeBoard();
    moveLeft();
    transposeBoard();
}

function moveDown() {
    transposeBoard();
    moveRight();
    transposeBoard();
}

function transposeBoard() {
    let transposed = new Array(board.length)

    for (let i = 0; i < board.length; i++) {
        transposed[i] = new Array(board.length)
    }

    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board.length; j++) {
            transposed[i][j] = board[j][i];
        }
    }
    board = transposed;
}

function compareBoards(boardCopy) {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board.length; j++) {
            if (boardCopy[i][j] !== board[i][j])
                return false;
        }
    }
    return true;
}

function printScore() {
    document.getElementById("scoreBoard").innerHTML = `Score: ${score}`
}

function restart() {
    document.getElementById('gameOver').classList.add("hidden");
    document.getElementById('victory').classList.add("hidden");

    goalReached = false;
    board = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ]
    score = 0;
    spawnPiece();
    renderBoard();
    printScore();
}

function printGameOver() {
    document.getElementById('gameOver').classList.remove("hidden");
}

function printVictory() {
    document.getElementById('victory').classList.remove("hidden");
}

function continuePlaying() {
    document.getElementById('victory').innerHTML = "";
    document.getElementById('victory').remove();
}

spawnPiece();
renderBoard();
printScore();

document.addEventListener("keydown", function (event) {

    let boardCopy = board.map(row => row.slice());
    switch (event.key) {
        case 'ArrowLeft':
            moveLeft();
            moved = !compareBoards(boardCopy);
            break;
        case 'ArrowUp':
            moveUp();
            moved = !compareBoards(boardCopy);
            break;
        case 'ArrowRight':
            moveRight();
            moved = !compareBoards(boardCopy);
            break;
        case 'ArrowDown':
            moveDown();
            moved = !compareBoards(boardCopy);
            break;
        default:
            moved = false;
            break;
    }
    if (!checkGameOver() && moved) { spawnPiece(); }
    printScore();
    renderBoard();

    if (checkGameOver()) {
        printGameOver();
        return;
    }

    if (goalReached) {
        printVictory();
        return;
    }
})

document.getElementById('gameOver').classList.add("hidden");
document.getElementById('victory').classList.add("hidden");

let retryButton = document.getElementById("retry");
retryButton.addEventListener('click', restart);

let restartButton = document.getElementById("restart");
restartButton.addEventListener('click', restart);

let continueButton = document.getElementById("continue");
continueButton.addEventListener('click', continuePlaying);