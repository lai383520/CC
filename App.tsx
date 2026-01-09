import React, { useState, useEffect } from 'react';
import Board from './components/Board';
import KillScreen from './components/KillScreen';
import { generateNewGamePieces, PIECE_CHARS } from './constants';
import { Piece, Move, PlayerColor, Position } from './types';
import { isValidMove, checkHasValidMoves } from './utils/gameLogic';

const App: React.FC = () => {
  // Use lazy initialization for state to prevent unnecessary regeneration on re-renders
  const [pieces, setPieces] = useState<Piece[]>(generateNewGamePieces);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0); // 0 or 1
  const [playerColors, setPlayerColors] = useState<{ [key: number]: PlayerColor | null }>({ 0: null, 1: null });
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>(["Game Start: Player 1's turn to flip."]);
  
  // State for the Kill Screen Animation
  const [killAnimData, setKillAnimData] = useState<{ attacker: Piece, victim: Piece } | null>(null);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 50));

  const getCurrentPlayerColor = () => playerColors[currentPlayerIndex];

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
              addLog(`Game Over: Player ${currentPlayerIndex + 1} has no moves! Player ${opponentIndex + 1} Wins!`);
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
    // 1. Reveal piece
    const newPieces = pieces.map(p => p.id === piece.id ? { ...p, revealed: true } : p);
    setPieces(newPieces);
    
    let logMsg = `Player ${currentPlayerIndex + 1} flipped ${piece.color} ${piece.type}`;

    // 2. Assign colors if not yet assigned
    let newColors = { ...playerColors };
    if (playerColors[0] === null) {
      const p1Color = piece.color;
      const p2Color = piece.color === 'red' ? 'black' : 'red';
      newColors = { 0: p1Color, 1: p2Color };
      setPlayerColors(newColors);
      logMsg += `. P1 is ${p1Color.toUpperCase()}.`;
    }

    addLog(logMsg);
    
    // Switch turn
    setCurrentPlayerIndex(prev => prev === 0 ? 1 : 0);
  };

  const executeMove = (piece: Piece, to: Position) => {
    const targetPiece = pieces.find(p => !p.dead && !p.dying && p.position.r === to.r && p.position.c === to.c);
    
    // If it's a capture, trigger the Kill Screen Animation FIRST
    if (targetPiece) {
        setKillAnimData({ attacker: piece, victim: targetPiece });
        
        // Wait for animation duration (1.8s) before updating the board
        setTimeout(() => {
            setKillAnimData(null);
            performBoardUpdate(piece, to, targetPiece);
        }, 1800);
    } else {
        // Normal move
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
    
    const moveLog = `${piece.type} -> (${to.r},${to.c})`;
    const captureLog = targetPiece ? ` captures ${targetPiece.type}` : '';
    addLog(`Player ${currentPlayerIndex + 1} (${playerColors[currentPlayerIndex]}): ${moveLog}${captureLog}`);

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
            addLog(`GAME OVER! Player ${currentPlayerIndex + 1} Wins (Elimination)!`);
            return; 
        }
    }

    setCurrentPlayerIndex(prev => prev === 0 ? 1 : 0);
  };

  const handleSurrender = () => {
    if (winner !== null) return;
    const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
    setWinner(opponentIndex);
    addLog(`Player ${currentPlayerIndex + 1} Surrendered. Player ${opponentIndex + 1} Wins!`);
  };

  const resetGame = () => {
      setPieces(generateNewGamePieces());
      setCurrentPlayerIndex(0);
      setPlayerColors({ 0: null, 1: null });
      setSelectedPieceId(null);
      setLastMove(null);
      setWinner(null);
      setKillAnimData(null);
      setLogs(["Game Restarted: Player 1 to flip."]);
  };

  // Helper to render graveyard pieces
  const renderGraveyard = (color: PlayerColor) => {
    const deadPieces = pieces.filter(p => p.dead && p.color === color).sort((a, b) => b.rank - a.rank);
    return (
      <div className="flex flex-wrap gap-1 bg-black/10 p-2 rounded-lg min-h-[3rem] items-center">
        {deadPieces.length === 0 && <span className="text-xs text-gray-500 italic px-2">No casualties</span>}
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

  return (
    <div className="min-h-screen bg-[#f0e4d4] flex flex-col items-center justify-center p-4 font-serif text-[#3e2723]">
      
      {/* Full Screen Kill Animation Overlay */}
      {killAnimData && (
        <KillScreen attacker={killAnimData.attacker} victim={killAnimData.victim} />
      )}

      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8 items-start justify-center">
        
        {/* Game Area */}
        <div className="flex-1 w-full flex flex-col items-center max-w-[640px]">
            {/* Header / HUD */}
            <div className="w-full flex justify-between items-center mb-4 bg-white/60 p-4 rounded-lg shadow">
                <div className={`flex flex-col items-center p-2 rounded w-32 transition-all ${currentPlayerIndex === 0 ? 'bg-amber-200 ring-4 ring-amber-600 scale-105' : 'opacity-70'}`}>
                    <span className="font-bold text-lg">Player 1</span>
                    <span className="text-sm uppercase font-bold text-gray-600">
                        {playerColors[0] ? playerColors[0] : '?'}
                    </span>
                </div>

                <div className="text-2xl font-bold text-amber-900 tracking-wider">
                    VS
                </div>

                <div className={`flex flex-col items-center p-2 rounded w-32 transition-all ${currentPlayerIndex === 1 ? 'bg-amber-200 ring-4 ring-amber-600 scale-105' : 'opacity-70'}`}>
                    <span className="font-bold text-lg">Player 2</span>
                    <span className="text-sm uppercase font-bold text-gray-600">
                        {playerColors[1] ? playerColors[1] : '?'}
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
                   <span className="text-xs font-bold text-red-800 uppercase">Red Lost</span>
                   {renderGraveyard('red')}
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-xs font-bold text-black uppercase">Black Lost</span>
                   {renderGraveyard('black')}
                </div>
            </div>

            {winner !== null && (
                <div className="mt-6 p-6 bg-yellow-400 text-yellow-900 rounded-xl text-3xl font-bold animate-bounce shadow-2xl border-4 border-yellow-600 z-50">
                    🏆 PLAYER {winner + 1} WINS! 🏆
                </div>
            )}
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-72 flex flex-col gap-4">
            <div className="bg-white/80 p-4 rounded-lg shadow-lg h-96 overflow-hidden flex flex-col border border-[#d7ccc8]">
                <h3 className="text-amber-900 font-bold border-b-2 border-amber-200 pb-2 mb-2 flex justify-between">
                    <span>Game Logs</span>
                    <span className="text-xs font-normal pt-1 opacity-50">Latest first</span>
                </h3>
                <div className="flex-1 overflow-y-auto text-xs font-mono space-y-2 pr-1 custom-scrollbar">
                    {logs.map((l, i) => (
                        <div key={i} className="text-gray-800 bg-amber-50/50 p-1 rounded">
                            <span className="text-amber-700 font-bold mr-2">#{logs.length - i}</span>
                            {l}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <button 
                    onClick={resetGame}
                    className="w-full bg-amber-800 text-white py-3 rounded-lg shadow-lg hover:bg-amber-900 transition-all font-bold text-lg border-b-4 border-amber-950 active:border-b-0 active:translate-y-1 active:shadow-inner"
                >
                    New Game
                </button>
                <button 
                    onClick={handleSurrender}
                    disabled={winner !== null}
                    className="w-full bg-red-100 text-red-900 py-3 rounded-lg shadow hover:bg-red-200 transition-all font-bold border-2 border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Surrender
                </button>
            </div>
            
            <div className="bg-[#fff8e1] p-4 rounded-lg text-xs text-amber-900 border border-amber-200 shadow-sm">
                <p className="font-bold mb-2 text-base border-b border-amber-200 pb-1">Rules</p>
                <ul className="list-disc pl-4 space-y-1 leading-relaxed">
                    <li>Flip any hidden piece on your turn.</li>
                    <li>First flip decides your color.</li>
                    <li>Move 1 step orthogonally.</li>
                    <li>Capture by rank: King > Adv > Ele > Rook > Horse > Pawn.</li>
                    <li><strong>Exception:</strong> Pawn captures King.</li>
                    <li><strong>Cannon:</strong> Jumps exactly 1 piece to capture.</li>
                    <li><strong>Lose Condition:</strong> No pieces left, No moves, or Surrender.</li>
                </ul>
            </div>
        </div>

      </div>
    </div>
  );
};

export default App;