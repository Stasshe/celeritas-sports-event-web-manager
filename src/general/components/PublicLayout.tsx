import {
  AppBar,
  Box,
  Container,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { Outlet, useNavigate } from 'react-router';
import { useThemeContext } from '../../contexts/ThemeContext';

const PublicLayout = () => {
  const theme = useTheme();
  const { mode, toggleColorMode } = useThemeContext();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        height: '100dvh',
      }}
    >
      <AppBar position="static" sx={{ borderRadius: 0 }}>
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontFamily: "'Racing Sans One', sans-serif",
              cursor: 'pointer',
              fontWeight: 400,
              fontSize: 40,
            }}
            onClick={() => navigate('/')}
            className="site-title"
          >
            CELERITAS
          </Typography>

          <IconButton
            size="large"
            color="inherit"
            onClick={toggleColorMode}
            aria-label="toggle dark mode"
          >
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container
        component="main"
        sx={{
          flexGrow: 1,
          py: 4,
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Outlet />
      </Container>
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="body2" align="center" sx={{
            color: "text.secondary"
          }}>
            © Roughfts 2025 all rights reserved.
            <br />
            Contact: <a href="mailto:eterynity2024workplace@gmail.com">eterynity2024workplace@gmail.com</a>
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default PublicLayout;
