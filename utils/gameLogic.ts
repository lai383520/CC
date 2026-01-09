import { Piece, Position, PlayerColor } from '../types';
import { PIECE_RANKS, ROWS, COLS } from '../constants';

export const isSamePosition = (p1: Position, p2: Position) => p1.r === p2.r && p1.c === p2.c;

export const getPieceAt = (pieces: Piece[], pos: Position): Piece | undefined => {
  // Ignore pieces that are dead OR currently dying (animation playing)
  return pieces.find(p => !p.dead && !p.dying && isSamePosition(p.position, pos));
};

export const canSelectPiece = (piece: Piece, playerColor: 'red' | 'black' | null): boolean => {
  if (!piece.revealed) return false;
  if (!playerColor) return false; 
  return piece.color === playerColor;
};

// Check if positions are adjacent (orthogonal)
const isAdjacent = (p1: Position, p2: Position): boolean => {
  const dr = Math.abs(p1.r - p2.r);
  const dc = Math.abs(p1.c - p2.c);
  return (dr + dc) === 1;
};

// Count obstacles between two points in a straight line
const countObstacles = (pieces: Piece[], from: Position, to: Position): number => {
  if (from.r !== to.r && from.c !== to.c) return -1; // Not linear
  
  let count = 0;
  const dr = Math.sign(to.r - from.r);
  const dc = Math.sign(to.c - from.c);
  
  let currR = from.r + dr;
  let currC = from.c + dc;
  
  while (currR !== to.r || currC !== to.c) {
    if (getPieceAt(pieces, { r: currR, c: currC })) {
      count++;
    }
    currR += dr;
    currC += dc;
  }
  return count;
};

export const isValidMove = (pieces: Piece[], piece: Piece, to: Position): boolean => {
  // 1. Basic bounds
  if (to.r < 0 || to.r >= ROWS || to.c < 0 || to.c >= COLS) return false;

  const target = getPieceAt(pieces, to);

  // 2. Logic based on piece type
  if (piece.type === 'cannon') {
    // Cannon Movement (Non-capture): Adjacent empty
    if (!target) {
      return isAdjacent(piece.position, to);
    }
    // Cannon Capture: Jump over exactly 1 piece (revealed or hidden)
    if (target.revealed && target.color !== piece.color) {
       // Must be linear
       if (piece.position.r !== to.r && piece.position.c !== to.c) return false;
       const obstacles = countObstacles(pieces, piece.position, to);
       return obstacles === 1;
    }
    return false;
  } else {
    // Regular Pieces
    // Must be adjacent
    if (!isAdjacent(piece.position, to)) return false;

    // If empty, valid move
    if (!target) return true;

    // If occupied
    if (!target.revealed) return false; // Cannot capture unrevealed
    if (target.color === piece.color) return false; // Cannot capture own

    // Hierarchy Check
    // Soldier(1) captures General(7)
    if (piece.type === 'soldier' && target.type === 'general') return true;
    // General cannot capture Soldier
    if (piece.type === 'general' && target.type === 'soldier') return false;
    
    // Normal Rank Check
    return piece.rank >= target.rank;
  }
};

export const boardToText = (pieces: Piece[]): string => {
  let boardStr = "";
  const typeMap: Record<string, string> = {
    'general': 'K', 'advisor': 'A', 'elephant': 'E', 'chariot': 'R', 'horse': 'H', 'cannon': 'C', 'soldier': 'P'
  };

  for (let r = 0; r < ROWS; r++) {
    let rowStr = "";
    for (let c = 0; c < COLS; c++) {
      const piece = getPieceAt(pieces, { r, c });
      if (!piece) {
        rowStr += ". ";
      } else if (!piece.revealed) {
        rowStr += "? ";
      } else {
        let char = typeMap[piece.type] || 'X';
        if (piece.color === 'black') char = char.toLowerCase();
        rowStr += char + " ";
      }
    }
    boardStr += rowStr.trim() + "\n";
  }
  return boardStr;
};

// Check if a player has any valid moves left (including flipping)
export const checkHasValidMoves = (pieces: Piece[], playerColor: PlayerColor): boolean => {
    // 1. Can flip? (If there are any hidden pieces, yes)
    const hasHiddenPieces = pieces.some(p => !p.dead && !p.revealed && !p.dying);
    if (hasHiddenPieces) return true;

    // 2. Can move any piece?
    const myPieces = pieces.filter(p => !p.dead && !p.dying && p.revealed && p.color === playerColor);
    
    for (const piece of myPieces) {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (isValidMove(pieces, piece, { r, c })) {
                    return true;
                }
            }
        }
    }

    return false;
};