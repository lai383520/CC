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
  
  // Calculate position styles based on Grid coordinates
  const getPieceStyle = (r: number, c: number) => ({
    left: `${(c / COLS) * 100}%`,
    top: `${(r / ROWS) * 100}%`,
    width: `${100 / COLS}%`,
    height: `${100 / ROWS}%`,
  });

  return (
    <div className="relative bg-[#dcb482] shadow-2xl rounded border-8 border-[#8d6e63] select-none overflow-hidden"
         style={{ 
            width: 'min(95vw, 640px)',
            aspectRatio: '2/1' 
         }}>
         
        {/* 1. Background Grid (Wood Texture & Click Targets) */}
        <div 
          className="absolute inset-0 grid"
          style={{ 
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
          }}
        >
            {Array.from({ length: ROWS }).map((_, r) => 
                Array.from({ length: COLS }).map((_, c) => {
                    const isLastMoveSrc = lastMove && lastMove.from.r === r && lastMove.from.c === c;
                    const isLastMoveDst = lastMove && lastMove.to.r === r && lastMove.to.c === c;

                    return (
                        <div 
                            key={`cell-${r}-${c}`} 
                            className={`
                                relative border border-[#bcaaa4]
                                cursor-pointer hover:bg-[#ebdccc] transition-colors
                                ${isLastMoveSrc || isLastMoveDst ? 'bg-yellow-200/50' : 'bg-[#e6ceac]'}
                            `}
                            onClick={() => onSquareClick(r, c)}
                        >
                            {/* Inner highlight for last move */}
                            {(isLastMoveSrc || isLastMoveDst) && (
                                <div className="absolute inset-0 animate-pulse bg-yellow-400/20"></div>
                            )}
                        </div>
                    );
                })
            )}
        </div>

        {/* 2. Pieces Layer (Absolute Positioning for Smooth Transitions) */}
        <div className="absolute inset-0 pointer-events-none">
            {pieces.map(piece => {
                const isSelected = selectedPieceId === piece.id;
                
                // Keep dying pieces for the kill animation (controlled by 'dying' prop)
                if (piece.dead) return null;

                return (
                    <div
                        key={piece.id}
                        className={`
                            absolute flex items-center justify-center
                            transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
                            ${piece.dying ? 'z-50' : isSelected ? 'z-40' : 'z-10'}
                        `}
                        style={{
                            ...getPieceStyle(piece.position.r, piece.position.c),
                        }}
                    >
                         {/* Piece Circle */}
                         <div 
                            // Re-enable pointer events for the piece itself so we can click it
                            className={`
                                pointer-events-auto cursor-pointer
                                w-[85%] h-[85%] rounded-full shadow-lg
                                flex items-center justify-center
                                transition-transform duration-300
                                ${piece.revealed && !piece.dying ? 'animate-flip' : ''}
                                ${piece.dying ? 'animate-shatter' : ''} 
                                ${!piece.revealed 
                                    ? 'bg-gradient-to-br from-[#5d4037] to-[#3e2723] border-2 border-[#8d6e63] shadow-inner' 
                                    : piece.color === 'red'
                                        ? 'bg-[#f4e4d4] border-2 border-red-800 text-red-800 font-black'
                                        : 'bg-[#f4e4d4] border-2 border-black text-black font-black'
                                }
                                ${isSelected && !piece.dying ? 'ring-4 ring-amber-400 scale-110 shadow-xl -translate-y-1' : 'hover:scale-105'}
                            `}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent double triggering if we had click on cell
                                onSquareClick(piece.position.r, piece.position.c);
                            }}
                        >
                             {/* Inner Ring / Content */}
                             {!piece.revealed ? (
                                <div className="w-[70%] h-[70%] rounded-full border border-[#8d6e63]/50 flex items-center justify-center opacity-30">
                                    <div className="w-[80%] h-[80%] rounded-full border border-[#8d6e63]/30"></div>
                                </div>
                            ) : (
                                <div className="relative flex items-center justify-center w-full h-full">
                                    {/* Inner engraved ring */}
                                    <div className="absolute inset-1 rounded-full border border-current opacity-20"></div>
                                    <span className="text-2xl md:text-3xl font-serif z-10 drop-shadow-sm pb-1">
                                        {PIECE_CHARS[`${piece.color}_${piece.type}`]}
                                    </span>
                                </div>
                            )}
                         </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default Board;
