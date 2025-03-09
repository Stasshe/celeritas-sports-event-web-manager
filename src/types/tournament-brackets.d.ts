declare module '@g-loot/react-tournament-brackets' {
  export interface Participant {
    id: string;
    name: string;
    score?: number;
  }

  export interface Match {
    id: string;
    name?: string;
    nextMatchId: string | null;
    tournamentRoundText: string;
    startTime: string;
    state: 'DONE' | 'SCHEDULED';
    participants: Participant[];
  }

  export interface SingleEliminationBracketProps {
    matches: Match[];
    matchComponent?: React.ComponentType<any>;
    svgWrapper?: React.ComponentType<any>;
    options?: {
      style?: {
        roundHeader?: {
          backgroundColor?: string;
          color?: string;
        };
        connectorColor?: string;
        connectorColorHighlight?: string;
      };
    };
  }

  export const SingleEliminationBracket: React.FC<SingleEliminationBracketProps>;
}