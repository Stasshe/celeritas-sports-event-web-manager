declare module '@g-loot/react-tournament-brackets' {
  export interface Participant {
    id: string;
    name: string;
    status?: string | null;
    score?: number | null;
    isWinner?: boolean;
  }

  export interface Match {
    id: string;
    name?: string;
    nextMatchId: string | null;
    tournamentRoundText: string;
    startTime: string;
    state: 'DONE' | 'PLAYING' | 'SCHEDULED' | 'NO_SHOW' | 'WALK_OVER';
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
          fontWeight?: string | 'normal' | 'bold' | 'lighter' | 'bolder';
        };
        connectorColor?: string;
        connectorColorHighlight?: string;
        matchBackground?: {
          wonColor?: string;
          lostColor?: string;
        };
      };
    };
  }

  export const SingleEliminationBracket: React.FC<SingleEliminationBracketProps>;

  export interface SVGViewerProps {
    width: number;
    height: number;
    children: React.ReactNode;
    background?: string;
    SVGBackground?: string;
    offsetX?: number;
    offsetY?: number;
  }

  export const SVGViewer: React.FC<SVGViewerProps>;
}