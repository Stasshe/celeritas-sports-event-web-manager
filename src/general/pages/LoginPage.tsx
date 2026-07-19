import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper,
  Alert,
  Avatar
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const MotionPaper = motion(Paper);

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ログイン後にリダイレクトする先のパス
  const from = location.state?.from?.pathname || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(t('login.fillAllFields') || 'すべての項目を入力してください。');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (error) {
      if (error instanceof Error) {
        switch (error.message) {
          case 'auth/invalid-credential':
            setError(t('login.invalidCredentials') || 'メールアドレスまたはパスワードが間違っています。');
            break;
          case 'auth/user-not-found':
            setError(t('login.userNotFound') || 'ユーザーが見つかりません。');
            break;
          case 'auth/wrong-password':
            setError(t('login.wrongPassword') || 'パスワードが間違っています。');
            break;
          default:
            setError(t('login.unknownError') || '認証エラーが発生しました。');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <MotionPaper 
        elevation={3} 
        sx={{ p: 4, mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <LockOutlined />
        </Avatar>
        <Typography component="h1" variant="h5">
          {t('common.login')}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label={t('login.email')}
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label={t('login.password')}
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? t('common.loading') : t('common.login')}
          </Button>
        </Box>
      </MotionPaper>
    </Container>
  );
};

export default LoginPage;
