import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  AccountBalance,
  Receipt,
  Analytics,
  Info
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

interface ClaudeAuthProps {
  clientId?: string;
  redirectUri?: string;
  scope?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

const ClaudeAuth: React.FC<ClaudeAuthProps> = () => {
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authParams, setAuthParams] = useState<ClaudeAuthProps>({});
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  useEffect(() => {
    // Extract OAuth parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const params: ClaudeAuthProps = {
      clientId: urlParams.get('client_id') || undefined,
      redirectUri: urlParams.get('redirect_uri') || undefined,
      scope: urlParams.get('scope') || undefined,
      state: urlParams.get('state') || undefined,
      codeChallenge: urlParams.get('code_challenge') || undefined,
      codeChallengeMethod: urlParams.get('code_challenge_method') || undefined,
    };
    setAuthParams(params);

    // If user is not logged in, show login form
    if (!user) {
      setShowLogin(true);
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Make API call to authenticate user
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Call AuthContext login with user data and token
          login(result.data.user, result.data.tokens.accessToken);
          setShowLogin(false);
        } else {
          setError(result.message || 'Login failed');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    setError(null);

    try {
      // Make API call to authorize Claude
      const backendBaseUrl = import.meta.env.VITE_BE_URL;
      const response = await fetch(`${backendBaseUrl}/oauth/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          response_type: 'code',
          client_id: authParams.clientId,
          redirect_uri: authParams.redirectUri,
          scope: authParams.scope,
          state: authParams.state,
          code_challenge: authParams.codeChallenge,
          code_challenge_method: authParams.codeChallengeMethod,
          approved: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Redirect back to Claude with authorization code
        if (authParams.redirectUri && result.code) {
          const redirectUrl = new URL(authParams.redirectUri);
          redirectUrl.searchParams.set('code', result.code);
          if (authParams.state) {
            redirectUrl.searchParams.set('state', authParams.state);
          }
          window.location.href = redirectUrl.toString();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error_description || 'Authorization failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authorize');
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = () => {
    // Redirect back to Claude with error
    if (authParams.redirectUri) {
      const redirectUrl = new URL(authParams.redirectUri);
      redirectUrl.searchParams.set('error', 'access_denied');
      redirectUrl.searchParams.set('error_description', 'User denied the request');
      if (authParams.state) {
        redirectUrl.searchParams.set('state', authParams.state);
      }
      window.location.href = redirectUrl.toString();
    }
  };

  if (showLogin) {
    return (
      <Card sx={{ maxWidth: 400, width: '100%', mx: 'auto' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2 }}>
              <CheckCircle />
            </Avatar>
            <Typography variant="h4" component="h1" gutterBottom>
              Claude Integration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please log in to authorize Claude access to your wallet
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Email"
              type="email"
              required
              fullWidth
              value={loginForm.email}
              onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
              disabled={loading}
            />

            <TextField
              label="Password"
              type="password"
              required
              fullWidth
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
              disabled={loading}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  Logging in...
                </Box>
              ) : (
                'Login'
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 480, width: '100%', mx: 'auto' }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2, width: 56, height: 56 }}>
            <CheckCircle sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h4" component="h1" gutterBottom>
            Authorize Claude
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Claude wants to access your personal finance data
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ mb: 3, bgcolor: 'grey.50' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle color="primary" fontSize="small" />
              Claude will be able to:
            </Typography>
            <List dense>
              <ListItem sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <AccountBalance fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText primary="View your account balances" />
              </ListItem>
              <ListItem sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Receipt fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText primary="Read your transaction history" />
              </ListItem>
              <ListItem sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Analytics fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText primary="Access financial analytics" />
              </ListItem>
              <ListItem sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircle fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText primary="Help you manage your finances" />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Logged in as: {user?.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Claude will access your personal wallet data only.
              </Typography>
            </Box>
          </Box>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="outlined"
            fullWidth
            size="large"
            onClick={handleDeny}
            disabled={loading}
            color="inherit"
          >
            Deny
          </Button>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                Authorizing...
              </Box>
            ) : (
              'Authorize Claude'
            )}
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />
        
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
          By authorizing, you agree to let Claude access your financial data through this secure connection.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ClaudeAuth; 