import React, { useState } from 'react';
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
  Divider,
  Container
} from '@mui/material';
import {
  AccountBalance
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords match
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Make API call to register user
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: registerForm.name,
          email: registerForm.email,
          password: registerForm.password,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Call AuthContext login with user data and token
          login(result.data.user, result.data.tokens.accessToken);
        } else {
          setError(result.message || 'Registration failed');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Registration failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container 
      maxWidth="sm" 
      sx={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 450 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2, width: 56, height: 56 }}>
              <AccountBalance sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h4" component="h1" gutterBottom>
              Finance Manager
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isRegistering 
                ? 'Create your account to start managing your finances'
                : 'Welcome back! Please sign in to your account'
              }
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={isRegistering ? handleRegister : handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {isRegistering && (
              <TextField
                label="Full Name"
                type="text"
                required
                fullWidth
                value={registerForm.name}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                disabled={loading}
              />
            )}

            <TextField
              label="Email"
              type="email"
              required
              fullWidth
              value={isRegistering ? registerForm.email : loginForm.email}
              onChange={(e) => {
                if (isRegistering) {
                  setRegisterForm(prev => ({ ...prev, email: e.target.value }));
                } else {
                  setLoginForm(prev => ({ ...prev, email: e.target.value }));
                }
              }}
              disabled={loading}
            />

            <TextField
              label="Password"
              type="password"
              required
              fullWidth
              value={isRegistering ? registerForm.password : loginForm.password}
              onChange={(e) => {
                if (isRegistering) {
                  setRegisterForm(prev => ({ ...prev, password: e.target.value }));
                } else {
                  setLoginForm(prev => ({ ...prev, password: e.target.value }));
                }
              }}
              disabled={loading}
            />

            {isRegistering && (
              <TextField
                label="Confirm Password"
                type="password"
                required
                fullWidth
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                disabled={loading}
              />
            )}

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
                  {isRegistering ? 'Creating Account...' : 'Signing in...'}
                </Box>
              ) : (
                isRegistering ? 'Create Account' : 'Sign In'
              )}
            </Button>

            <Divider sx={{ my: 2 }} />

            <Button
              variant="text"
              fullWidth
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              disabled={loading}
            >
              {isRegistering 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
