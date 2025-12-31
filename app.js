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
  
  // ★新設・変更したDOM
  const elGameInfo = document.getElementById('gameInfo'); 
  const elResultArea = document.getElementById('resultArea');
  const btnShowAnswer = document.getElementById('btnShowAnswer');
  const elFinalResult = document.getElementById('finalResult');

  const btnSubmit = document.getElementById('submitBtn');
  const btnRestart = document.getElementById('restartBtn');
  
  const selMode = document.getElementById('answerMode');
  const boxWinner = document.getElementById('answerWinnerBox');
  const boxDiff = document.getElementById('answerDiffBox');
  
  const inpWinner = document.getElementById('ansWinner');
  const inpMargin = document.getElementById('ansMargin');
  const inpDiff = document.getElementById('ansDiff');

  function init() {
    btnSubmit.addEventListener('click', checkAnswer);
    btnRestart.addEventListener('click', restartGame);
    btnShowAnswer.addEventListener('click', showAnswerDetail); // 内訳ボタン

    selMode.addEventListener('change', () => {
      if(selMode.value === 'winner') {
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
    updateStatus();
    elStatus.textContent = "";
    btnSubmit.disabled = false;
    nextProblem();
  }

  function updateStatus() {
    elScore.textContent = score;
    elLives.textContent = lives;
    elProblemIdx.textContent = currentIndex + 1;
  }

  function nextProblem() {
    if (quizData.length === 0) return;
    if (currentIndex >= quizData.length) currentIndex = 0;

    currentProblem = quizData[currentIndex];
    currentIndex++; 
    
    // 入力欄クリア
    inpDiff.value = "";
    inpMargin.value = "";
    elStatus.textContent = "";
    elStatus.className = "status-msg";
    
    // 結果エリアを隠してリセット
    elResultArea.style.display = "none";
    elFinalResult.innerHTML = "";
    btnSubmit.disabled = false;

    updateUI();
  }

  function updateUI() {
    const p = currentProblem;
    if (!p) return;

    const prisB = (p.prisoners && p.prisoners.black) ? p.prisoners.black : 0;
    const prisW = (p.prisoners && p.prisoners.white) ? p.prisoners.white : 0;

    // ★上部の情報パネル（ヒント）
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

  // ★「内訳を見る」ボタンを押した時の処理
  function showAnswerDetail() {
      const p = currentProblem;
      if(!p) return;
      
      const prisB = (p.prisoners && p.prisoners.black) ? p.prisoners.black : 0;
      const prisW = (p.prisoners && p.prisoners.white) ? p.prisoners.white : 0;
      const komi = p.komi;
      const result = p.result;

      elFinalResult.innerHTML = `
        <div style="background:#fff0f0; border:2px solid #ef5350; padding:15px; border-radius:8px; margin-top:10px;">
            <div style="font-size:1.5rem; color:#d32f2f; margin-bottom:5px;">結果: ${result}</div>
            <div style="font-size:0.9rem; color:#555; text-align:left; display:inline-block;">
                <b>内訳の目安:</b><br>
                黒 = (盤面の地) + (アゲハマ ${prisB})<br>
                白 = (盤面の地) + (アゲハマ ${prisW}) + (コミ ${komi})<br>
                <span style="font-size:0.8rem; color:#777;">※1目ズレる場合は「ダメ（隙間）」を数えていないか確認！</span>
            </div>
        </div>
      `;
  }

  function drawBoard(problem) {
    ctx.fillStyle = "#d3a052";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const size = currentSize;
    const margin = 30;
    const boardW = CANVAS_SIZE - margin * 2;
    const cellSize = boardW / (size - 1);

    ctx.beginPath();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;

    for (let i = 0; i < size; i++) {
      const pos = margin + i * cellSize;
      ctx.moveTo(margin, pos);
      ctx.lineTo(CANVAS_SIZE - margin, pos);
      ctx.moveTo(pos, margin);
      ctx.lineTo(pos, CANVAS_SIZE - margin);
    }
    ctx.stroke();

    const starIndices = MODES[size].starPoints;
    ctx.fillStyle = "#000";
    starIndices.forEach(row => {
      starIndices.forEach(col => {
        let drawStar = false;
        if(size === 19) drawStar = true;
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
        ctx.beginPath();
        ctx.arc(cx+1, cy+1, radius, 0, 2*Math.PI);
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2*Math.PI);
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

    // "B+6.5" -> 6.5
    const resStr = currentProblem.result; 
    let actualDiff = 0;
    if (resStr.startsWith("B+")) actualDiff = parseFloat(resStr.substring(2));
    else if (resStr.startsWith("W+")) actualDiff = -parseFloat(resStr.substring(2));

    let userDiff = 0;
    const mode = selMode.value;

    if (mode === 'winner') {
        const winner = inpWinner.value;
        const margin = parseFloat(inpMargin.value);
        if (isNaN(margin)) { alert("目数を入力してください"); return; }
        userDiff = (winner === 'black') ? margin : -margin;
    } else {
        const d = parseFloat(inpDiff.value);
        if (isNaN(d)) { alert("目数差を入力してください"); return; }
        userDiff = d;
    }

    // 判定
    const isCorrect = Math.abs(userDiff - actualDiff) < 0.1;

    // ★回答ボタンを押したら、結果ボタンエリアを表示する
    elResultArea.style.display = "block"; 
    // まだ内訳は表示しない（ボタンを押させる）

    if (isCorrect) {
        elStatus.textContent = "正解！！ お見事！";
        elStatus.className = "status-msg green";
        score += 10;
        // 正解時は自動で次に進む（3秒後）
        setTimeout(() => { nextProblem(); }, 3000);
    } else {
        // 不正解時は、結果（勝敗のみ）を出すが、内訳はボタンで見させる
        const actualWinner = actualDiff > 0 ? "黒" : "白";
        elStatus.innerHTML = `残念... 正解は <b>${actualWinner} ${Math.abs(actualDiff)}目勝ち</b> です。`;
        elStatus.className = "status-msg red";
        lives--;
        updateStatus();
        
        // ライフ0なら終了
        if (lives <= 0) {
            btnSubmit.disabled = true;
            elStatus.innerHTML += "<br>ゲームオーバー！リスタートボタンを押してください。";
        }
    }
    // 回答ボタンを一度無効化（連打防止）
    btnSubmit.disabled = true;
  }

  init();

})();
