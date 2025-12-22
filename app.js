
(function(){
  // ====== Elements & State ======
  const boardCanvas = document.getElementById('board');
  const overlayCanvas = document.getElementById('overlay');
  const bctx = boardCanvas.getContext('2d');
  const octx = overlayCanvas.getContext('2d');
  const margin = 30;

  let N = 9;    // board size
  let board = []; // 0 empty, 1 black, 2 white

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
  const revealBtn = document.getElementById('revealBtn');
  const restartBtn = document.getElementById('restartBtn');
  const statusEl = document.getElementById('status');

  let lives = 3;
  let score = 0;
  let currentProblemIdx = 0;

  // ====== Problems ======
  function emptyBoard(n){ return Array.from({length:n}, ()=>Array(n).fill(0)); }
  function rectEnclosure(bd, color, x1,y1,x2,y2){
    const n = bd.length;
    const minx = Math.max(0, Math.min(x1,x2)), maxx = Math.min(n-1, Math.max(x1,x2));
    const miny = Math.max(0, Math.min(y1,y2)), maxy = Math.min(n-1, Math.max(y1,y2));
    for(let i=minx;i<=maxx;i++){ bd[i][miny] = color; bd[i][maxy] = color; }
    for(let j=miny;j<=maxy;j++){ bd[minx][j] = color; bd[maxx][j] = color; }
    return bd;
  }
  function makeProblems(){
    const problems = [];
    // P1
    { const n=9, bd=emptyBoard(n);
      rectEnclosure(bd,1,1,1,3,3);
      rectEnclosure(bd,2,5,5,7,7);
      problems.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'基本の囲い 1' });
    }
    // P2
    { const n=9, bd=emptyBoard(n);
      rectEnclosure(bd,1,1,1,5,3);
      rectEnclosure(bd,2,6,1,8,2);
      problems.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'基本の囲い 2' });
    }
    // P3
    { const n=9, bd=emptyBoard(n);
      rectEnclosure(bd,2,1,5,3,7);
      rectEnclosure(bd,1,5,1,8,4);
      problems.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'左右に大囲い' });
    }
    // P4
    { const n=9, bd=emptyBoard(n);
      rectEnclosure(bd,1,2,2,6,6);
      bd[0][0]=2; bd[8][8]=2; bd[0][8]=2; bd[8][0]=2;
      problems.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'中央大囲い' });
    }
    // P5
    { const n=9, bd=emptyBoard(n);
      rectEnclosure(bd,1,1,1,4,4);
      bd[1][1]=2; bd[4][4]=2;
      rectEnclosure(bd,2,5,5,8,8);
      bd[5][5]=1; bd[8][8]=1;
      problems.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'境界演出付き' });
    }
    return problems;
  }
  const PROBLEMS = makeProblems();
  problemTotalEl.textContent = PROBLEMS.length;

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

    const hoshiIdx = [2,4,6];
    bctx.fillStyle = '#603e18';
    for(const i of hoshiIdx){
      for(const j of hoshiIdx){
        const {cx, cy} = ijToCoord(i,j, step);
        bctx.beginPath(); bctx.arc(cx, cy, 4, 0, Math.PI*2); bctx.fill();
      }
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
  function ijToCoord(i,j, step){
    return { cx: margin + i*step, cy: margin + j*step };
  }

  // ====== Territory calc ======
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
    const w = overlayCanvas.width, h = overlayCanvas.height;
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
  function loadProblem(idx){
    currentProblemIdx = idx;
    const p = PROBLEMS[idx];
    N = p.size;
    board = p.board.map(row => row.slice());
    boardSizeText.textContent = `${N}×${N}`;
    komiText.textContent = `${p.komi}`;
    capBText.textContent = `${p.capB}`;
    capWText.textContent = `${p.capW}`;
    problemIdxEl.textContent = (idx+1);
    ansBlackTerr.value = '0';
    ansWhiteTerr.value = '0';
    statusEl.innerHTML = `問題「${p.title}」：黒地と白地を入力して「答え合わせ」。`;
    drawBoard();
    octx.clearRect(0,0,overlayCanvas.width, overlayCanvas.height);
  }

  function checkAnswer(){
    const p = PROBLEMS[currentProblemIdx];
    const result = flashTerritory(board);
    const userB = parseInt(ansBlackTerr.value || '0', 10);
    const userW = parseInt(ansWhiteTerr.value || '0', 10);

    const correct = (userB === result.blackTerr) && (userW === result.whiteTerr);
    if(correct){
      score += 1; scoreEl.textContent = score;
      statusEl.innerHTML = `<span class="green">正解！</span> 黒地 ${result.blackTerr} / 白地 ${result.whiteTerr} / 中立 ${result.neutral}<br/>` +
        `最終計（参考）: 黒 ${ (result.blackTerr + p.capB).toFixed(1) } vs 白 ${(result.whiteTerr + p.capW + p.komi).toFixed(1)}（コミ適用）`;
      const nextIdx = currentProblemIdx + 1;
      if(nextIdx < PROBLEMS.length){
        setTimeout(()=>{ loadProblem(nextIdx); }, 900);
      } else {
        statusEl.innerHTML += `<br/><b>全問クリア！</b> おめでとうございます 🎉`;
      }
    } else {
      lives -= 1; livesEl.textContent = lives;
      statusEl.innerHTML = `<span class="red">不正解。</span> 残り挑戦回数: ${lives}　（ヒントや答え表示で確認できます）`;
      if(lives <= 0){
        statusEl.innerHTML += `<br/><b>ゲームオーバー</b>。リスタートで最初からやり直せます。`;
      }
    }
  }

  // ====== Events ======
  hintBtn.addEventListener('click', ()=>{
    const r = flashTerritory(board);
    drawTerritoryOverlay(r.mapTerr);
    statusEl.innerHTML = `地の可視化：黒地 ${r.blackTerr} / 白地 ${r.whiteTerr} / 中立 ${r.neutral}`;
  });
  submitBtn.addEventListener('click', ()=>{
    if(lives <= 0){
      statusEl.innerHTML = `<span class="red">挑戦回数がありません。</span> リスタートしてください。`;
      return;
    }
    checkAnswer();
  });
  revealBtn.addEventListener('click', ()=>{
    const p = PROBLEMS[currentProblemIdx];
    const r = flashTerritory(board);
    ansBlackTerr.value = r.blackTerr;
    ansWhiteTerr.value = r.whiteTerr;
    drawTerritoryOverlay(r.mapTerr);
    statusEl.innerHTML = `答え：黒地 ${r.blackTerr} / 白地 ${r.whiteTerr} / 中立 ${r.neutral}<br/>` +
      `最終計（参考）: 黒 ${(r.blackTerr + p.capB).toFixed(1)} vs 白 ${(r.whiteTerr + p.capW + p.komi).toFixed(1)}`;
  });
  restartBtn.addEventListener('click', ()=>{
    lives = 3; score = 0;
    livesEl.textContent = lives; scoreEl.textContent = score;
    loadProblem(0);
    statusEl.innerHTML = `最初の問題から再開しました。がんばって！`;
  });

  // ====== Init ======
  loadProblem(0);
})();
