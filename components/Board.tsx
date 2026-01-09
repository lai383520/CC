import React from 'react';
import { Piece, Move } from '../types';
import { PIECE_CHARS, ROWS, COLS } from '../constants';

interface BoardProps {
  pieces: Piece[];
  selectedPieceId: string | null;
  lastMove: Move | null;
  onSquareClick: (r: number, c: number) => void;
  currentPlayerColor: 'red' | 'black' | null;
}

const Board: React.FC<BoardProps> = ({ pieces, selectedPieceId, lastMove, onSquareClick }) => {
  
  // Get all pieces at a specific position (could be an active piece AND a dying piece)
  const getPiecesAtPos = (r: number, c: number) => {
    return pieces.filter(p => !p.dead && p.position.r === r && p.position.c === c);
  };

  return (
    <div className="relative p-2 bg-[#dcb482] shadow-2xl rounded border-8 border-[#8d6e63]">
        {/* Grid Container */}
        <div 
          className="grid gap-1"
          style={{ 
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
            width: 'min(95vw, 640px)',
            aspectRatio: '2/1' 
          }}
        >
            {Array.from({ length: ROWS }).map((_, r) => 
                Array.from({ length: COLS }).map((_, c) => {
                    const cellPieces = getPiecesAtPos(r, c);
                    // Find the "active" (not dying) piece for selection logic
                    const activePiece = cellPieces.find(p => !p.dying);
                    
                    const isSelected = activePiece && selectedPieceId === activePiece.id;
                    const isLastMoveSrc = lastMove && lastMove.from.r === r && lastMove.from.c === c;
                    const isLastMoveDst = lastMove && lastMove.to.r === r && lastMove.to.c === c;
                    
                    return (
                        <div 
                            key={`${r}-${c}`} 
                            className={`
                                relative flex items-center justify-center
                                rounded bg-[#e6ceac] border border-[#bcaaa4]
                                cursor-pointer hover:bg-[#ebdccc] transition-colors
                                ${isLastMoveSrc || isLastMoveDst ? 'bg-yellow-200/50' : ''}
                            `}
                            onClick={() => onSquareClick(r, c)}
                        >
                            {/* Render all pieces in this cell (active and dying) */}
                            {cellPieces.map(piece => (
                                <div 
                                    // Key change: use revealed status in key to force re-mount and trigger flip animation
                                    key={`${piece.id}-${piece.revealed}`}
                                    className={`
                                        absolute
                                        w-[85%] h-[85%] rounded-full shadow-lg
                                        flex items-center justify-center select-none
                                        transition-all duration-300
                                        ${piece.revealed ? 'animate-flip' : ''}
                                        ${piece.dying ? 'animate-abyss' : ''} 
                                        ${!piece.revealed 
                                            ? 'bg-gradient-to-br from-[#5d4037] to-[#3e2723] border-2 border-[#8d6e63]' 
                                            : piece.color === 'red'
                                                ? 'bg-[#f4e4d4] border-2 border-red-700 text-red-700'
                                                : 'bg-[#f4e4d4] border-2 border-black text-black'
                                        }
                                        ${isSelected && !piece.dying ? 'ring-4 ring-blue-400 scale-105 z-20' : ''}
                                        ${piece.dying ? 'z-10' : 'z-10'}
                                    `}
                                >
                                    {!piece.revealed ? (
                                        // Back of piece design
                                        <div className="w-[70%] h-[70%] rounded-full border border-[#8d6e63] opacity-30"></div>
                                    ) : (
                                        // Revealed piece
                                        <div className="text-2xl md:text-3xl font-bold font-serif">
                                            {PIECE_CHARS[`${piece.color}_${piece.type}`]}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })
            )}
        </div>
    </div>
  );
};

export default Board;