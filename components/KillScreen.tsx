import React from 'react';
import { Piece, PieceType } from '../types';
import { PIECE_CHARS, PIECE_RANKS } from '../constants';

interface KillScreenProps {
  attacker: Piece;
  victim: Piece;
}

const KillScreen: React.FC<KillScreenProps> = ({ attacker, victim }) => {
  const attackerChar = PIECE_CHARS[`${attacker.color}_${attacker.type}`];
  const victimChar = PIECE_CHARS[`${victim.color}_${victim.type}`];
  
  const isRedAttacker = attacker.color === 'red';
  
  // Check for "Underdog" scenario (Soldier kills General)
  const isUnderdog = attacker.type === 'soldier' && victim.type === 'general';

  // --- Configuration Factory ---
  const getTheme = () => {
    if (isUnderdog) {
      return {
        bg: 'bg-black',
        textColor: 'text-white',
        title: '逆天改命',      // REVOLUTION
        subTitle: '下剋上',     // LIMIT BREAK
        effectContainer: 'animate-heavy-shake',
        charEffect: 'animate-glitch scale-150 text-red-600',
        victimEffect: 'opacity-50 grayscale blur-sm'
      };
    }

    switch (attacker.type) {
      case 'general':
        return {
          bg: isRedAttacker ? 'bg-yellow-900/95' : 'bg-slate-900/95',
          textColor: 'text-yellow-400',
          title: '天子一怒',      // EMPEROR'S WRATH
          subTitle: '龍吟鎮殺',   // EXECUTION
          effectContainer: 'animate-dragon',
          charEffect: 'drop-shadow-[0_0_30px_rgba(255,215,0,0.6)]',
          victimEffect: 'scale-90 opacity-60 grayscale'
        };
      case 'advisor':
        return {
          bg: 'bg-emerald-950/95',
          textColor: 'text-emerald-400',
          title: '影衛殺陣',      // SHADOW ARTS
          subTitle: '瞬殺',       // ASSASSINATION
          effectContainer: '',
          charEffect: 'opacity-90 blur-[0.5px]', // Stealthy look
          victimEffect: 'opacity-60 scale-x-110 skew-x-12' // Distorted
        };
      case 'elephant':
        return {
          bg: 'bg-stone-800/95',
          textColor: 'text-stone-300',
          title: '神象威嚴',      // COLOSSAL
          subTitle: '撼地踐踏',   // EARTHQUAKE
          effectContainer: 'animate-heavy-shake',
          charEffect: 'scale-125', // Big
          victimEffect: 'scale-y-50 translate-y-10 opacity-70' // Flattened
        };
      case 'chariot':
        return {
          bg: 'bg-orange-950/95',
          textColor: 'text-orange-500',
          title: '縱橫馳騁',      // INFERNO
          subTitle: '烈火戰輪',   // OVERDRIVE
          effectContainer: '', // Effect handled in background render
          charEffect: 'skew-x-[-10deg]', // Fast look
          victimEffect: 'opacity-0' // Blown away
        };
      case 'horse':
        return {
          bg: 'bg-violet-950/95',
          textColor: 'text-violet-400',
          title: '八面奔雷',      // THUNDER HOOF
          subTitle: '迴旋踢',     // TRAMPLE
          effectContainer: 'animate-trample',
          charEffect: '',
          victimEffect: 'rotate-180 opacity-60' // Kicked upside down
        };
      case 'cannon':
        return {
          bg: 'bg-amber-950/95',
          textColor: 'text-amber-500',
          title: '雷霆重砲',      // ARTILLERY
          subTitle: '隔山滅卻',   // ANNIHILATION
          effectContainer: '',
          charEffect: '',
          victimEffect: 'opacity-0' // Vaporized
        };
      case 'soldier':
      default:
        return {
          bg: isRedAttacker ? 'bg-red-950/95' : 'bg-gray-900/95',
          textColor: 'text-red-200',
          title: '過河死士',      // VANGUARD
          subTitle: '一擊必殺',   // STRIKE
          effectContainer: 'animate-thrust',
          charEffect: '',
          victimEffect: 'opacity-50 rotate-12'
        };
    }
  };

  const theme = getTheme();

  // --- Background/Foreground Effects Render ---
  const renderSpecialEffects = () => {
    if (isUnderdog) {
      return (
        <>
          <div className="absolute inset-0 bg-red-600/20 animate-pulse mix-blend-overlay"></div>
          <div className="absolute top-0 w-full h-[2px] bg-white animate-glitch opacity-50"></div>
          <div className="absolute bottom-0 w-full h-[2px] bg-white animate-glitch opacity-50" style={{ animationDelay: '0.1s'}}></div>
        </>
      );
    }

    switch (attacker.type) {
      case 'general':
        return (
          <>
             {/* Dragon Aura */}
             <div className="absolute w-[800px] h-[800px] rounded-full border-[1px] border-yellow-500/30 animate-dragon opacity-50"></div>
             <div className="absolute w-[600px] h-[600px] rounded-full border-[2px] border-yellow-500/20 animate-dragon opacity-70" style={{ animationDelay: '0.2s'}}></div>
          </>
        );
      case 'advisor':
        return (
          <>
            {/* Cross Slash */}
            <div className="absolute w-[150%] h-[20px] bg-emerald-400 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 animate-slash-l shadow-[0_0_20px_#34d399]"></div>
            <div className="absolute w-[150%] h-[20px] bg-emerald-400 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 animate-slash-r shadow-[0_0_20px_#34d399]" style={{ animationDelay: '0.1s' }}></div>
          </>
        );
      case 'chariot':
        return (
          <div className="absolute inset-0 flex items-center justify-center animate-fire-rush opacity-80">
            {/* Speed Lines / Fire Trail */}
            <div className="w-full h-64 bg-gradient-to-r from-transparent via-orange-600 to-transparent skew-x-[-30deg] blur-md"></div>
          </div>
        );
      case 'cannon':
        return (
            // Radial Blast
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-amber-500 animate-blast box-border z-0"></div>
        );
      case 'horse':
        return (
             // Impact dust
             <div className="absolute bottom-1/4 w-full h-32 bg-gradient-to-t from-violet-900/50 to-transparent animate-pulse"></div>
        );
      case 'elephant':
         return (
            // Cracks
            <div className="absolute inset-0 border-[50px] border-stone-700/50 animate-pulse"></div>
         );
      case 'soldier':
        return (
           // Sharp scratch lines
           <div className="absolute w-screen h-[2px] bg-white/30 top-1/2 rotate-12 animate-thrust"></div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden animate-bg-flash ${theme.bg} backdrop-blur-md`}>
      
      {renderSpecialEffects()}

      {/* Content Container */}
      <div className={`relative z-10 flex flex-col items-center gap-6 ${theme.effectContainer}`}>
        
        {/* Attacker Section */}
        <div className="flex flex-col items-center animate-slam" style={{ animationDelay: '0.1s' }}>
          <div className={`text-9xl font-black ${theme.textColor} ${theme.charEffect} transition-all duration-300`}>
            {attackerChar}
          </div>
          <div className={`text-5xl font-black tracking-[0.2em] text-white mt-6 uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] border-b-4 border-white/20 pb-2`}>
            {theme.title}
          </div>
        </div>

        {/* VS / Interaction */}
        <div className="flex items-center justify-center h-16 w-full">
            <span className="text-white/40 italic font-serif text-3xl tracking-[0.5em] animate-pulse">
                {theme.subTitle}
            </span>
        </div>

        {/* Victim Section */}
        <div className="flex flex-col items-center animate-slam" style={{ animationDelay: '0.2s' }}>
          <div className={`text-7xl font-bold text-white/20 ${theme.victimEffect} transition-all duration-500`}>
            {victimChar}
          </div>
          <div className="text-xl font-bold tracking-[0.5em] text-red-500/70 mt-4 uppercase line-through decoration-4">
            擊破
          </div>
        </div>

      </div>

      {/* Footer / Flavor Text */}
      <div className="absolute bottom-12 w-full text-center">
         <div className="text-white/10 text-[12rem] font-black leading-none opacity-10 select-none pointer-events-none animate-pulse">
            絕殺
         </div>
      </div>

    </div>
  );
};

export default KillScreen;