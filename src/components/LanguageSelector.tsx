import React, { useState } from 'react';
import {
  Box,
  Menu,
  MenuItem,
  IconButton,
  Typography,
  ListItemIcon,
  ButtonBase
} from '@mui/material';
import {
  Translate as TranslateIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  variant?: 'icon' | 'text';
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ variant = 'text' }) => {
  const { i18n, t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' }
  ];
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    handleClose();
    // 言語設定をローカルストレージに保存
    localStorage.setItem('preferredLanguage', code);
  };
  
  const getCurrentLanguageName = () => {
    const currentLanguage = languages.find(lang => lang.code === i18n.language);
    return currentLanguage ? currentLanguage.name : languages[0].name;
  };
  
  const isSelected = (code: string) => i18n.language === code;
  
  return (
    <Box>
      {variant === 'text' ? (
        // ButtonBase（ボタンの基本コンポーネント）を使用し、ネスト問題を解消
        <ButtonBase
          onClick={handleClick}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '6px 12px',
            borderRadius: 1,
            '&:hover': {
              bgcolor: 'action.hover',
            }
          }}
        >
          
          <Typography variant="body2">
            {getCurrentLanguageName()}
          </Typography>
        </ButtonBase>
      ) : (
        <IconButton
          color="inherit"
          aria-label="select language"
          onClick={handleClick}
        >
          <TranslateIcon />
        </IconButton>
      )}
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        keepMounted
      >
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={isSelected(language.code)}
          >
            <ListItemIcon sx={{ minWidth: 36, visibility: isSelected(language.code) ? 'visible' : 'hidden' }}>
              <CheckIcon fontSize="small" />
            </ListItemIcon>
            <Typography variant="body2">
              {language.name}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default LanguageSelector;
