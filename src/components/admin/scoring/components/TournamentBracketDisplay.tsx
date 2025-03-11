import React, { useState } from 'react';
import { Box, Typography, Paper, Dialog, useTheme, Tooltip, IconButton } from '@mui/material';
import { SingleEliminationBracket, SVGViewer } from '@g-loot/react-tournament-brackets';
import { Sport, Match } from '../../../../types';
import { useTranslation } from 'react-i18next';
import MatchQuickEditDialog from './MatchQuickEditDialog';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

interface TournamentBracketDisplayProps {
  matches: any[];
  sport: Sport;
  onMatchUpdate?: (match: Match) => void;
  isEditable?: boolean;
}

const TournamentBracketDisplay: React.FC<TournamentBracketDisplayProps> = ({
  matches,
  sport,
  onMatchUpdate,
  isEditable = false
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [hoveredMatchId, setHoveredMatchId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'compact' | 'detailed'>('detailed');

  const handleMatchClick = (matchData: any) => {
    if (!isEditable) return;
    
    const match = sport.matches.find(m => m.id === matchData.id);
    if (match) {
      setSelectedMatch(match);
      setEditDialogOpen(true);
    }
  };

  const calculateBracketSize = () => {
    const roundCount = Math.max(...matches.map(m => parseInt(m.tournamentRoundText)));
    const matchCount = matches.length;
    
    return {
      width: displayMode === 'compact' 
        ? Math.max(800, roundCount * 250)
        : Math.max(1000, roundCount * 320),
      height: displayMode === 'compact'
        ? Math.max(300, matchCount * 60)
        : Math.max(400, matchCount * 80)
    };
  };

  const highlightConnectedMatches = (matchId: string) => {
    // 関連する試合をハイライト
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    // 前の試合を取得
    const previousMatches = matches.filter(m => 
      m.nextMatchId === matchId
    );

    // 次の試合を取得
    const nextMatch = matches.find(m => 
      m.id === match.nextMatchId
    );

    return {
      previousMatchIds: previousMatches.map(m => m.id),
      nextMatchId: nextMatch?.id
    };
  };

  const { width, height } = calculateBracketSize();

  return (
    <Paper sx={{ p: 2, overflowX: 'auto' }}>
      <Box sx={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2
      }}>
        <Typography variant="h6">
          {t('tournament.bracket')}
        </Typography>
        <Box>
          <Tooltip title={t('tournament.displayMode')}>
            <IconButton
              onClick={() => setDisplayMode(prev => 
                prev === 'compact' ? 'detailed' : 'compact'
              )}
            >
              {displayMode === 'compact' ? <FullscreenIcon /> : <FullscreenExitIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ 
        minHeight: height,
        position: 'relative'
      }}>
        <SingleEliminationBracket
          matches={matches}
          matchComponent={({
            match,
            onMatchClick,
            topParty,
            bottomParty,
            ...props
          }) => (
            <foreignObject
              x={props.x - props.width / 2}
              y={props.y - props.height / 2}
              width={props.width}
              height={props.height}
            >
              <Box
                onClick={() => handleMatchClick(match)}
                sx={{
                  width: '100%',
                  height: '100%',
                  cursor: isEditable ? 'pointer' : 'default',
                  '&:hover': isEditable ? {
                    boxShadow: 3,
                    transform: 'scale(1.02)',
                    transition: 'all 0.2s'
                  } : {}
                }}
              >
                <Paper
                  elevation={2}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}
                >
                  <Box sx={{ 
                    p: 1, 
                    bgcolor: theme.palette.grey[100],
                    borderBottom: `1px solid ${theme.palette.divider}`
                  }}>
                    <Typography variant="caption" noWrap>
                      {match.name}
                    </Typography>
                  </Box>
                  
                  {[topParty, bottomParty].map((party, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        bgcolor: party.isWinner ? theme.palette.success.light : 'transparent',
                        borderBottom: idx === 0 ? `1px solid ${theme.palette.divider}` : 'none',
                        opacity: party.name === t('tournament.tbd') ? 0.5 : 1
                      }}
                    >
                      <Typography 
                        variant="body2" 
                        noWrap 
                        sx={{ 
                          flexGrow: 1,
                          fontWeight: party.isWinner ? 'bold' : 'normal'
                        }}
                      >
                        {party.name}
                      </Typography>
                      <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>
                        {party.score !== null ? party.score : '-'}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              </Box>
            </foreignObject>
          )}
          svgWrapper={({ children, ...props }) => (
            <SVGViewer
              width={width}
              height={height}
              background={theme.palette.background.paper}
              SVGBackground={theme.palette.background.paper}
              {...props}
            >
              {children}
            </SVGViewer>
          )}
          options={{
            style: {
              roundHeader: {
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                fontWeight: 'bold'
              },
              connectorColor: theme.palette.divider,
              connectorColorHighlight: theme.palette.primary.main
            }
          }}
        />
      </Box>

      {isEditable && selectedMatch && (
        <MatchQuickEditDialog
          open={editDialogOpen}
          match={selectedMatch}
          sport={sport}
          onClose={() => setEditDialogOpen(false)}
          onSave={(updatedMatch) => {
            if (onMatchUpdate) {
              onMatchUpdate(updatedMatch);
            }
            setEditDialogOpen(false);
          }}
        />
      )}
    </Paper>
  );
};

export default TournamentBracketDisplay;
