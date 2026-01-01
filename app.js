(function(){
  const CANVAS_SIZE = 600; 
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
  
  // DOM要素
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const sizeSelect = document.getElementById('boardSizeSelect');
  
  const elProblemIdx = document.getElementById('problemIdx');
  const elProblemTotal = document.getElementById('problemTotal');
  const elLives = document.getElementById('lives');
  const elScore = document.getElementById('score');
  const elStatus = document.getElementById('status');
  
  // 新設・変更したDOM
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

  // ファイル上部か init の外に置く
  function resizeCanvasToDisplaySize(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      // 描画コンテキストのスケールをリセットしておく
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      return true;
    }
    return false;
  }
    
  function init() {
    // 初期表示
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

    loadGameMode(9);
  }

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
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    try {
      const res = await fetch(config.url + '?t=' + new Date().getTime());
      if (!res.ok) throw new Error("File not found");
      quizData = await res.json();
      quizData.sort(() => Math.random() - 0.5);

      elProblemTotal.textContent = quizData.length;
      nextProblem();

    } catch (e) {
      console.error(e);
      elStatus.textContent = "データ読込失敗 (" + config.url + ")";
      elStatus.className = "status-msg red";
    }
  }

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

  function updateStatus() {
    elScore.textContent = score;
    elLives.textContent = lives;
    elProblemIdx.textContent = quizData.length ? Math.min(currentIndex, quizData.length) : 0;
  }

  function updateUI() {
    // updateUI の冒頭で呼ぶ
    resizeCanvasToDisplaySize(canvas);
    const p = currentProblem;
    if (!p) return;

    const prisB = (p.prisoners && p.prisoners.black) ? p.prisoners.black : 0;
    const prisW = (p.prisoners && p.prisoners.white) ? p.prisoners.white : 0;

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

  function drawBoard(problem) {
    // CSS の表示サイズに合わせた論理ピクセル幅を取得
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
  
    // マージンは表示サイズに対する比率で決める（例: 5%）
    const margin = Math.round(displayWidth * 0.05);
    const boardW = displayWidth - margin * 2;
    const size = currentSize;
    const cellSize = boardW / (size - 1);
  
    // 背景を塗る（ctx は既に devicePixelRatio に合わせてスケール済み）
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#d3a052";
    // fillRect は CSS ピクセルで描くため clientWidth/clientHeight を使う
    ctx.fillRect(0, 0, displayWidth, displayHeight);
  
    ctx.beginPath();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = Math.max(1, 1); // 見た目調整
  
    for (let i = 0; i < size; i++) {
      const pos = margin + i * cellSize;
      ctx.moveTo(margin, pos);
      ctx.lineTo(margin + boardW, pos);
      ctx.moveTo(pos, margin);
      ctx.lineTo(pos, margin + boardW);
    }
    ctx.stroke();
  
    // 星印（星のインデックス配列をそのまま使う）
    const starIndices = MODES[size].starPoints;
    ctx.fillStyle = "#000";
    starIndices.forEach(row => {
      starIndices.forEach(col => {
        let drawStar = false;
        if (size === 19) drawStar = true;
        else if (size === 9) {
          if (row === 4 && col === 4) drawStar = true;
          if ((row === 2 || row === 6) && (col === 2 || col === 6)) drawStar = true;
        }
        if (drawStar) {
          ctx.beginPath();
          ctx.arc(margin + col * cellSize, margin + row * cellSize, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });
  
    const radius = cellSize * 0.45;
    function drawStone(x, y, color) {
      const cx = margin + x * cellSize;
      const cy = margin + y * cellSize;
      // 影
      ctx.beginPath();
      ctx.arc(cx + 1, cy + 1, radius, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fill();
      // 石本体
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

  function checkAnswer() {
    if (!currentProblem) return;

    // 正解データの解析
    const resStr = currentProblem.result;
    let actualDiff = 0;
    if (resStr.startsWith("B+")) actualDiff = parseFloat(resStr.substring(2));
    else if (resStr.startsWith("W+")) actualDiff = -parseFloat(resStr.substring(2));

    // ユーザー入力
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

    // 内訳計算用データ
    const p = currentProblem;
    const prisB = (p.prisoners && p.prisoners.black) ? p.prisoners.black : 0;
    const prisW = (p.prisoners && p.prisoners.white) ? p.prisoners.white : 0;
    const komi = p.komi;

    const actualWinner = actualDiff > 0 ? "黒" : "白";
    const marginAbs = Math.abs(actualDiff);

    // 結果＋内訳をまとめて表示
    elResultArea.style.display = "block";
    elResultArea.innerHTML = `
      <div class="result-box" style="background:${isCorrect ? '#e8f5e9' : '#fff0f0'}; border:2px solid ${isCorrect ? '#2e7d32' : '#ef5350'}; padding:15px; border-radius:8px;">
        <div style="font-size:1.2rem; margin-bottom:8px;">
          ${isCorrect ?
            `<span style="color:#2e7d32;">正解！ お見事！</span>` :
            `<span style="color:#c62828;">残念… 正解は <b>${actualWinner} ${marginAbs}目勝ち</b></span>`
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

    // ライフ処理
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

    // 回答ボタン無効化 → 次へボタン表示
    btnSubmit.disabled = true;
    btnNext.style.display = "inline-block";
  }

  function nextProblem() {
    if (!quizData || quizData.length === 0) return;

    // 全問終了チェック
    if (currentIndex >= quizData.length) {
      elStatus.textContent = "全問終了しました。スコア: " + score;
      elStatus.className = "status-msg";
      btnSubmit.disabled = true;
      btnNext.style.display = "none";
      return;
    }

    currentProblem = quizData[currentIndex];
    currentIndex++;

    // 入力欄クリア
    inpDiff.value = "";
    inpMargin.value = "";
    elStatus.textContent = "";
    elStatus.className = "status-msg";

    // 結果エリアを隠す
    elResultArea.style.display = "none";
    elResultArea.innerHTML = "";

    // 次へボタンを隠す
    btnNext.style.display = "none";

    // 回答ボタン復活
    btnSubmit.disabled = false;
    
    updateUI();
    updateStatus();
  }

  init();

})();
