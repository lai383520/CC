import { Piece, PieceType, PlayerColor, Position } from './types';

export const ROWS = 4;
export const COLS = 8;

// Banqi Hierarchy: 
// General(7) > Advisor(6) > Elephant(5) > Chariot(4) > Horse(3) > Soldier(1)
// Special: Soldier(1) captures General(7)
// Cannon is special (needs jump)
export const PIECE_RANKS: Record<PieceType, number> = {
  general: 7,
  advisor: 6,
  elephant: 5,
  chariot: 4,
  horse: 3,
  cannon: 2, // Arbitrary for comparison, logic handled separately
  soldier: 1,
};

export const PIECE_CHARS: Record<string, string> = {
  'red_general': '帥', 'black_general': '將',
  'red_advisor': '仕', 'black_advisor': '士',
  'red_elephant': '相', 'black_elephant': '象',
  'red_horse': '傌', 'black_horse': '馬',
  'red_chariot': '俥', 'black_chariot': '車',
  'red_cannon': '炮', 'black_cannon': '砲',
  'red_soldier': '兵', 'black_soldier': '卒',
};

// Helper to shuffle array
const shuffle = <T>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export const generateNewGamePieces = (): Piece[] => {
  const definitions: { type: PieceType, color: PlayerColor, count: number }[] = [
    { type: 'general', color: 'red', count: 1 },
    { type: 'advisor', color: 'red', count: 2 },
    { type: 'elephant', color: 'red', count: 2 },
    { type: 'chariot', color: 'red', count: 2 },
    { type: 'horse', color: 'red', count: 2 },
    { type: 'cannon', color: 'red', count: 2 },
    { type: 'soldier', color: 'red', count: 5 },
    { type: 'general', color: 'black', count: 1 },
    { type: 'advisor', color: 'black', count: 2 },
    { type: 'elephant', color: 'black', count: 2 },
    { type: 'chariot', color: 'black', count: 2 },
    { type: 'horse', color: 'black', count: 2 },
    { type: 'cannon', color: 'black', count: 2 },
    { type: 'soldier', color: 'black', count: 5 },
  ];

  let rawPieces: Omit<Piece, 'position' | 'id'>[] = [];
  definitions.forEach(def => {
    for (let i = 0; i < def.count; i++) {
      rawPieces.push({
        type: def.type,
        color: def.color,
        revealed: false,
        dead: false,
        rank: PIECE_RANKS[def.type]
      });
    }
  });

  rawPieces = shuffle(rawPieces);

  const pieces: Piece[] = [];
  let idx = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      pieces.push({
        ...rawPieces[idx],
        id: `piece_${idx}`,
        position: { r, c }
      });
      idx++;
    }
  }

  return pieces;
};