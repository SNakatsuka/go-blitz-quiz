(function(){
  // ====== 設定 ======
  const JSON_PATH = './data/problems_19.json'; // Pythonで作った軽量版ファイルを指定
  const BOARD_SIZE = 19;
  const CANVAS_SIZE = 600;
  
  // ====== State ======
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const margin = 30;

  let problems = [];
  let currentProblemIdx = 0;
  let lives = 3;
  let score = 0;

  // ====== DOM Elements ======
  const problemIdxEl = document.getElementById('problemIdx');
  const problemTotalEl = document.getElementById('problemTotal');
  const livesEl = document.getElementById('lives');
  const scoreEl = document.getElementById('score');
  const statusEl = document.getElementById('status');
  const metaFooter = document.getElementById('metaFooter');

  // Controls
  const answerModeSel = document.getElementById('answerMode');
  const answerWinnerBox = document.getElementById('answerWinnerBox');
  const answerDiffBox = document.getElementById('answerDiffBox');
  const ansWinner = document.getElementById('ansWinner');
  const ansMargin = document.getElementById('ansMargin');
  const ansDiff = document.getElementById('ansDiff');
  const submitBtn = document.getElementById('submitBtn');
  const restartBtn = document.getElementById('restartBtn');

  // ====== 初期化 ======
  async function init(){
    try {
      const res = await fetch(JSON_PATH);
      if(!res.ok) throw new Error("File not found");
      problems = await res.json();
      
      problemTotalEl.textContent = problems.length;
      loadProblem(0);
    } catch(e) {
      statusEl.innerHTML = `<span class="red">エラー: 問題データを読み込めませんでした。<br>${e.message}</span>`;
    }
  }

  function loadProblem(idx){
    if(idx >= problems.length){
      statusEl.innerHTML = `<b>全問クリア！おめでとうございます！</b>`;
      return;
    }
    currentProblemIdx = idx;
    const p = problems[idx];

    // UIリセット
    problemIdxEl.textContent = (idx + 1);
    ansDiff.value = '0';
    ansWinner.value = 'black';
    ansMargin.value = '0.5';
    statusEl.innerHTML = "盤面を見て、地合（コミ込み）を計算してください。";

    // メタデータ表示
    const resStr = p.result || "不明";
    const pb = p.black_player || "黒";
    const pw = p.white_player || "白";
    const dt = p.date || "-";
    metaFooter.innerHTML = 
      `<span class="label">対局:</span> 黒:${pb} vs 白:${pw} <span class="sep">|</span> ` +
      `<span class="label">日付:</span> ${dt} <span class="sep">|</span> ` +
      `<span class="label">コミ:</span> ${p.komi}`;

    drawBoard(p);
  }

  // ====== 描画ロジック ======
  function drawBoard(p){
    // 背景
    ctx.fillStyle = '#d3a052';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const step = (CANVAS_SIZE - margin*2) / (BOARD_SIZE - 1);
    
    // 罫線
    ctx.strokeStyle = '#603e18';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<BOARD_SIZE; i++){
      const pos = margin + i*step;
      ctx.moveTo(pos, margin); ctx.lineTo(pos, CANVAS_SIZE - margin);
      ctx.moveTo(margin, pos); ctx.lineTo(CANVAS_SIZE - margin, pos);
    }
    ctx.stroke();

    // 星
    ctx.fillStyle = '#603e18';
    const hoshi = [3, 9, 15];
    hoshi.forEach(x => {
      hoshi.forEach(y => {
        const cx = margin + x*step;
        const cy = margin + y*step;
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.fill();
      });
    });

    // 石の描画 helper
    const drawStone = (r, c, color) => {
      const cx = margin + r*step;
      const cy = margin + c*step;
      const rad = step * 0.48;
      
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI*2);
      
      // グラデーションで立体感
      const grad = ctx.createRadialGradient(cx - rad*0.3, cy - rad*0.3, rad*0.2, cx, cy, rad);
      if(color === 'b'){
        grad.addColorStop(0, '#555');
        grad.addColorStop(1, '#000');
        ctx.strokeStyle = '#000';
      } else {
        grad.addColorStop(0, '#fff');
        grad.addColorStop(1, '#ccc');
        ctx.strokeStyle = '#888';
      }
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.stroke();
    };

    // 石データの読み込み (軽量JSON形式: stones.black = [[r,c],...])
    if(p.stones && p.stones.black){
      p.stones.black.forEach(([r, c]) => drawStone(r, c, 'b'));
      p.stones.white.forEach(([r, c]) => drawStone(r, c, 'w'));
    }
  }

  // ====== 正解判定 ======
  function checkAnswer(){
    const p = problems[currentProblemIdx];
    
    // 1. 正解データの解析 (例: "B+1.5", "W+10.5")
    let correctDiff = 0;
    let correctWinner = 'draw';
    const match = (p.result || "").match(/^([BW])\+(\d+(\.\d+)?)$/);
    
    if(match){
      const winColor = match[1];
      const val = parseFloat(match[2]);
      if(winColor === 'B') { correctDiff = val; correctWinner = 'black'; }
      if(winColor === 'W') { correctDiff = -val; correctWinner = 'white'; }
    } else {
      // 引き分け(Jigo) または 不明
      correctDiff = 0;
    }
    const correctMargin = Math.abs(correctDiff);

    // 2. ユーザー入力の取得
    let isCorrect = false;
    const mode = answerModeSel.value;

    if(mode === 'diff'){
      // 差分モード
      const userVal = parseFloat(ansDiff.value || 0);
      // 小数点第1位まで一致すればOK
      isCorrect = (userVal.toFixed(1) === correctDiff.toFixed(1));
    } else {
      // 勝敗+目数モード
      const userWin = ansWinner.value;
      const userMar = parseFloat(ansMargin.value || 0);
      isCorrect = (userWin === correctWinner && userMar.toFixed(1) === correctMargin.toFixed(1));
    }

    // 3. 結果処理
    if(isCorrect){
      score++;
      scoreEl.textContent = score;
      statusEl.innerHTML = `<span class="green">正解！</span> (${p.result}) 次へ進みます。`;
      setTimeout(() => loadProblem(currentProblemIdx + 1), 1000);
    } else {
      lives--;
      livesEl.textContent = lives;
      statusEl.innerHTML = `<span class="red">不正解...</span> 正解は <b>${p.result}</b> でした。`;
      if(lives <= 0){
        statusEl.innerHTML += " <br><b>ゲームオーバー</b> リスタートボタンを押してください。";
        submitBtn.disabled = true;
      }
    }
  }

  // ====== イベント設定 ======
  submitBtn.addEventListener('click', () => {
    if(lives > 0) checkAnswer();
  });

  restartBtn.addEventListener('click', () => {
    lives = 3; score = 0;
    livesEl.textContent = lives; scoreEl.textContent = score;
    submitBtn.disabled = false;
    // シャッフルしたい場合はここで problems をシャッフルしてもよい
    loadProblem(0);
  });

  answerModeSel.addEventListener('change', () => {
    if(answerModeSel.value === 'diff'){
      answerDiffBox.style.display = 'inline';
      answerWinnerBox.style.display = 'none';
    } else {
      answerDiffBox.style.display = 'none';
      answerWinnerBox.style.display = 'inline';
    }
  });

  // 開始
  init();

})();
