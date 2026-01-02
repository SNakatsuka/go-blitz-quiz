(function(){
  const MODES = {
    9:  { url: './data/problems_9.json',  size: 9,  starPoints: [2, 6, 4] },
    19: { url: './data/problems_19.json', size: 19, starPoints: [3, 9, 15] }
  };

  let currentSize = 9;
  let quizData = [];
  let currentIndex = 0;
  let score = 0;
  let lives = 3;
  let currentProblem = null;

  // DOM
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const sizeSelect = document.getElementById('boardSizeSelect');

  const elProblemIdx = document.getElementById('problemIdx');
  const elProblemTotal = document.getElementById('problemTotal');
  const elLives = document.getElementById('lives');
  const elScore = document.getElementById('score');
  const elStatus = document.getElementById('status');

  const elGameInfo = document.getElementById('gameInfo');
  const elResultArea = document.getElementById('resultArea');

  const btnSubmit = document.getElementById('submitBtn');
  const btnRestart = document.getElementById('restartBtn');
  const btnNext = document.getElementById('btnNext');

  const selMode = document.getElementById('answerMode');
  const boxWinner = document.getElementById('answerWinnerBox');
  const boxDiff = document.getElementById('answerDiffBox');

  const inpWinner = document.getElementById('ansWinner');
  const inpMargin = document.getElementById('ansMargin');
  const inpDiff = document.getElementById('ansDiff');

  /* -----------------------------
     Canvas を表示サイズに合わせる
  ----------------------------- */
  function resizeCanvasToDisplaySize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      return true;
    }
    return false;
  }
  
  /* -----------------------------
     モード読み込み
  ----------------------------- */
  async function loadGameMode(size) {
    currentSize = size;
    const config = MODES[size];

    quizData = [];
    currentProblem = null;
    score = 0;
    lives = 3;
    currentIndex = 0;

    btnSubmit.disabled = false;
    btnNext.style.display = 'none';

    updateStatus();
    elStatus.textContent = "データを読み込んでいます...";
    elStatus.className = "status-msg";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const res = await fetch(config.url + '?t=' + Date.now());
      if (!res.ok) throw new Error("File not found: " + config.url);

      quizData = await res.json();
      quizData.sort(() => Math.random() - 0.5);

      elProblemTotal.textContent = quizData.length;
      nextProblem();

    } catch (e) {
      console.error(e);
      elStatus.textContent = "データ読込失敗: " + e.message;
      elStatus.className = "status-msg red";
    }
  }
  
  /* -----------------------------
     ステータス更新
  ----------------------------- */
  function updateStatus() {
    elScore.textContent = score;
    elLives.textContent = lives;
    elProblemIdx.textContent = quizData.length ? Math.min(currentIndex, quizData.length) : 0;
  }

  /* -----------------------------
     UI 更新
  ----------------------------- */
  function updateUI() {
    resizeCanvasToDisplaySize(canvas);

    const p = currentProblem;
    if (!p) return;

    const blackMoves = problem.moves.black;
    const whiteMoves = problem.moves.white;
    
    const blackStones = problem.stones.black.length;
    const whiteStones = problem.stones.white.length;
    
    const prisB = whiteMoves - whiteStones; // 黒アゲハマ
    const prisW = blackMoves - blackStones; // 白アゲハマ

    elGameInfo.innerHTML = `
      <div class="info-box">
        <div class="info-label">盤面</div>
        <div class="info-value">${p.size}路</div>
      </div>
    
      <div class="info-box">
        <div class="info-label">コミ（日本ルール）</div>
        <div class="info-value">6.5</div>
      </div>
    
      <div class="info-box">
        <div class="info-label">黒アゲハマ</div>
        <div class="info-value red-text">+${prisB}</div>
      </div>
    
      <div class="info-box">
        <div class="info-label">白アゲハマ</div>
        <div class="info-value red-text">+${prisW}</div>
      </div>
    
      <div class="rule-note">
        ※ この表示は日本ルール（地＋アゲハマ＋コミ6.5）に基づいています。
           問題自体は中国ルールで生成されています。
      </div>
    `;
    
    drawBoard(p);
  }

  /* -----------------------------
     盤面描画
  ----------------------------- */
  function drawBoard(problem) {
    const displayW = canvas.clientWidth;
    const displayH = canvas.clientHeight;

    const margin = Math.round(displayW * 0.05);
    const boardW = displayW - margin * 2;
    const size = currentSize;
    const cellSize = boardW / (size - 1);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#d3a052";
    ctx.fillRect(0, 0, displayW, displayH);

    ctx.beginPath();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;

    for (let i = 0; i < size; i++) {
      const pos = margin + i * cellSize;
      ctx.moveTo(margin, pos);
      ctx.lineTo(margin + boardW, pos);
      ctx.moveTo(pos, margin);
      ctx.lineTo(pos, margin + boardW);
    }
    ctx.stroke();

    const starIndices = MODES[size].starPoints;
    ctx.fillStyle = "#000";
    starIndices.forEach(r => {
      starIndices.forEach(c => {
        let drawStar = false;
        if (size === 19) drawStar = true;
        else if (size === 9) {
          if (r === 4 && c === 4) drawStar = true;
          if ((r === 2 || r === 6) && (c === 2 || c === 6)) drawStar = true;
        }
        if (drawStar) {
          ctx.beginPath();
          ctx.arc(margin + c * cellSize, margin + r * cellSize, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });

    const radius = cellSize * 0.45;
    function drawStone(x, y, color) {
      const cx = margin + x * cellSize;
      const cy = margin + y * cellSize;

      ctx.beginPath();
      ctx.arc(cx + 1, cy + 1, radius, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color === 'black' ? "#111" : "#fff";
      ctx.fill();

      if (color === 'white') {
        ctx.strokeStyle = "#ccc";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    problem.stones.black.forEach(pos => drawStone(pos[0], pos[1], 'black'));
    problem.stones.white.forEach(pos => drawStone(pos[0], pos[1], 'white'));
  }

  function computeTerritory(problem) {
    const size = problem.size;
    const board = Array.from({ length: size }, () => Array(size).fill(0));
  
    // 1 = 黒石, -1 = 白石, 0 = 空点
    problem.stones.black.forEach(([x, y]) => board[y][x] = 1);
    problem.stones.white.forEach(([x, y]) => board[y][x] = -1);
  
    const visited = Array.from({ length: size }, () => Array(size).fill(false));
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  
    let blackTerritory = 0;
    let whiteTerritory = 0;
  
    function bfs(sx, sy) {
      const queue = [[sx, sy]];
      visited[sy][sx] = true;
  
      const region = [[sx, sy]];
      const neighbors = new Set();
  
      while (queue.length) {
        const [x, y] = queue.shift();
  
        for (const [dx, dy] of dirs) {
          const nx = x + dx;
          const ny = y + dy;
  
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
  
          const v = board[ny][nx];
  
          if (v === 0 && !visited[ny][nx]) {
            visited[ny][nx] = true;
            queue.push([nx, ny]);
            region.push([nx, ny]);
          } else if (v === 1) {
            neighbors.add("black");
          } else if (v === -1) {
            neighbors.add("white");
          }
        }
      }
  
      if (neighbors.size === 1) {
        if (neighbors.has("black")) blackTerritory += region.length;
        if (neighbors.has("white")) whiteTerritory += region.length;
      }
    }
  
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] === 0 && !visited[y][x]) bfs(x, y);
      }
    }
  
    return { blackTerritory, whiteTerritory };
  }

  function scoreJapanese(problem) {
    const { blackTerritory, whiteTerritory } = computeTerritory(problem);
    const blackMoves = problem.moves.black; // ← これを JSON に入れればOK
    const whiteMoves = problem.moves.white;
    
    const blackStones = problem.stones.black.length;
    const whiteStones = problem.stones.white.length;
    
    const prisB = whiteMoves - whiteStones;
    const prisW = blackMoves - blackStones;
    
    // 日本ルールはコミ 6.5 に固定
    const komi = 6.5;
  
    const black = blackTerritory + prisB;
    const white = whiteTerritory + prisW + komi;
  
    return black - white; // 黒が正なら黒勝ち
  }
  
  /* -----------------------------
     回答チェック
  ----------------------------- */
  function restartGame() {
    score = 0;
    lives = 3;
    currentIndex = 0;
    quizData.sort(() => Math.random() - 0.5);
    btnSubmit.disabled = false;
    btnNext.style.display = 'none';
    elStatus.textContent = "";
    updateStatus();
    nextProblem();
  }
    
  function checkAnswer() {
    const userDiff = parseFloat(elInput.value);
    if (isNaN(userDiff)) return;
  
    const diffJapanese = scoreJapanese(currentProblem);
  
    const isCorrect = Math.abs(userDiff - diffJapanese) < 0.1;
  
    showResult(isCorrect, diffJapanese);
  }
  
  function showResult(isCorrect, diffJapanese) {
    elResultArea.style.display = "block";  // ← これが必須！  
    
    const { blackTerritory, whiteTerritory } = computeTerritory(currentProblem);
  
    const blackMoves = currentProblem.moves.black;
    const whiteMoves = currentProblem.moves.white;
  
    const blackStones = currentProblem.stones.black.length;
    const whiteStones = currentProblem.stones.white.length;
  
    const prisB = whiteMoves - whiteStones;
    const prisW = blackMoves - blackStones;
  
    const komi = 6.5;
  
    elResultArea.innerHTML = `
      <div class="result-box ${isCorrect ? 'correct' : 'wrong'}">
        <div class="result-title">
          ${isCorrect ? "正解！" : "残念…"}
        </div>
  
        <div class="result-detail">
          <b>日本ルールでの内訳:</b><br>
          黒地: ${blackTerritory}<br>
          白地: ${whiteTerritory}<br>
          黒アゲハマ: ${prisB}<br>
          白アゲハマ: ${prisW}<br>
          コミ: ${komi}<br>
          <br>
          <b>差分（黒 − 白） = ${diffJapanese.toFixed(1)} 目</b>
        </div>
  
        <div class="rule-note">
          ※ アゲハマは日本ルールの計算時のみ使用されます。
        </div>
      </div>
    `;
    
    elResultArea.scrollIntoView({ behavior: "smooth", block: "center" });
  }  
  /* -----------------------------
     次の問題へ
  ----------------------------- */
  function nextProblem() {
    if (!quizData || quizData.length === 0) return;

    if (currentIndex >= quizData.length) {
      elStatus.textContent = "全問終了しました。スコア: " + score;
      elStatus.className = "status-msg";
      btnSubmit.disabled = true;
      btnNext.style.display = "none";
      return;
    }

    currentProblem = quizData[currentIndex];
    currentIndex++;

    inpDiff.value = "";
    inpMargin.value = "";
    elStatus.textContent = "";
    elStatus.className = "status-msg";

    elResultArea.style.display = "none";
    elResultArea.innerHTML = "";

    btnNext.style.display = "none";
    btnSubmit.disabled = false;

    resizeCanvasToDisplaySize(canvas);
    updateUI();
    updateStatus();
  }
  /* -----------------------------
     初期化
  ----------------------------- */
  function init() {
    console.log("init called");

    btnNext.style.display = 'none';

    btnSubmit.addEventListener('click', checkAnswer);
    btnRestart.addEventListener('click', restartGame);
    btnNext.addEventListener('click', nextProblem);

    selMode.addEventListener('change', () => {
      if (selMode.value === 'winner') {
        boxWinner.style.display = 'block';
        boxDiff.style.display = 'none';
      } else {
        boxWinner.style.display = 'none';
        boxDiff.style.display = 'block';
      }
    });

    sizeSelect.addEventListener('change', (e) => {
      loadGameMode(parseInt(e.target.value, 10));
    });

    // ウィンドウリサイズ時に盤面を再描画
    window.addEventListener('resize', () => {
      if (currentProblem) {
        resizeCanvasToDisplaySize(canvas);
        updateUI();
      }
    });

    loadGameMode(9);
  }

  init();

})();
