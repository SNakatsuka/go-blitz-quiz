(function(){
  // --- 設定 ---
  const CANVAS_SIZE = 600; 
  // モードごとの設定
  const MODES = {
    9:  { url: './data/problems_9.json',  size: 9,  starPoints: [2, 6, 4] }, // 9路の星は3-3と天元
    19: { url: './data/problems_19.json', size: 19, starPoints: [3, 9, 15] } // 19路の星は4-4と天元
  };

  // --- グローバル変数 ---
  let currentSize = 19; // 初期値
  let quizData = [];
  let currentIndex = 0;
  let score = 0;
  let lives = 3;
  let currentProblem = null;

  // --- DOM要素 ---
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const sizeSelect = document.getElementById('boardSizeSelect'); // 追加
  
  const elProblemIdx = document.getElementById('problemIdx');
  const elProblemTotal = document.getElementById('problemTotal');
  const elLives = document.getElementById('lives');
  const elScore = document.getElementById('score');
  const elStatus = document.getElementById('status');
  const elFooter = document.getElementById('metaFooter');
  
  const btnSubmit = document.getElementById('submitBtn');
  const btnRestart = document.getElementById('restartBtn');
  
  const selMode = document.getElementById('answerMode');
  const boxWinner = document.getElementById('answerWinnerBox');
  const boxDiff = document.getElementById('answerDiffBox');
  
  const inpWinner = document.getElementById('ansWinner');
  const inpMargin = document.getElementById('ansMargin');
  const inpDiff = document.getElementById('ansDiff');

  // --- 初期化 ---
  function init() {
    // イベントリスナー設定
    btnSubmit.addEventListener('click', checkAnswer);
    btnRestart.addEventListener('click', restartGame);
    
    selMode.addEventListener('change', () => {
      if(selMode.value === 'winner') {
        boxWinner.style.display = 'inline-block';
        boxDiff.style.display = 'none';
      } else {
        boxWinner.style.display = 'none';
        boxDiff.style.display = 'inline-block';
      }
    });

    // ▼ サイズ変更時の処理
    sizeSelect.addEventListener('change', (e) => {
      const newSize = parseInt(e.target.value, 10);
      loadGameMode(newSize);
    });

    // 初回ロード (HTMLの初期値19に合わせて起動)
    loadGameMode(19);
  }

  // --- ゲームモード読み込み ---
  async function loadGameMode(size) {
    currentSize = size;
    const config = MODES[size];
    
    // リセット
    quizData = [];
    currentProblem = null;
    score = 0;
    lives = 3;
    currentIndex = 0;
    updateStatus();
    elStatus.textContent = "データを読み込んでいます...";
    elStatus.className = "status-msg";
    
    // 盤面クリア
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    try {
      const res = await fetch(config.url + '?t=' + new Date().getTime()); // キャッシュ回避
      if (!res.ok) throw new Error("File not found");
      quizData = await res.json();
      
      // シャッフル
      quizData.sort(() => Math.random() - 0.5);
      
      elProblemTotal.textContent = quizData.length;
      nextProblem();

    } catch (e) {
      console.error(e);
      elStatus.textContent = "データの読み込みに失敗しました (" + config.url + ")";
      elStatus.className = "status-msg red";
    }
  }

  function restartGame() {
    score = 0;
    lives = 3;
    currentIndex = 0;
    quizData.sort(() => Math.random() - 0.5);
    updateStatus();
    elStatus.textContent = "";
    elStatus.className = "status-msg";
    nextProblem();
  }

  function updateStatus() {
    elScore.textContent = score;
    elLives.textContent = lives;
    elProblemIdx.textContent = currentIndex + 1;
  }

  function nextProblem() {
    if (currentIndex >= quizData.length) {
      finishGame(true);
      return;
    }
    if (lives <= 0) {
      finishGame(false);
      return;
    }

    currentProblem = quizData[currentIndex];
    updateStatus();
    
    // 入力欄リセット
    inpMargin.value = 0.5;
    inpDiff.value = "";
    elStatus.textContent = "黒地 − 白地 は何目？";
    elStatus.className = "status-msg";
    
    // フッター更新
    const p = currentProblem;
    elFooter.innerHTML = `
      <div><span class="label">Date:</span> ${p.date} <span class="sep">|</span> 
           <span class="label">Players:</span> <b>${p.black_player}</b> (B) vs <b>${p.white_player}</b> (W)</div>
      <div style="font-size:0.85em; color:#888;">Size: ${p.size}路 / Komi: ${p.komi}</div>
    `;

    drawBoard(p);
  }

  // --- 描画ロジック (サイズ可変対応) ---
  function drawBoard(problem) {
    // 盤面背景
    ctx.fillStyle = "#d3a052";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const size = currentSize; // 9 or 19
    const margin = 30; // 端の余白
    const boardW = CANVAS_SIZE - margin * 2;
    const cellSize = boardW / (size - 1);

    // 罫線を引く
    ctx.beginPath();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;

    for (let i = 0; i < size; i++) {
      const pos = margin + i * cellSize;
      // 横線
      ctx.moveTo(margin, pos);
      ctx.lineTo(CANVAS_SIZE - margin, pos);
      // 縦線
      ctx.moveTo(pos, margin);
      ctx.lineTo(pos, CANVAS_SIZE - margin);
    }
    ctx.stroke();

    // 星（Hoshi）を描く
    const starIndices = MODES[size].starPoints; // [3, 9, 15] or [2, 6, 4]
    ctx.fillStyle = "#000";
    starIndices.forEach(row => {
      starIndices.forEach(col => {
        // 9路盤の中心(4,4)描画のため、配列に含まれる座標の組み合わせすべてに描画
        // ただし9路の[2,4,6]の全組み合わせだと多すぎるので、
        // 簡易的に「端から数えて星の位置」だけ描くロジックにする
        
        // シンプルに: 指定されたインデックスの交点に描く
        // 19路: 3,9,15 の組み合わせ (9箇所)
        // 9路:  2,6 の組み合わせ (4隅) + 天元(4,4)
        
        let drawStar = false;
        if(size === 19) {
          drawStar = true; // 3,9,15のクロスすべて描く
        } else if (size === 9) {
            // 天元
            if (row === 4 && col === 4) drawStar = true;
            // 四隅 (2,2), (2,6), (6,2), (6,6)
            if ((row === 2 || row === 6) && (col === 2 || col === 6)) drawStar = true;
        }

        if (drawStar) {
          const x = margin + col * cellSize;
          const y = margin + row * cellSize;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });

    // 石を描く
    const radius = cellSize * 0.45;
    
    function drawStone(x, y, color) {
        const cx = margin + x * cellSize;
        const cy = margin + y * cellSize;
        
        ctx.beginPath();
        // 影
        ctx.arc(cx+1, cy+1, radius, 0, 2*Math.PI);
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fill();

        // 本体
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2*Math.PI);
        ctx.fillStyle = color === 'black' ? "#111" : "#fff";
        ctx.fill();
        
        // 白石の光沢
        if (color === 'white') {
            ctx.strokeStyle = "#ccc";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    problem.stones.black.forEach(pos => drawStone(pos[0], pos[1], 'black'));
    problem.stones.white.forEach(pos => drawStone(pos[0], pos[1], 'white'));
  }

  // --- 答え合わせロジック (変更なし) ---
  function checkAnswer() {
    if (!currentProblem) return;

    // 正解データのパース
    const resStr = currentProblem.result; // "B+6.5", "W+12.0", "B+R" etc
    let actualDiff = 0;

    if (resStr.startsWith("B+")) {
        actualDiff = parseFloat(resStr.substring(2));
    } else if (resStr.startsWith("W+")) {
        actualDiff = -parseFloat(resStr.substring(2));
    } else {
        // "Draw", "Void", "?" など
        actualDiff = 0; 
    }

    // ユーザー入力の取得
    let userDiff = 0;
    const mode = selMode.value;

    if (mode === 'winner') {
        const winner = inpWinner.value;
        const margin = parseFloat(inpMargin.value);
        if (isNaN(margin)) {
            alert("目数を入力してください");
            return;
        }
        userDiff = (winner === 'black') ? margin : -margin;
    } else {
        const d = parseFloat(inpDiff.value);
        if (isNaN(d)) {
            alert("目数差を入力してください");
            return;
        }
        userDiff = d;
    }

    // 判定 (誤差0.5まで許容するか、完全一致か。今回は完全一致で判定)
    // 浮動小数点の誤差を考慮して差の絶対値が小さいかで判定
    const isCorrect = Math.abs(userDiff - actualDiff) < 0.1;

    if (isCorrect) {
        elStatus.textContent = "正解！！ お見事！";
        elStatus.className = "status-msg green";
        score += 10;
        // 3秒後に次へ
        setTimeout(() => {
            currentIndex++;
            nextProblem();
        }, 2000);
    } else {
        elStatus.innerHTML = `残念...<br>正解は <b>${actualDiff > 0 ? "黒" : "白"} ${Math.abs(actualDiff)}目勝ち</b> (差: ${actualDiff})`;
        elStatus.className = "status-msg red";
        lives--;
        updateStatus();
        
        if (lives > 0) {
            // 間違えても次へ行くならここ
            setTimeout(() => {
                currentIndex++;
                nextProblem();
            }, 3000);
        } else {
             btnSubmit.disabled = true;
        }
    }
  }

  function finishGame(cleared) {
    if (cleared) {
        elStatus.textContent = "全問クリア！おめでとうございます！";
        elStatus.className = "status-msg green";
    } else {
        elStatus.textContent = "ゲームオーバー...";
        elStatus.className = "status-msg red";
    }
    btnSubmit.disabled = true;
  }

  // 起動
  init();

})();
