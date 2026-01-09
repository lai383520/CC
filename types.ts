export type PieceType = 'general' | 'advisor' | 'elephant' | 'chariot' | 'horse' | 'cannon' | 'soldier';
export type PlayerColor = 'red' | 'black';

export interface Position {
  r: number; // 0-3
  c: number; // 0-7
}

export interface Piece {
  id: string;
  type: PieceType;
  color: PlayerColor;
  position: Position;
  revealed: boolean;
  dead: boolean;
  dying?: boolean; // New state for animation
  rank: number;
}

export interface Move {
  from: Position;
  to: Position;
}

export interface GameState {
  pieces: Piece[];
  currentPlayerIndex: number; // 0 or 1
  playerColors: { [key: number]: PlayerColor | null }; // 0: 'red', 1: 'black' etc.
  selectedPieceId: string | null;
  lastMove: Move | null;
  winner: number | null; // 0 or 1
  logs: string[];
}