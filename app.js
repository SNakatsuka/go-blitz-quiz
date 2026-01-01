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

    const prisB = p.prisoners?.black || 0;
    const prisW = p.prisoners?.white || 0;

    elGameInfo.innerHTML = `
      <div class="info-box">
        <div class="info-label">盤面</div>
        <div class="info-value">${p.size}路</div>
      </div>
      <div class="info-box">
        <div class="info-label">コミ</div>
        <div class="info-value">${p.komi}</div>
      </div>
      <div class="info-box">
        <div class="info-label">黒アゲハマ</div>
        <div class="info-value red-text">+${prisB}</div>
      </div>
      <div class="info-box">
        <div class="info-label">白アゲハマ</div>
        <div class="info-value red-text">+${prisW}</div>
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
    if (!currentProblem) return;

    const resStr = currentProblem.result;
    let actualDiff = 0;
    if (resStr.startsWith("B+")) actualDiff = parseFloat(resStr.substring(2));
    else if (resStr.startsWith("W+")) actualDiff = -parseFloat(resStr.substring(2));

    let userDiff = 0;
    const mode = selMode.value;

    if (mode === 'winner') {
      const winner = inpWinner.value;
      const margin = parseFloat(inpMargin.value);
      if (isNaN(margin) || margin < 0) { alert("目数を正しく入力してください"); return; }
      userDiff = (winner === 'black') ? margin : -margin;
    } else {
      const d = parseFloat(inpDiff.value);
      if (isNaN(d)) { alert("目数差を入力してください"); return; }
      userDiff = d;
    }

    const isCorrect = Math.abs(userDiff - actualDiff) < 0.1;

    const p = currentProblem;
    const prisB = p.prisoners?.black || 0;
    const prisW = p.prisoners?.white || 0;
    const komi = p.komi;

    const actualWinner = actualDiff > 0 ? "黒" : "白";
    const marginAbs = Math.abs(actualDiff);

    elResultArea.style.display = "block";
    elResultArea.innerHTML = `
      <div class="result-box ${isCorrect ? 'correct' : 'wrong'}">
        <div style="font-size:1.2rem; margin-bottom:8px;">
          ${isCorrect ?
            `正解！ お見事！` :
            `残念… 正解は <b>${actualWinner} ${marginAbs}目勝ち</b>`
          }
        </div>

        <div style="font-size:0.95rem; text-align:left; line-height:1.6;">
          <b>内訳:</b><br>
          黒 = 黒地 + 黒アゲハマ(${prisB})<br>
          白 = 白地 + 白アゲハマ(${prisW}) + コミ(${komi})<br><br>
          (黒合計) − (白合計) = ${actualDiff} 目
        </div>
      </div>
    `;

    if (!isCorrect) {
      lives--;
      updateStatus();
      if (lives <= 0) {
        elStatus.innerHTML = "ゲームオーバー！リスタートしてください。";
        btnSubmit.disabled = true;
        btnNext.style.display = 'none';
        return;
      }
    } else {
      score += 10;
      updateStatus();
    }

    btnSubmit.disabled = true;
    btnNext.style.display = "inline-block";
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
