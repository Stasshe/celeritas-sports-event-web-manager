import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, Typography, Theme } from '@mui/material';
import { useThemeContext } from '../../contexts/ThemeContext';

interface RulesDisplayProps {
  rules: string;
}

/**
 * ルール表示コンポーネント
 * マークダウン形式のルールをレンダリングします
 */
const RulesDisplay: React.FC<RulesDisplayProps> = ({ rules }) => {
  const { alpha } = useThemeContext();

  // マークダウンスタイルのカスタマイズ
  const markdownStyles = {
    '& h1': {
      fontSize: '1.8rem',
      fontWeight: 600,
      marginTop: '1.5rem',
      marginBottom: '1rem',
      paddingBottom: '0.5rem',
      borderBottom: '1px solid',
      borderColor: 'divider',
    },
    '& h2': {
      fontSize: '1.5rem',
      fontWeight: 600,
      marginTop: '1.5rem',
      marginBottom: '0.75rem',
    },
    '& h3': {
      fontSize: '1.3rem',
      fontWeight: 600,
      marginTop: '1.25rem',
      marginBottom: '0.5rem',
    },
    '& p': {
      marginBottom: '1rem',
      lineHeight: 1.6,
    },
    '& ul, & ol': {
      marginBottom: '1rem',
      paddingLeft: '2rem',
    },
    '& li': {
      marginBottom: '0.5rem',
    },
    '& a': {
      color: 'primary.main',
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline',
      },
    },
    '& blockquote': {
      borderLeft: '4px solid',
      borderColor: 'divider',
      paddingLeft: '1rem',
      margin: '1rem 0',
      fontStyle: 'italic',
      color: 'text.secondary',
    },
    '& code': {
      fontFamily: 'monospace',
      backgroundColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.1),
      padding: '0.2rem 0.4rem',
      borderRadius: '4px',
      fontSize: '0.875rem',
    },
    '& pre': {
      backgroundColor: (theme: Theme) => alpha(theme.palette.common.black, 0.05),
      padding: '1rem',
      borderRadius: '4px',
      overflow: 'auto',
      marginBottom: '1rem',
      '& code': {
        backgroundColor: 'transparent',
        padding: 0,
      },
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '1rem',
      borderRadius: '4px',
      overflow: 'hidden',
    },
    '& th, & td': {
      padding: '0.75rem',
      border: '1px solid',
      borderColor: 'divider',
    },
    '& th': {
      backgroundColor: (theme: Theme) => alpha(theme.palette.primary.main, 0.1),
      fontWeight: 'bold',
    },
    '& tr:nth-of-type(even)': {
      backgroundColor: (theme: Theme) => alpha(theme.palette.common.black, 0.02),
    },
    '& img': {
      maxWidth: '100%',
      height: 'auto',
      borderRadius: '4px',
      margin: '1rem 0',
    },
    '& hr': {
      border: 'none',
      height: '1px',
      backgroundColor: 'divider',
      margin: '2rem 0',
    },
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        競技ルール
      </Typography>

      <Box sx={markdownStyles}>
        <ReactMarkdown>{rules}</ReactMarkdown>
      </Box>
    </Box>
  );
};

export default RulesDisplay;
