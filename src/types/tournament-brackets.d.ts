declare module '@g-loot/react-tournament-brackets' {
  export interface Participant {
    id: string;
    name: string;
    status?: 'no-team' | 'waiting' | null;  // 型を具体的に指定
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
    svgWrapper?: React.ComponentType<SVGWrapperProps>;
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
    customStyle?: {
      backgroundColor?: string;
      roundBackground?: string;
      textColor?: string;
      scoreBackground?: string;
      winnerBackground?: string;
      roundHeader?: {
        backgroundColor?: string;
        color?: string;
      };
      connectorColor?: string;
      connectorColorHighlight?: string;
    };
  }

  export const SingleEliminationBracket: React.FC<SingleEliminationBracketProps>;

  export interface SVGWrapperProps {
    children: React.ReactNode;
    bracketWidth: number;
    bracketHeight: number;
    startAt?: [number, number];
  }

  export interface SVGViewerProps extends SVGWrapperProps {
    width: number;
    height: number;
    background?: string;
    SVGBackground?: string;
    style?: React.CSSProperties;
    miniatureProps?: {
      position: 'none' | 'left' | 'right';
    };
  }

  export const SVGViewer: React.FC<SVGViewerProps>;
}
