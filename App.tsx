import React, { useState, useEffect } from 'react';
import Board from './components/Board';
import KillScreen from './components/KillScreen';
import { generateNewGamePieces, PIECE_CHARS } from './constants';
import { Piece, Move, PlayerColor, Position } from './types';
import { isValidMove, checkHasValidMoves } from './utils/gameLogic';
import { soundManager } from './utils/soundManager';

const App: React.FC = () => {
  // Game Setup State
  const [gameStarted, setGameStarted] = useState(false);
  const [p1Name, setP1Name] = useState("玩家 1");
  const [p2Name, setP2Name] = useState("玩家 2");

  // Game Play State
  const [pieces, setPieces] = useState<Piece[]>(generateNewGamePieces);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0); // 0 or 1
  const [playerColors, setPlayerColors] = useState<{ [key: number]: PlayerColor | null }>({ 0: null, 1: null });
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.3); // Initial matches SoundManager default
  
  // State for the Kill Screen Animation
  const [killAnimData, setKillAnimData] = useState<{ attacker: Piece, victim: Piece } | null>(null);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 50));

  const getCurrentPlayerColor = () => playerColors[currentPlayerIndex];
  const getCurrentPlayerName = () => currentPlayerIndex === 0 ? p1Name : p2Name;
  const getPlayerName = (idx: number) => idx === 0 ? p1Name : p2Name;

  // Initialize Audio Context on first interaction
  useEffect(() => {
    const initAudio = () => {
        soundManager.init();
        window.removeEventListener('click', initAudio);
        window.removeEventListener('touchstart', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('touchstart', initAudio);
    return () => {
        window.removeEventListener('click', initAudio);
        window.removeEventListener('touchstart', initAudio);
        soundManager.stopBGM(); // Ensure clean state on unmount
    };
  }, []);

  // Handle BGM when game state changes
  useEffect(() => {
    if (gameStarted && winner === null) {
        soundManager.startBGM();
    } else {
        soundManager.stopBGM();
    }
  }, [gameStarted, winner]);

  const startGame = () => {
    if (!p1Name.trim()) setP1Name("玩家 1");
    if (!p2Name.trim()) setP2Name("玩家 2");
    soundManager.playSelect();
    setGameStarted(true);
    setLogs([`遊戲開始：${p1Name} 請翻牌`]);
    // BGM starts via useEffect
  };

  const toggleMute = (e: React.MouseEvent) => {
      e.stopPropagation();
      const muted = soundManager.toggleMute();
      setIsMuted(muted);
      if (muted) {
          soundManager.stopBGM();
      } else if (gameStarted && winner === null) {
          soundManager.startBGM();
      }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation(); // Prevent clicks from bubbling if needed
      const vol = parseFloat(e.target.value);
      setBgmVolume(vol);
      soundManager.setBGMVolume(vol);
  };

  // Effect to check stalemate AFTER turn update or piece update
  useEffect(() => {
      if (winner !== null || killAnimData !== null) return;
      
      const currentColor = playerColors[currentPlayerIndex];
      // Only check if colors are assigned
      if (currentColor) {
          const hasMoves = checkHasValidMoves(pieces, currentColor);
          if (!hasMoves) {
              const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
              setWinner(opponentIndex);
              soundManager.playKO(); // This stops BGM inside the method
              addLog(`遊戲結束：${getPlayerName(currentPlayerIndex)} 無子可動！${getPlayerName(opponentIndex)} 獲勝！`);
          }
      }
  }, [currentPlayerIndex, pieces, playerColors, winner, killAnimData]);

  const handleSquareClick = (r: number, c: number) => {
    if (winner !== null || killAnimData !== null) return; // Block input during animation

    const clickedPos = { r, c };
    // Only find active (non-dying, non-dead) pieces for interaction
    const clickedPiece = pieces.find(p => !p.dead && !p.dying && p.position.r === r && p.position.c === c);
    const myColor = getCurrentPlayerColor();

    // Case 1: Clicked a hidden piece (Attempt Flip)
    if (clickedPiece && !clickedPiece.revealed) {
      setSelectedPieceId(null);
      handleFlip(clickedPiece);
      return;
    }

    // Case 2: Clicked a revealed piece
    if (clickedPiece && clickedPiece.revealed) {
      if (myColor && clickedPiece.color === myColor) {
        soundManager.playSelect();
        setSelectedPieceId(clickedPiece.id);
        return;
      }
    }

    // Case 3: Moving selected piece
    if (selectedPieceId) {
      const sourcePiece = pieces.find(p => p.id === selectedPieceId);
      if (sourcePiece) {
        if (isValidMove(pieces, sourcePiece, clickedPos)) {
            executeMove(sourcePiece, clickedPos);
        } else {
             setSelectedPieceId(null);
        }
      }
    }
  };

  const handleFlip = (piece: Piece) => {
    soundManager.playFlip();

    // 1. Reveal piece
    const newPieces = pieces.map(p => p.id === piece.id ? { ...p, revealed: true } : p);
    setPieces(newPieces);
    
    const char = PIECE_CHARS[`${piece.color}_${piece.type}`];
    const colorName = piece.color === 'red' ? '紅' : '黑';
    let logMsg = `${getCurrentPlayerName()} 翻出 ${colorName}${char}`;

    // 2. Assign colors if not yet assigned
    let newColors = { ...playerColors };
    if (playerColors[0] === null) {
      const p1Color = piece.color;
      const p2Color = piece.color === 'red' ? 'black' : 'red';
      newColors = { 0: p1Color, 1: p2Color };
      setPlayerColors(newColors);
      logMsg += ` (${p1Name} 執${p1Color === 'red' ? '紅' : '黑'})`;
    }

    addLog(logMsg);
    
    // Switch turn
    setCurrentPlayerIndex(prev => prev === 0 ? 1 : 0);
  };

  const executeMove = (piece: Piece, to: Position) => {
    const targetPiece = pieces.find(p => !p.dead && !p.dying && p.position.r === to.r && p.position.c === to.c);
    
    // If it's a capture, trigger the Kill Screen Animation FIRST
    if (targetPiece) {
        const isUnderdog = piece.type === 'soldier' && targetPiece.type === 'general';
        soundManager.playKill(piece.type, isUnderdog);

        setKillAnimData({ attacker: piece, victim: targetPiece });
        
        // Wait for animation duration (1.8s) before updating the board
        setTimeout(() => {
            setKillAnimData(null);
            performBoardUpdate(piece, to, targetPiece);
        }, 1800);
    } else {
        // Normal move
        soundManager.playMove();
        performBoardUpdate(piece, to, null);
    }
  };

  const performBoardUpdate = (piece: Piece, to: Position, targetPiece: Piece | null | undefined) => {
    const newPieces = pieces.map(p => {
      // Move attacker immediately
      if (p.id === piece.id) {
        return { ...p, position: to };
      }
      // Set target to dying (stays in place for abyss animation)
      if (targetPiece && p.id === targetPiece.id) {
        return { ...p, dying: true };
      }
      return p;
    });

    setPieces(newPieces);
    setLastMove({ from: piece.position, to });
    setSelectedPieceId(null);
    
    const attackerChar = PIECE_CHARS[`${piece.color}_${piece.type}`];
    let actionStr = "";
    if (targetPiece) {
        const targetChar = PIECE_CHARS[`${targetPiece.color}_${targetPiece.type}`];
        actionStr = `吃 ${targetChar}`;
    } else {
        actionStr = `→ (${to.r},${to.c})`;
    }
    
    const playerLabel = playerColors[currentPlayerIndex] === 'red' ? '紅方' : '黑方';
    addLog(`${getCurrentPlayerName()} (${playerLabel}): ${attackerChar} ${actionStr}`);

    // Clean up dead piece after abyss animation
    if (targetPiece) {
      setTimeout(() => {
        setPieces(prev => prev.map(p => 
          p.id === targetPiece.id ? { ...p, dead: true, dying: false } : p
        ));
      }, 600); 
    }

    // Check Elimination Win Condition
    const opponentColor = playerColors[currentPlayerIndex === 0 ? 1 : 0];
    if (opponentColor) {
        // Count pieces that are NOT dead and NOT dying
        const opponentAlive = newPieces.filter(p => p.color === opponentColor && !p.dead && !p.dying);
        if (opponentAlive.length === 0) {
            setWinner(currentPlayerIndex);
            soundManager.playKO();
            addLog(`遊戲結束！${getPlayerName(currentPlayerIndex)} 獲勝！`);
            return; 
        }
    }

    setCurrentPlayerIndex(prev => prev === 0 ? 1 : 0);
  };

  const handleSurrender = () => {
    if (winner !== null) return;
    const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
    setWinner(opponentIndex);
    soundManager.playKO();
    addLog(`${getPlayerName(currentPlayerIndex)} 投降。${getPlayerName(opponentIndex)} 獲勝！`);
  };

  const resetGame = (restartBGM: any = true) => {
      const shouldRestartBGM = typeof restartBGM === 'boolean' ? restartBGM : true;

      soundManager.stopBGM(); // Explicitly stop BGM on reset
      soundManager.playSelect();
      setPieces(generateNewGamePieces());
      setCurrentPlayerIndex(0);
      setPlayerColors({ 0: null, 1: null });
      setSelectedPieceId(null);
      setLastMove(null);
      setWinner(null);
      setKillAnimData(null);
      setLogs([`遊戲開始：${p1Name} 請翻牌`]);
      if (shouldRestartBGM && gameStarted) {
         soundManager.startBGM();
      }
  };
  
  const backToSetup = () => {
      setGameStarted(false);
      resetGame(false); // Do not restart BGM as we are leaving the game view
  };

  // Helper to render graveyard pieces
  const renderGraveyard = (color: PlayerColor) => {
    const deadPieces = pieces.filter(p => p.dead && p.color === color).sort((a, b) => b.rank - a.rank);
    return (
      <div className="flex flex-wrap gap-1 bg-black/10 p-2 rounded-lg min-h-[3rem] items-center">
        {deadPieces.length === 0 && <span className="text-xs text-gray-500 italic px-2">無傷亡</span>}
        {deadPieces.map(p => (
           <div key={p.id} className={`
              w-8 h-8 rounded-full border border-opacity-50 flex items-center justify-center text-sm shadow-sm opacity-70 grayscale hover:grayscale-0 transition-all
              ${p.color === 'red' ? 'bg-[#f4e4d4] border-red-800 text-red-800' : 'bg-[#f4e4d4] border-black text-black'}
           `}>
             {PIECE_CHARS[`${p.color}_${p.type}`]}
           </div>
        ))}
      </div>
    );
  };

  if (!gameStarted) {
      return (
          <div className="min-h-screen bg-[#f0e4d4] flex flex-col items-center justify-center p-4 font-serif relative overflow-hidden">
               {/* Background effect */}
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-50 pointer-events-none"></div>
               
               <div className="z-10 bg-white/90 p-8 rounded-2xl shadow-2xl border-4 border-[#8d6e63] w-full max-w-md text-center">
                   <h1 className="text-5xl font-black text-[#3e2723] mb-2 tracking-widest">暗棋大戰</h1>
                   <p className="text-[#5d4037] mb-8 font-bold text-lg">BANQI BATTLE</p>
                   
                   <div className="space-y-6">
                       <div className="text-left">
                           <label className="block text-sm font-bold text-[#8d6e63] mb-1 pl-1">玩家 1 名稱</label>
                           <input 
                              type="text" 
                              value={p1Name} 
                              onChange={(e) => setP1Name(e.target.value)}
                              className="w-full text-lg p-3 rounded border-2 border-[#d7ccc8] focus:border-amber-600 focus:outline-none bg-[#fff8e1] text-[#3e2723] font-bold"
                              placeholder="輸入名稱..."
                           />
                       </div>
                       
                       <div className="flex items-center justify-center text-3xl font-black text-amber-800/50">
                            VS
                       </div>

                       <div className="text-left">
                           <label className="block text-sm font-bold text-[#8d6e63] mb-1 pl-1">玩家 2 名稱</label>
                           <input 
                              type="text" 
                              value={p2Name} 
                              onChange={(e) => setP2Name(e.target.value)}
                              className="w-full text-lg p-3 rounded border-2 border-[#d7ccc8] focus:border-amber-600 focus:outline-none bg-[#fff8e1] text-[#3e2723] font-bold"
                              placeholder="輸入名稱..."
                           />
                       </div>

                       <button 
                         onClick={startGame}
                         className="w-full bg-amber-700 text-white text-xl py-4 rounded-xl shadow-lg hover:bg-amber-800 hover:scale-105 transition-all font-bold border-b-4 border-amber-900 active:border-b-0 active:translate-y-1 mt-4"
                       >
                           開始對戰
                       </button>
                   </div>
               </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#f0e4d4] flex flex-col items-center justify-center p-4 font-serif text-[#3e2723]">
      
      {/* Sound Toggle (Floating Top Right) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          {/* BGM Volume Slider */}
          <div className="hidden md:flex items-center gap-2 bg-white/80 p-2 rounded-full shadow-lg border border-[#8d6e63]">
            <span className="text-xs font-bold text-amber-900">♫</span>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={bgmVolume} 
              onChange={handleVolumeChange} 
              className="w-20 accent-amber-700 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <button 
            onClick={backToSetup}
            className="bg-white/80 p-2 rounded-full shadow-lg border border-[#8d6e63] hover:bg-white transition-all text-xs font-bold px-3"
            title="Return to Setup"
          >
            退出
          </button>
          <button 
            onClick={toggleMute}
            className="bg-white/80 p-2 rounded-full shadow-lg border border-[#8d6e63] hover:bg-white transition-all active:scale-95 w-10 h-10 flex items-center justify-center"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
      </div>

      {/* Full Screen Kill Animation Overlay */}
      {killAnimData && (
        <KillScreen attacker={killAnimData.attacker} victim={killAnimData.victim} />
      )}

      {/* KO Screen Overlay */}
      {winner !== null && (
         <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center animate-ko-bg overflow-hidden cursor-pointer" onClick={backToSetup}>
            <div className="relative flex items-center justify-center gap-2 md:gap-8">
               <span className="text-[12rem] md:text-[20rem] font-black text-red-600 animate-ko-text drop-shadow-[0_0_50px_rgba(255,0,0,0.8)]" style={{ fontFamily: "'Black Ops One', cursive" }}>K</span>
               <span className="text-[12rem] md:text-[20rem] font-black text-red-600 animate-ko-text drop-shadow-[0_0_50px_rgba(255,0,0,0.8)]" style={{ animationDelay: '0.1s', fontFamily: "'Black Ops One', cursive" }}>O</span>
            </div>
            
            <div className="absolute bottom-20 text-white text-3xl md:text-5xl font-bold tracking-widest animate-pulse uppercase">
               {getPlayerName(winner)} 獲勝
            </div>

            <div className="absolute top-1/2 left-0 w-full h-32 bg-white/10 blur-xl animate-pulse"></div>
         </div>
      )}

      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8 items-start justify-center">
        
        {/* Game Area */}
        <div className="flex-1 w-full flex flex-col items-center max-w-[640px]">
            {/* Header / HUD */}
            <div className="w-full flex justify-between items-center mb-4 bg-white/60 p-4 rounded-lg shadow">
                <div className={`flex flex-col items-center p-2 rounded w-32 transition-all ${currentPlayerIndex === 0 ? 'bg-amber-200 ring-4 ring-amber-600 scale-105' : 'opacity-70'}`}>
                    <span className="font-bold text-lg truncate w-full text-center">{p1Name}</span>
                    <span className="text-sm uppercase font-bold text-gray-600">
                        {playerColors[0] ? (playerColors[0] === 'red' ? '紅方' : '黑方') : '?'}
                    </span>
                </div>

                <div className="text-2xl font-bold text-amber-900 tracking-wider">
                    VS
                </div>

                <div className={`flex flex-col items-center p-2 rounded w-32 transition-all ${currentPlayerIndex === 1 ? 'bg-amber-200 ring-4 ring-amber-600 scale-105' : 'opacity-70'}`}>
                    <span className="font-bold text-lg truncate w-full text-center">{p2Name}</span>
                    <span className="text-sm uppercase font-bold text-gray-600">
                        {playerColors[1] ? (playerColors[1] === 'red' ? '紅方' : '黑方') : '?'}
                    </span>
                </div>
            </div>

            <Board 
                pieces={pieces} 
                selectedPieceId={selectedPieceId}
                lastMove={lastMove}
                onSquareClick={handleSquareClick}
                currentPlayerColor={playerColors[currentPlayerIndex]}
            />

            {/* Graveyard Section */}
            <div className="w-full mt-4 grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                   <span className="text-xs font-bold text-red-800 uppercase">紅方陣亡</span>
                   {renderGraveyard('red')}
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-xs font-bold text-black uppercase">黑方陣亡</span>
                   {renderGraveyard('black')}
                </div>
            </div>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-72 flex flex-col gap-4">
            <div className="bg-white/80 p-4 rounded-lg shadow-lg h-96 overflow-hidden flex flex-col border border-[#d7ccc8]">
                <h3 className="text-amber-900 font-bold border-b-2 border-amber-200 pb-2 mb-2 flex justify-between">
                    <span>戰報</span>
                    <span className="text-xs font-normal pt-1 opacity-50">最新</span>
                </h3>
                <div className="flex-1 overflow-y-auto text-base font-bold font-serif space-y-2 pr-1 custom-scrollbar">
                    {logs.map((l, i) => (
                        <div key={i} className="text-[#3e2723] bg-amber-50/50 p-2 rounded border-b border-amber-100 flex items-start">
                            <span className="text-amber-600 text-xs mr-2 mt-1">#{logs.length - i}</span>
                            <span className="break-all">{l}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <button 
                    onClick={() => resetGame(true)}
                    className="w-full bg-amber-800 text-white py-3 rounded-lg shadow-lg hover:bg-amber-900 transition-all font-bold text-lg border-b-4 border-amber-950 active:border-b-0 active:translate-y-1 active:shadow-inner"
                >
                    重新開始
                </button>
                <button 
                    onClick={handleSurrender}
                    disabled={winner !== null}
                    className="w-full bg-red-100 text-red-900 py-3 rounded-lg shadow hover:bg-red-200 transition-all font-bold border-2 border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    投降
                </button>
            </div>
            
            <div className="bg-[#fff8e1] p-4 rounded-lg text-xs text-amber-900 border border-amber-200 shadow-sm">
                <p className="font-bold mb-2 text-base border-b border-amber-200 pb-1">遊戲規則</p>
                <ul className="list-disc pl-4 space-y-1 leading-relaxed">
                    <li>輪流翻牌，首翻定色。</li>
                    <li>每次移動一格（上下左右）。</li>
                    <li>大小：將 > 士 > 象 > 車 > 馬 > 卒。</li>
                    <li><strong>例外：</strong> 卒 吃 將。</li>
                    <li><strong>炮：</strong> 必須隔一子吃子。</li>
                    <li><strong>獲勝：</strong> 吃光對方或對方無路可走。</li>
                </ul>
            </div>
        </div>

      </div>
    </div>
  );
};

export default App;