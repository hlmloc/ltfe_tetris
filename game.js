const ROWS = 20;
const COLS = 10;

let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let linesCleared = 0;
let level = 1;
let isGameOver = false;
let isPaused = false;
let gameInterval = null;

let windTimer = null;
let lavaTimer = null;
let meteorTimer = null;
let isInverted = false;

const SHAPES = {
    I: [[1, 1, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    T: [[0, 1, 0], [1, 1, 1]],
    Z: [[1, 1, 0], [0, 1, 1]],
    BOMB: [[1]]
};

const TYPES = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

const LEVEL_CONFIG = {
    1: { name: "Level 1: Cơ Bản", targetLines: 5, speed: 650 },
    2: { name: "Level 2: Rào Cản Đáy", targetLines: 6, speed: 550 },
    3: { name: "Level 3: Bộc Phá Bom", targetLines: 7, speed: 450 },
    4: { name: "Level 4: Đảo Ngược Phím", targetLines: 8, speed: 380 },
    5: { name: "Level 5: Nham Thạch Dâng", targetLines: 9, speed: 320 },
    6: { name: "Level 6: Cột Bị Khóa", targetLines: 10, speed: 250 },
    7: { name: "Level 7: Thiên Thạch Rơi", targetLines: 11, speed: 200 },
    8: { name: "Level 8: Tử Thần (BOSS FINAL)", targetLines: 12, speed: 150 }
};

function initGame(col, row) {
    const gameBoard = document.getElementById("game_board");
    gameBoard.innerHTML = "";

    for (let i = 0; i < row; i++) {
        let tr = document.createElement("tr");
        for (let j = 0; j < col; j++) {
            let td = document.createElement("td");
            td.id = "cell_" + i + "_" + j;
            td.classList.add("cell");
            tr.appendChild(td);
        }
        gameBoard.appendChild(tr);
    }

    const nextBoard = document.getElementById("next_board");
    nextBoard.innerHTML = "";
    for (let i = 0; i < 4; i++) {
        let tr = document.createElement("tr");
        for (let j = 0; j < 4; j++) {
            let td = document.createElement("td");
            td.id = "next_cell_" + i + "_" + j;
            tr.appendChild(td);
        }
        nextBoard.appendChild(tr);
    }
}

function render() {
    for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLS; j++) {
            let cell = document.getElementById("cell_" + i + "_" + j);
            if (cell) {
                cell.className = "cell";
                let val = board[i][j];
                if (val === 0) {
                    cell.classList.add("cell_empty");
                } else if (val === 8) {
                    cell.classList.add("cell_obstacle");
                } else if (val === 9) {
                    cell.classList.add("cell_lava");
                } else if (typeof val === 'string') {
                    cell.classList.add("cell_" + val);
                }
            }
        }
    }

    if (currentPiece) {
        for (let r = 0; r < currentPiece.shape.length; r++) {
            for (let c = 0; c < currentPiece.shape[r].length; c++) {
                if (currentPiece.shape[r][c]) {
                    let boardR = currentPiece.row + r;
                    let boardC = currentPiece.col + c;
                    if (boardR >= 0 && boardR < ROWS && boardC >= 0 && boardC < COLS) {
                        let cell = document.getElementById("cell_" + boardR + "_" + boardC);
                        if (cell) {
                            cell.className = "cell";
                            if (currentPiece.type === 'BOMB') {
                                cell.classList.add("cell_bomb");
                            } else {
                                cell.classList.add("cell_" + currentPiece.type);
                            }
                        }
                    }
                }
            }
        }
    }

    renderNextPiece();
}

function renderNextPiece() {
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            let cell = document.getElementById("next_cell_" + i + "_" + j);
            if (cell) cell.className = "";
        }
    }
    if (nextPiece) {
        for (let r = 0; r < nextPiece.shape.length; r++) {
            for (let c = 0; c < nextPiece.shape[r].length; c++) {
                if (nextPiece.shape[r][c]) {
                    let cell = document.getElementById("next_cell_" + (r + 1) + "_" + (c + 1));
                    if (cell) {
                        cell.classList.add(nextPiece.type === 'BOMB' ? 'cell_bomb' : 'cell_' + nextPiece.type);
                    }
                }
            }
        }
    }
}

function startNewGame() {
    clearInterval(gameInterval);
    clearInterval(windTimer);
    clearInterval(lavaTimer);
    clearInterval(meteorTimer);

    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

    score = 0;
    linesCleared = 0;
    isGameOver = false;
    isPaused = false;
    isInverted = false;

    updateUI();
    nextPiece = createRandomPiece();
    spawnPiece();

    initLevelMechanics();

    $("#btn_pause").prop("disabled", false).text("TẠM DỪNG");

    gameInterval = setInterval(gameLoop, LEVEL_CONFIG[level].speed);
    render();
}

function createRandomPiece() {
    if ((level === 3 || level === 8) && Math.random() < 0.25) {
        return { shape: SHAPES.BOMB, type: 'BOMB', row: 0, col: 4 };
    }
    let type = TYPES[Math.floor(Math.random() * TYPES.length)];
    return { shape: SHAPES[type], type: type, row: 0, col: 3 };
}

function spawnPiece() {
    currentPiece = nextPiece;
    nextPiece = createRandomPiece();

    if (checkCollision(currentPiece.shape, currentPiece.row, currentPiece.col)) {
        endGame(false);
    }
}

function checkCollision(shape, rOffset, cOffset) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
                let newR = rOffset + r;
                let newC = cOffset + c;

                if (newC < 0 || newC >= COLS || newR >= ROWS) return true;
                if (newR >= 0 && board[newR][newC] !== 0) return true;
            }
        }
    }
    return false;
}

function rotatePiece() {
    if (!currentPiece || isPaused || isGameOver) return;
    let shape = currentPiece.shape;
    let newShape = shape[0].map((_, index) => shape.map(row => row[index]).reverse());

    if (!checkCollision(newShape, currentPiece.row, currentPiece.col)) {
        currentPiece.shape = newShape;
        playSound('rotate');
        render();
    }
}

function movePiece(dirR, dirC) {
    if (!currentPiece || isPaused || isGameOver) return false;

    if (dirC !== 0 && level === 4 && isInverted) {
        dirC = -dirC;
    }

    if (!checkCollision(currentPiece.shape, currentPiece.row + dirR, currentPiece.col + dirC)) {
        currentPiece.row += dirR;
        currentPiece.col += dirC;
        if (dirC !== 0) playSound('move');
        render();
        return true;
    }

    if (dirR > 0) {
        lockPiece();
    }
    return false;
}

function hardDrop() {
    if (!currentPiece || isPaused || isGameOver) return;
    while (movePiece(1, 0)) {}
}

function lockPiece() {
    if (currentPiece.type === 'BOMB') {
        playSound('bomb');
        let centerR = currentPiece.row;
        let centerC = currentPiece.col;

        for (let r = centerR - 1; r <= centerR + 1; r++) {
            for (let c = centerC - 1; c <= centerC + 1; c++) {
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                    board[r][c] = 0;
                }
            }
        }
        score += 150;
    } else {
        for (let r = 0; r < currentPiece.shape.length; r++) {
            for (let c = 0; c < currentPiece.shape[r].length; c++) {
                if (currentPiece.shape[r][c]) {
                    let boardR = currentPiece.row + r;
                    let boardC = currentPiece.col + c;
                    if (boardR >= 0 && boardR < ROWS) {
                        board[boardR][boardC] = currentPiece.type;
                    }
                }
            }
        }
    }

    checkLineClear();
    spawnPiece();
    render();
}

function checkLineClear() {
    let linesToClear = [];

    for (let r = 0; r < ROWS; r++) {
        let isFull = true;
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] === 0 || board[r][c] === 9) {
                isFull = false;
                break;
            }
        }
        if (isFull) linesToClear.push(r);
    }

    if (linesToClear.length > 0) {
        playSound('clear');
        linesToClear.forEach(r => {
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(0));
        });

        if (level === 6) {
            for (let r = 0; r < ROWS; r++) {
                board[r][0] = 8;
                board[r][COLS - 1] = 8;
            }
        }

        linesCleared += linesToClear.length;
        score += linesToClear.length * 100 * level;
        updateUI();

        if (linesCleared >= LEVEL_CONFIG[level].targetLines) {
            if (level < 8) {
                levelUp();
            } else {
                endGame(true);
            }
        }
    }
}

function levelUp() {
    level++;
    linesCleared = 0;
    playSound('levelup');

    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

    $("#level_select").val(level);

    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, LEVEL_CONFIG[level].speed);

    initLevelMechanics();
    updateUI();
    render();
}

function initLevelMechanics() {
    clearInterval(windTimer);
    clearInterval(lavaTimer);
    clearInterval(meteorTimer);
    isInverted = false;

    if (level === 2) {
        for (let r = ROWS - 2; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (Math.random() < 0.5) board[r][c] = 8;
            }
        }
    }

    if (level === 4) {
        windTimer = setInterval(() => {
            if (!isPaused && !isGameOver) {
                isInverted = !isInverted;
                if (isInverted) {
                    $("#level_title").text("Level 4: Đảo Ngược Phím (ĐANG ĐẢO PHÍM!)");
                } else {
                    $("#level_title").text("Level 4: Đảo Ngược Phím (BÌNH THƯỜNG)");
                }
            }
        }, 7000);
    }

    if (level === 5 || level === 8) {
        lavaTimer = setInterval(() => {
            if (!isPaused && !isGameOver) {
                board.shift();
                board.push(Array(COLS).fill(9));
                render();
            }
        }, 10000);
    }

    if (level === 6) {
        for (let r = 0; r < ROWS; r++) {
            board[r][0] = 8;
            board[r][COLS - 1] = 8;
        }
    }

    if (level === 7) {
        meteorTimer = setInterval(() => {
            if (!isPaused && !isGameOver) {
                let col = Math.floor(Math.random() * COLS);
                for (let r = ROWS - 1; r >= 0; r--) {
                    if (board[r][col] === 0) {
                        board[r][col] = 8;
                        break;
                    }
                }
                render();
            }
        }, 7000);
    }
}

function gameLoop() {
    if (!isPaused && !isGameOver) {
        movePiece(1, 0);
    }
}

function updateUI() {
    $("#score").text(score);
    $("#lines").text(`${linesCleared} / ${LEVEL_CONFIG[level].targetLines}`);
    $("#level_title").text(LEVEL_CONFIG[level].name);
}

function endGame(isWin) {
    isGameOver = true;
    clearInterval(gameInterval);
    clearInterval(windTimer);
    clearInterval(lavaTimer);
    clearInterval(meteorTimer);

    if (isWin) {
        playSound('levelup');
        $("#modal_title").text("CHÚC MỪNG CHIẾN THẮNG!");
        $("#modal_body").html(`<h4 class="text-success">Bạn đã phá đảo cả 8 Level!</h4><p>Điểm số: <b>${score}</b></p>`);
    } else {
        playSound('gameover');
        $("#modal_title").text("GAME OVER");
        $("#modal_body").html(`<h4 class="text-danger">Bị kẹt khối gạch!</h4><p>Dừng ở <b>Level ${level}</b><br>Điểm số: <b>${score}</b></p>`);
    }

    let modal = new bootstrap.Modal(document.getElementById('game_modal'));
    modal.show();
}

function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
        $("#btn_pause").text("TIẾP TỤC");
    } else {
        $("#btn_pause").text("TẠM DỪNG");
    }
}

function playSound(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        let now = ctx.currentTime;
        if (type === 'move') {
            osc.frequency.setValueAtTime(200, now);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'rotate') {
            osc.frequency.setValueAtTime(400, now);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'clear') {
            osc.frequency.setValueAtTime(523, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'bomb') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'levelup') {
            osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'gameover') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        }
    } catch (e) {}
}

$(document).ready(function() {
    initGame(COLS, ROWS);

    $("#level_select").change(function() {
        level = parseInt($(this).val());
        startNewGame();
    });

    $("#btn_start, #modal_btn_restart").click(function() {
        level = parseInt($("#level_select").val()) || 1;
        startNewGame();
    });

    $("#btn_pause").click(function() {
        togglePause();
    });

    $("#ctrl_left").click(() => movePiece(0, -1));
    $("#ctrl_right").click(() => movePiece(0, 1));
    $("#ctrl_rotate").click(() => rotatePiece());
    $("#ctrl_drop").click(() => hardDrop());

    $(document).keydown(function(e) {
        if (isGameOver) return;

        switch (e.which) {
            case 37:
                movePiece(0, -1);
                e.preventDefault();
                break;
            case 38:
                rotatePiece();
                e.preventDefault();
                break;
            case 39:
                movePiece(0, 1);
                e.preventDefault();
                break;
            case 40:
                movePiece(1, 0);
                e.preventDefault();
                break;
            case 32:
                hardDrop();
                e.preventDefault();
                break;
            case 80:
                togglePause();
                e.preventDefault();
                break;
        }
    });
});