declare module 'react-bracket' {
  export interface Team {
    id: string;
    name: string;
    score?: number;
  }

  export interface Seed {
    id: string;
    date: string;
    teams: Team[];
    winnerIdx?: number;
  }

  export interface Round {
    title: string;
    seeds: Seed[];
  }

  export interface BracketProps {
    rounds: Round[];
    renderSeedComponent: (seed: Seed, roundIdx: number, seedIdx: number) => React.ReactNode;
    roundTitleComponent: (title: string, roundIdx: number) => React.ReactNode;
    lineInfo?: {
      color: string;
      thickness: number;
    };
  }

  export const Bracket: React.FC<BracketProps>;
}
