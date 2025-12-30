
(function(){
  // ====== Elements & State ======
  const boardCanvas = document.getElementById('board');
  const overlayCanvas = document.getElementById('overlay');
  const bctx = boardCanvas.getContext('2d');
  const octx = overlayCanvas.getContext('2d');
  const margin = 30;

  let N = 9;         // board size
  let board = [];    // 0 empty, 1 black, 2 white
  let lives = 3;
  let score = 0;
  let currentProblemIdx = 0;
  let currentLevel = 9; // 9, 13, 19
  const AUTO_ADVANCE = true; // 全問クリアで自動的に次レベルへ

  const levelSelect = document.getElementById('levelSelect');
  const answerModeSel = document.getElementById('answerMode');
  const problemIdxEl = document.getElementById('problemIdx');
  const problemTotalEl = document.getElementById('problemTotal');
  const livesEl = document.getElementById('lives');
  const scoreEl = document.getElementById('score');

  const boardSizeText = document.getElementById('boardSizeText');
  const komiText = document.getElementById('komiText');
  const capBText = document.getElementById('capBText');
  const capWText = document.getElementById('capWText');
  const noteText = document.getElementById('noteText');
  const metaFooter = document.getElementById('metaFooter');

  // 回答UI
  const answerDiffBox = document.getElementById('answerDiffBox');
  const answerWinnerBox = document.getElementById('answerWinnerBox');
  const ansDiff = document.getElementById('ansDiff');
  const ansWinner = document.getElementById('ansWinner');
  const ansMargin = document.getElementById('ansMargin');

  const hintBtn = document.getElementById('hintBtn');
  const submitBtn = document.getElementById('submitBtn');
  const restartBtn = document.getElementById('restartBtn');
  const statusEl = document.getElementById('status');

  // ▼ 追加：問題キャッシュ（fetch結果を格納）
  const PROBLEMS_BY_LEVEL = {};

  // ====== Utility: board ops ======
  function emptyBoard(n){ return Array.from({length:n}, () => Array(n).fill(0)); }
  function place(bd, color, coords){ for(const [i,j] of coords){ bd[i][j] = color; } }
  function line(bd, color, x1,y1,x2,y2){
    // Bresenham-like simple step for straight lines (only horizontal/vertical/diag at 45°)
    const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1);
    let x = x1, y = y1;
    bd[x][y] = color;
    while(x !== x2 || y !== y2){
      if(x !== x2) x += dx;
      if(y !== y2) y += dy;
      bd[x][y] = color;
    }
    return bd;
  }
  function ringRect(bd, color, x1,y1,x2,y2){
    // thin rectangular ring (周囲だけ石を並べる)
    for(let i=x1;i<=x2;i++){ bd[i][y1] = color; bd[i][y2] = color; }
    for(let j=y1;j<=y2;j++){ bd[x1][j] = color; bd[x2][j] = color; }
    return bd;
  }
  function wallPolyline(bd, color, pts){
    for(let k=0;k<pts.length-1;k++){
      const [x1,y1] = pts[k], [x2,y2] = pts[k+1];
      line(bd, color, x1,y1,x2,y2);
    }
    return bd;
  }

  // ====== Problems (external JSON) ======
  async function loadProblemsFor(level){
    const url = level === 9 ? 'data/problems_9.json'
               : level === 13 ? 'data/problems_13.json'
               : 'data/problems_19.json';
    const res = await fetch(url);
    if(!res.ok){
      throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
    }
    const arr = await res.json();
    return arr;
  }

  async function loadLevel(level){
    currentLevel = level;
    const problems = await loadProblemsFor(level);
    PROBLEMS_BY_LEVEL[level] = problems;        // 取得したJSONをそのまま使用
    problemTotalEl.textContent = problems.length;
    currentProblemIdx = 0;
    applyProblem(problems[0]);                  // 最初の問題へ
    statusEl.innerHTML = `レベル ${level}路盤を開始しました。回答形式を選んで「答え合わせ」。`;
  }

  // ▼ 追加：次の問題に進むときに使う
  function loadProblem(idx){
    currentProblemIdx = idx;
    const p = PROBLEMS_BY_LEVEL[currentLevel][idx];
    applyProblem(p);
    problemIdxEl.textContent = (idx + 1);
    ansDiff.value = '0';
    ansWinner.value = 'black';
    ansMargin.value = '0.5';
  }

  function applyProblem(p){
    N = p.size;
    board = Array.from({length:N}, () => Array(N).fill(0));
    if (Array.isArray(p.stones)) {
          // 旧形式: [{i,j,c}, ...]
          for(const s of p.stones){ board[s.i][s.j] = (s.c === 'B' ? 1 : 2); }
      } else if (p.stones && p.stones.black) {
          // 新形式: { black: [[r,c],...], white: [[r,c],...] }
          for(const [r, c] of p.stones.black) board[r][c] = 1;
          for(const [r, c] of p.stones.white) board[r][c] = 2;
      }    
    
    // 情報表示
    boardSizeText.textContent = `${N}×${N}`;
    komiText.textContent = `${p.komi}`;
    // 新しいデータにはアゲハマ(capB)がないので、なければ0と表示
    capBText.textContent = `${p.prisoners_b || p.capB || 0}`;
    capWText.textContent = `${p.prisoners_w || p.capW || 0}`;
    noteText.textContent = p.note || '';

    // ▼ メタデータ（最下部）表示
    const src = p.source || {};
    const origin = src.origin || 'KGS';
    const url = src.url || 'https://gokgs.com/archives.jsp';
    const players = src.players || {};
    const pb = p.black_player || (src.players ? src.players.B : '黒');
    const pw = p.white_player || (src.players ? src.players.W : '白');
    const date = src.date || '日付不明';
    const result = src.result || '結果不明';
    const rules = src.rules || '（KGSルール）';
    metaFooter.innerHTML =
      `<span class="label">出典:</span> <a href="${url}" target="_blank" rel="noopener noreferrer">${origin}</a>` +
      `<span class="sep">|</span><span class="label">対局者:</span> 黒 ${pb} vs 白 ${pw}` +
      `<span class="sep">|</span><span class="label">結果:</span> ${result}` +
      `<span class="sep">|</span><span class="label">日付:</span> ${date}` +
      `<span class="sep">|</span><span class="label">ルール:</span> ${rules}`;

    problemIdxEl.textContent = (currentProblemIdx + 1);

    drawBoard();
    octx.clearRect(0,0,overlayCanvas.width, overlayCanvas.height);
  }

  // ====== Drawing ======
  function drawBoard(){
    const w = boardCanvas.width, h = boardCanvas.height;
    bctx.clearRect(0,0,w,h);
    bctx.fillStyle = '#d3a052';
    bctx.fillRect(0,0,w,h);

    const step = (w - margin*2) / (N - 1);
    bctx.strokeStyle = '#603e18';
    bctx.lineWidth = 2;

    for(let i=0;i<N;i++){
      const x = margin + i*step, y = margin + i*step;
      bctx.beginPath(); bctx.moveTo(x, margin); bctx.lineTo(x, h - margin); bctx.stroke();
      bctx.beginPath(); bctx.moveTo(margin, y); bctx.lineTo(w - margin, y); bctx.stroke();
    }

    const hoshi = getHoshiPoints(N);
    bctx.fillStyle = '#603e18';
    for(const [i,j] of hoshi){
      const {cx, cy} = ijToCoord(i,j, step);
      bctx.beginPath(); bctx.arc(cx, cy, 4, 0, Math.PI*2); bctx.fill();
    }

    for(let i=0;i<N;i++){
      for(let j=0;j<N;j++){
        const s = board[i][j];
        if(s===0) continue;
        const {cx, cy} = ijToCoord(i,j, step);
        const r = step*0.45;
        bctx.beginPath(); bctx.arc(cx, cy, r, 0, Math.PI*2);
        const grad = bctx.createRadialGradient(cx - r*0.4, cy - r*0.4, r*0.2, cx, cy, r);
        if(s===1){ grad.addColorStop(0,'#404040'); grad.addColorStop(1,'#111111'); bctx.fillStyle=grad; bctx.fill(); bctx.strokeStyle='#000'; }
        else     { grad.addColorStop(0,'#ffffff'); grad.addColorStop(1,'#dcdcdc'); bctx.fillStyle=grad; bctx.fill(); bctx.strokeStyle='#888'; }
        bctx.lineWidth = 1.5; bctx.stroke();
      }
    }
    octx.clearRect(0,0,overlayCanvas.width, overlayCanvas.height);
  }
  function ijToCoord(i,j, step){ return { cx: margin + i*step, cy: margin + j*step }; }
  function getHoshiPoints(n){
    if(n===9)  { const idx=[2,4,6]; return idx.flatMap(i => idx.map(j => [i,j])); }
    if(n===13) { const idx=[3,6,9]; return idx.flatMap(i => idx.map(j => [i,j])); }
    if(n===19) { const idx=[3,9,15]; return idx.flatMap(i => idx.map(j => [i,j])); }
    return [];
  }

  // ====== Territory calc (flash) ======
  function flashTerritory(bd){
    const n = bd.length;
    const visited = Array.from({length:n}, () => Array(n).fill(false));
    let blackTerr=0, whiteTerr=0, neutral=0;
    const mapTerr = Array.from({length:n}, () => Array(n).fill(0));
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    const q = [];

    for(let i=0;i<n;i++){
      for(let j=0;j<n;j++){
        if(bd[i][j]!==0 || visited[i][j]) continue;
        q.length = 0;
        const region = [];
        const adj = new Set();

        visited[i][j]=true; q.push([i,j]);
        while(q.length){
          const [x,y] = q.shift();
          region.push([x,y]);
          for(const [dx,dy] of dirs){
            const nx=x+dx, ny=y+dy;
            if(nx<0||nx>=n||ny<0||ny>=n) continue;
            const s = bd[nx][ny];
            if(s===0){
              if(!visited[nx][ny]){ visited[nx][ny]=true; q.push([nx,ny]); }
            } else { adj.add(s); }
          }
        }

        if(adj.size===1){
          const color = adj.has(1) ? 1 : 2;
          if(color===1){ blackTerr+=region.length; for(const [x,y] of region) mapTerr[x][y]=1; }
          else         { whiteTerr+=region.length; for(const [x,y] of region) mapTerr[x][y]=2; }
        } else {
          neutral+=region.length;
        }
      }
    }
    return {blackTerr, whiteTerr, neutral, mapTerr};
  }

  function drawTerritoryOverlay(mapTerr){
    octx.clearRect(0,0,overlayCanvas.width, overlayCanvas.height);
    const w = overlayCanvas.width;
    const step = (w - margin*2) / (N - 1);
    for(let i=0;i<N;i++){
      for(let j=0;j<N;j++){
        const t = mapTerr[i][j];
        if(t===0) continue;
        const {cx, cy} = ijToCoord(i,j, step);
        const r = step*0.28;
        octx.beginPath(); octx.arc(cx, cy, r, 0, Math.PI*2);
        octx.fillStyle = (t===1) ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.35)';
        octx.fill();
      }
    }
  }

  function round1(x){ return Math.round(x*10)/10; } // 0.1刻み丸め

  function checkAnswer(){
    const p = PROBLEMS_BY_LEVEL[currentLevel][currentProblemIdx];
    
    // ▼ 修正: JSONにある result 文字列 ("B+5.5" や "W+10.0") を正解とする
    let correctDiff = 0;
    let correctWinner = 'draw';
    
    // 結果文字列を解析 (例: "B+5.5")
    const resStr = p.result || ""; 
    const match = resStr.match(/^([BW])\+(\d+(\.\d+)?)$/);
    
    if (match) {
        const winnerCode = match[1]; // 'B' or 'W'
        const val = parseFloat(match[2]);
        
        if (winnerCode === 'B') {
            correctWinner = 'black';
            correctDiff = val; // 黒勝ちならプラス
        } else {
            correctWinner = 'white';
            correctDiff = -val; // 白勝ちならマイナス
        }
    } else {
        // 万が一データがない場合は、旧ロジック(ブラウザ計算)にフォールバック
        const r = flashTerritory(board);
        const blackScore = r.blackTerr + (p.capB || 0);
        const whiteScore = r.whiteTerr + (p.capW || 0) + p.komi;
        correctDiff = round1(blackScore - whiteScore);
        correctWinner = correctDiff > 0 ? 'black' : correctDiff < 0 ? 'white' : 'draw';
    }
  
    const correctMargin = round1(Math.abs(correctDiff));
  
    // --- ここから下は判定ロジック ---
    const mode = answerModeSel.value;
    let isCorrect = false;
  
    if(mode === 'diff'){
      // 「目数差」モード: ユーザー入力値と比較
      // 黒勝ちならプラス、白勝ちならマイナスとして比較するか、単純に差分だけ見るか
      // ここでは「絶対値（差の大きさ）」だけ合っていればOKにするか、勝敗も含めるか
      // UI的に「差: 5.5目」と入力させているなら、勝ち負けも合っている必要がある
      const userDiffStr = ansDiff.value || '0';
      const userDiff = parseFloat(userDiffStr); // ここはユーザーがプラスマイナスを意識している前提
      
      // シンプルにこうします：UIが勝敗選択式でない場合、
      // 「黒が5.5目勝ち」→ +5.5, 「白が...」→ -5.5 を入力するのは難しいので、
      // 既存UIの `answerWinnerBox` を使うモードを推奨しますが、
      // もし `ansDiff` だけでやるなら「値の一致」を見ます
      isCorrect = (round1(userDiff) === correctDiff);
      
    } else {
      // 「勝敗＋目数」モード
      const userWinner = ansWinner.value; // 'black'|'white'
      const userMargin = parseFloat(ansMargin.value || '0');
      
      // 勝者が合っている かつ 目数が合っている
      isCorrect = (userWinner === correctWinner) && (round1(userMargin) === correctMargin);
    }
  
    if(isCorrect){
      score += 1; scoreEl.textContent = score;
      statusEl.innerHTML = `<span class="green">正解！</span> (${p.result}) 次の問題へ進みます。`;
      const nextIdx = currentProblemIdx + 1;
      
      // ... (以下、次の問題へ進む処理は同じ) ...
      if(nextIdx < PROBLEMS_BY_LEVEL[currentLevel].length){
        setTimeout(()=>{ loadProblem(nextIdx); }, 800);
      } else {
         // ...
      }
    } else {
      lives -= 1; livesEl.textContent = lives;
      statusEl.innerHTML = `<span class="red">不正解。</span> 正解は <b>${p.result}</b> でした。`;
      if(lives <= 0){
        statusEl.innerHTML += `<br/><b>ゲームオーバー</b>`;
      }
    }
  }

  // ====== Events ======
  hintBtn.addEventListener('click', ()=>{
    const r = flashTerritory(board);
    drawTerritoryOverlay(r.mapTerr);
    statusEl.innerHTML = `地オーバーレイを表示中（数値のヒントは出しません）。`;
  });

  submitBtn.addEventListener('click', ()=>{
    if(lives <= 0){
      statusEl.innerHTML = `<span class="red">挑戦回数がありません。</span> リスタートしてください。`;
      return;
    }
    checkAnswer();
  });

  restartBtn.addEventListener('click', ()=>{
    lives = 3; score = 0;
    livesEl.textContent = lives; scoreEl.textContent = score;
    loadLevel(currentLevel);
    statusEl.innerHTML = `レベル ${currentLevel} を最初の問題から再開しました。がんばって！`;
  });

  answerModeSel.addEventListener('change', ()=>{
    const mode = answerModeSel.value;
    if(mode === 'diff'){
      answerDiffBox.style.display = '';
      answerWinnerBox.style.display = 'none';
    } else {
      answerDiffBox.style.display = 'none';
      answerWinnerBox.style.display = '';
    }
  });

  levelSelect.addEventListener('change', ()=>{
    lives = 3; score = 0;
    livesEl.textContent = lives; scoreEl.textContent = score;
    const level = parseInt(levelSelect.value, 10);
    loadLevel(level);
  });

  // ====== Init ======
  loadLevel(9); // 初期レベルは9路盤
})();
