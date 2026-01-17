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

  // ====== Utility: board ops ======
  function emptyBoard(n){ return Array.from({length:n}, ()=>Array(n).fill(0)); }
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

  // ====== Problems: more "game-like" shapes ======
  function buildProblemsFor(n){
    const arr = [];
    if(n === 9){
      // 9路: corner frameworks / side walls / simple fights
      { const bd=emptyBoard(n);
        // 黒：上左隅〜上辺に壁、白：右下隅を地に
        wallPolyline(bd,1, [[1,1],[3,1],[3,2],[5,2],[5,3],[7,3]]);
        ringRect(bd,2, 5,5, 7,7); // 白の小地
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'9路: 上辺黒の壁と右下白地', note:'簡単な隅地 + 片側模様' });
      }
      { const bd=emptyBoard(n);
        // 黒：左辺〜中央へ厚み、白：下辺に壁
        wallPolyline(bd,1, [[1,2],[1,4],[2,5],[3,5],[4,6]]);
        wallPolyline(bd,2, [[2,7],[4,7],[6,7]]);
        ringRect(bd,1, 2,2, 4,4); // 黒小地
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'9路: 左厚み＋下白壁', note:'隅・辺に実戦風の厚み' });
      }
      { const bd=emptyBoard(n);
        // 黒：右上隅を確保、白：左下隅確保、中央は中立になりがち
        ringRect(bd,1, 5,1, 7,3);
        ringRect(bd,2, 1,5, 3,7);
        // 中央に雑石
        place(bd,1, [[4,4]]); place(bd,2, [[4,5]]);
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'9路: 右上黒/左下白＋中央接触', note:'中央は中立の可能性' });
      }
      { const bd=emptyBoard(n);
        // 黒：上辺長い壁、白：右辺壁で囲いの雰囲気
        wallPolyline(bd,1, [[1,1],[3,1],[5,1],[7,1]]);
        wallPolyline(bd,2, [[7,1],[7,3],[7,5],[7,7]]);
        ringRect(bd,1, 2,2, 5,5);
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'9路: 上黒長壁＋右白壁', note:'上・右の厚み対決' });
      }
      { const bd=emptyBoard(n);
        // 黒：左下大囲い、白：右上小囲い、境界に斜め
        ringRect(bd,1, 1,3, 5,7);
        ringRect(bd,2, 5,1, 7,3);
        line(bd,2, 4,4, 5,5); // 斜めの境界演出
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'9路: 斜め境界演出', note:'中立の取り扱いに注意' });
      }
    } else if(n === 13){
      // 13路: larger moyo; multiple corners
      { const bd=emptyBoard(n);
        ringRect(bd,1, 2,2, 5,5);         // 黒左上
        ringRect(bd,2, 7,7, 10,10);       // 白右下
        wallPolyline(bd,1, [[3,8],[5,8],[6,7]]);
        place(bd,2, [[9,3],[10,4]]);      // 白の肩
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'13路: 左上黒/右下白＋肩', note:'中央は中立になりやすい' });
      }
      { const bd=emptyBoard(n);
        wallPolyline(bd,1, [[2,3],[2,6],[4,8],[6,9]]);   // 黒縦厚
        ringRect(bd,2, 8,2, 11,5);                       // 白右上
        wallPolyline(bd,2, [[6,11],[8,11]]);             // 白下辺
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'13路: 黒縦厚＋白右上/下辺', note:'辺の地を見極め' });
      }
      { const bd=emptyBoard(n);
        ringRect(bd,1, 3,3, 9,9);                        // 黒中央広域
        place(bd,2, [[1,1],[11,11],[1,11],[11,1]]);      // 隅演出
        wallPolyline(bd,2, [[9,3],[10,4],[10,6]]);       // 白肩付き
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'13路: 黒中央広域＋白肩', note:'中央の確定地判定' });
      }
      { const bd=emptyBoard(n);
        ringRect(bd,2, 2,7, 6,11);                       // 白左下広め
        wallPolyline(bd,1, [[7,2],[10,2],[10,4]]);       // 黒右上辺
        place(bd,1, [[9,9]]);                            // 黒の目
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'13路: 左下白広域＋右上黒辺', note:'辺地＋隅地の混成' });
      }
      { const bd=emptyBoard(n);
        wallPolyline(bd,1, [[3,5],[5,5],[7,5],[9,5]]);   // 黒中央横壁
        ringRect(bd,2, 9,8, 11,10);                      // 白右下小地
        ringRect(bd,1, 2,2, 4,4);                        // 黒左上小地
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'13路: 中央横壁＋左右小地', note:'壁で分割' });
      }
    } else if(n === 19){
      // 19路: moyo + enclosures; more stones
      { const bd=emptyBoard(n);
        ringRect(bd,1, 4,4, 10,10);                      // 黒中央大囲い
        ringRect(bd,2, 13,13, 16,16);                    // 白右下小地
        wallPolyline(bd,2, [[1,15],[4,15],[6,14]]);      // 白下辺肩
        place(bd,1, [[14,4],[15,5]]);                    // 黒右上肩
        arr.push({ size:n, board:bd, komi:7.5, capB:0, capW:0, title:'19路: 中央黒大＋右下白', note:'コミ7.5（ルール差異演出）' });
      }
      { const bd=emptyBoard(n);
        wallPolyline(bd,1, [[3,3],[6,3],[9,3],[12,3]]);  // 黒上辺長壁
        wallPolyline(bd,2, [[16,4],[16,7],[16,10]]);     // 白右辺縦壁
        ringRect(bd,2, 6,12, 9,15);                      // 白左下小地
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'19路: 上黒長壁＋右白縦壁', note:'辺の囲い分割' });
      }
      { const bd=emptyBoard(n);
        ringRect(bd,1, 5,5, 14,14);                      // 黒大囲い
        place(bd,2, [[0,0],[18,18],[0,18],[18,0],[9,18],[18,9]]); // 白周辺演出
        wallPolyline(bd,2, [[12,6],[13,7],[13,9]]);      // 白肩侵入風
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'19路: 黒中央大＋白周辺肩', note:'中央 vs 周辺の構図' });
      }
      { const bd=emptyBoard(n);
        ringRect(bd,2, 3,12, 8,17);                      // 白左下広域
        ringRect(bd,1, 12,3, 16,7);                      // 黒右上広域
        wallPolyline(bd,1, [[9,9],[11,9]]);              // 黒中央短壁
        place(bd,2, [[9,10]]);                           // 白接触
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'19路: 斜対称の広域', note:'接触で中立が出やすい' });
      }
      { const bd=emptyBoard(n);
        wallPolyline(bd,1, [[4,8],[6,8],[8,8],[10,8],[12,8]]); // 黒中央横長壁
        ringRect(bd,2, 14,4, 17,7);                     // 白右上隅地
        ringRect(bd,1, 2,2, 5,5);                       // 黒左上隅地
        arr.push({ size:n, board:bd, komi:6.5, capB:0, capW:0, title:'19路: 中央横壁＋隅地', note:'実戦風の分割' });
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
    statusEl.innerHTML = `レベル ${level}路盤を開始しました。回答形式を選んで「答え合わせ」。`;
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
    noteText.textContent = p.note || '';
    problemIdxEl.textContent = (idx+1);
    ansDiff.value = '0';
    ansWinner.value = 'black';
    ansMargin.value = '0.5';
    drawBoard();
    octx.clearRect(0,0,overlayCanvas.width, overlayCanvas.height);
  }

  function round1(x){ return Math.round(x*10)/10; } // 0.1刻み丸め

  function checkAnswer(){
    const p = PROBLEMS_BY_LEVEL[currentLevel][currentProblemIdx];
    const r = flashTerritory(board);
    const blackScore = r.blackTerr + p.capB;
    const whiteScore = r.whiteTerr + p.capW + p.komi;
    const diff = round1(blackScore - whiteScore); // 黒−白（0.1精度）
    const winner = diff > 0 ? 'black' : diff < 0 ? 'white' : 'draw';
    const margin = round1(Math.abs(diff));

    const mode = answerModeSel.value;
    let correct = false;

    if(mode === 'diff'){
      const userDiff = parseFloat(ansDiff.value || '0');
      correct = (round1(userDiff) === diff);
    } else {
      const userWinner = ansWinner.value; // 'black'|'white'
      const userMargin = parseFloat(ansMargin.value || '0');
      correct = (winner !== 'draw') && (userWinner === winner) && (round1(userMargin) === margin);
    }

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
