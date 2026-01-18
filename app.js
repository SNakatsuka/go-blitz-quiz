
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
  const problemIdxEl = document.getElementById('problemIdx');
  const problemTotalEl = document.getElementById('problemTotal');
  const livesEl = document.getElementById('lives');
  const scoreEl = document.getElementById('score');

  const boardSizeText = document.getElementById('boardSizeText');
  const komiText = document.getElementById('komiText');
  const capBText = document.getElementById('capBText');
  const capWText = document.getElementById('capWText');

  const ansBlackTerr = document.getElementById('ansBlackTerr');
  const ansWhiteTerr = document.getElementById('ansWhiteTerr');

  const hintBtn = document.getElementById('hintBtn');
  const submitBtn = document.getElementById('submitBtn');
  const restartBtn = document.getElementById('restartBtn');
  const statusEl = document.getElementById('status');

  // ====== Problems per level ======
  function emptyBoard(n){ return Array.from({length:n}, ()=>Array(n).fill(0)); }
  function rectEnclosure(bd, color, x1,y1,x2,y2){
    const n = bd.length;
    const minx = Math.max(0, Math.min(x1,x2)), maxx = Math.min(n-1, Math.max(x1,x2));
    const miny = Math.max(0, Math.min(y1,y2)), maxy = Math.min(n-1, Math.max(y1,y2));
    for(let i=minx;i<=maxx;i++){ bd[i][miny] = color; bd[i][maxy] = color; }
    for(let j=miny;j<=maxy;j++){ bd[minx][j] = color; bd[maxx][j] = color; }
    return bd;
  }
  function buildProblemsFor(n){
    const arr = [];
    if(n === 9){
      // 9路：サンプル5問
      { const bd=emptyBoard(n);
        rectEnclosure(bd,1,1,1,3,3); rectEnclosure(bd,2,5,5,7,7);
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'9路: 基本の囲い 1' });
      }
      { const bd=emptyBoard(n);
        rectEnclosure(bd,1,1,1,5,3); rectEnclosure(bd,2,6,1,8,2);
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'9路: 基本の囲い 2' });
      }
      { const bd=emptyBoard(n);
        rectEnclosure(bd,2,1,5,3,7); rectEnclosure(bd,1,5,1,8,4);
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'9路: 左右に大囲い' });
      }
      { const bd=emptyBoard(n);
        rectEnclosure(bd,1,2,2,6,6); bd[0][0]=2; bd[8][8]=2; bd[0][8]=2; bd[8][0]=2;
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'9路: 中央大囲い' });
      }
      { const bd=emptyBoard(n);
        rectEnclosure(bd,1,1,1,4,4); bd[1][1]=2; bd[4][4]=2;
        rectEnclosure(bd,2,5,5,8,8); bd[5][5]=1; bd[8][8]=1;
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'9路: 境界演出付き' });
      }
    } else if(n === 13){
      // 13路：サンプル3問
      { const bd=emptyBoard(n);
        rectEnclosure(bd,1,2,2,6,6);   // 黒の大きめ囲い
        rectEnclosure(bd,2,8,8,10,10); // 白の小さめ囲い
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'13路: 黒大/白小' });
      }
      { const bd=emptyBoard(n);
        rectEnclosure(bd,2,1,8,4,11);  // 白の縦長囲い
        rectEnclosure(bd,1,7,1,11,5);  // 黒の横長囲い
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'13路: 縦横の大囲い' });
      }
      { const bd=emptyBoard(n);
        rectEnclosure(bd,1,3,3,9,9);   // 黒の広い囲い
        // 周辺に白石少々
        bd[0][0]=2; bd[12][12]=2; bd[0][12]=2; bd[12][0]=2;
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'13路: 中央広域' });
      }
    } else if(n === 19){
      // 19路：サンプル3問
      { const bd=emptyBoard(n);
        rectEnclosure(bd,1,3,3,9,9);     // 黒 中央9x9枠（内側広い）
        rectEnclosure(bd,2,12,12,15,15); // 白 小さめ
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'19路: 中央九路型 + 白小' });
      }
      { const bd=emptyBoard(n);
        rectEnclosure(bd,2,1,10,6,16);   // 白 縦長大囲い
        rectEnclosure(bd,1,10,1,16,6);   // 黒 横長大囲い
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'19路: 十字の大囲い' });
      }
      { const bd=emptyBoard(n);
        rectEnclosure(bd,1,4,4,14,14);   // 黒 大囲い
        // 周辺白石で演出
        bd[0][0]=2; bd[18][18]=2; bd[0][18]=2; bd[18][0]=2; bd[9][18]=2; bd[18][9]=2;
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'19路: 中央大囲い + 周辺白' });
      }
    }
    return arr;
  }
  const PROBLEMS_BY_LEVEL = {
    9: buildProblemsFor(9),
    13: buildProblemsFor(13),
    19: buildProblemsFor(19)
  };

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

    // Hoshi points
    const hoshi = getHoshiPoints(N);
    bctx.fillStyle = '#603e18';
    for(const [i,j] of hoshi){
      const {cx, cy} = ijToCoord(i,j, step);
      bctx.beginPath(); bctx.arc(cx, cy, 4, 0, Math.PI*2); bctx.fill();
    }

    // Stones
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
    return []; // fallback
  }

  // ====== Territory calc (flash) ======
  function flashTerritory(bd){
    const n = bd.length;
    const visited = Array.from({length:n}, ()=>Array(n).fill(false));
    let blackTerr=0, whiteTerr=0, neutral=0;
    const mapTerr = Array.from({length:n}, ()=>Array(n).fill(0));
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

  // ====== Game flow ======
  function loadLevel(level){
    currentLevel = level;
    const problems = PROBLEMS_BY_LEVEL[level];
    problemTotalEl.textContent = problems.length;
    loadProblem(0);
    statusEl.innerHTML = `レベル ${level}路盤を開始しました。黒地と白地を入力して「答え合わせ」。`;
  }

  function loadProblem(idx){
    currentProblemIdx = idx;
    const p = PROBLEMS_BY_LEVEL[currentLevel][idx];
    N = p.size;
    board = p.board.map(row => row.slice());
    boardSizeText.textContent = `${N}×${N}`;
    komiText.textContent = `${p.komi}`;
    capBText.textContent = `${p.capB}`;
    capWText.textContent = `${p.capW}`;
    problemIdxEl.textContent = (idx+1);
    ansBlackTerr.value = '0';
    ansWhiteTerr.value = '0';
    drawBoard();
    octx.clearRect(0,0,overlayCanvas.width, overlayCanvas.height);
  }

  function checkAnswer(){
    const p = PROBLEMS_BY_LEVEL[currentLevel][currentProblemIdx];
    const result = flashTerritory(board);
    const userB = parseInt(ansBlackTerr.value || '0', 10);
    const userW = parseInt(ansWhiteTerr.value || '0', 10);

    const correct = (userB === result.blackTerr) && (userW === result.whiteTerr);
    if(correct){
      score += 1; scoreEl.textContent = score;
      statusEl.innerHTML = `<span class="green">正解！</span> 次の問題へ進みます。`;
      const nextIdx = currentProblemIdx + 1;
      if(nextIdx < PROBLEMS_BY_LEVEL[currentLevel].length){
        setTimeout(()=>{ loadProblem(nextIdx); }, 800);
      } else {
        // レベルクリア
        const levels = [9,13,19];
        const pos = levels.indexOf(currentLevel);
        if(AUTO_ADVANCE && pos >= 0 && pos < levels.length - 1){
          const nextLevel = levels[pos+1];
          statusEl.innerHTML = `レベル ${currentLevel} を<b>全問クリア</b>！ → <b>${nextLevel}路盤</b>に進みます。`;
          setTimeout(()=>{ loadLevel(nextLevel); }, 1200);
        } else {
          statusEl.innerHTML = `全レベルをクリア！おめでとうございます 🎉`;
        }
      }
    } else {
      lives -= 1; livesEl.textContent = lives;
      statusEl.innerHTML = `<span class="red">不正解。</span> 残り挑戦回数: ${lives}`;
      if(lives <= 0){
        statusEl.innerHTML += `<br/><b>ゲームオーバー</b>。リスタートで最初からやり直せます。`;
      }
    }
  }

  // ====== Events ======
  hintBtn.addEventListener('click', ()=>{
    const r = flashTerritory(board);
    drawTerritoryOverlay(r.mapTerr);
    statusEl.innerHTML = `地オーバーレイを表示中（数値のヒントは表示しません）。`;
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

  levelSelect.addEventListener('change', ()=>{
    lives = 3; score = 0;
    livesEl.textContent = lives; scoreEl.textContent = score;
    const level = parseInt(levelSelect.value, 10);
    loadLevel(level);
  });

  // ====== Init ======
  loadLevel(9); // 初期レベルは9路盤
})();
