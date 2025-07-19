import { useState } from 'react'
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Container,
  Alert,
  Snackbar
} from '@mui/material'
import {
  Menu as MenuIcon,
  AccountBalance,
  Receipt,
  Repeat,
  TrendingUp,
  Analytics,
  CameraAlt,
  Settings,
  Person,
  Logout
} from '@mui/icons-material'
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom'

// Import components
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Accounts from './components/Accounts'
import Transactions from './components/Transactions'
import RecurringPayments from './components/RecurringPayments'
import Goals from './components/Goals'
import AnalyticsPage from './components/AnalyticsPage'
import Snapshots from './components/Snapshots'
import DailySpending from './components/DailySpending'
import ClaudeAuth from './components/ClaudeAuth'
import CompleteLandingPage from './components/CompleteLandingPage'
import { AuthProvider, useAuth } from './context/AuthContext'

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

const drawerWidth = 240

interface MenuItem {
  text: string
  icon: React.ReactNode
  path: string
}

const menuItems: MenuItem[] = [
  { text: 'Dashboard', icon: <Analytics />, path: '/app/dashboard' },
  { text: 'Accounts', icon: <AccountBalance />, path: '/app/accounts' },
  { text: 'Transactions', icon: <Receipt />, path: '/app/transactions' },
  { text: 'Recurring Payments', icon: <Repeat />, path: '/app/recurring' },
  { text: 'Goals', icon: <TrendingUp />, path: '/app/goals' },
  { text: 'Daily Spending', icon: <Settings />, path: '/app/daily-spending' },
  { text: 'Analytics', icon: <Analytics />, path: '/app/analytics' },
  { text: 'Snapshots', icon: <CameraAlt />, path: '/app/snapshots' },
]

function AppContent() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notification, setNotification] = useState<{ message: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setNotification({ message, severity })
  }

  const handleCloseNotification = () => {
    setNotification(null)
  }

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Finance Manager
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  )

  // If not authenticated and trying to access app routes, redirect to login
  if (!user && location.pathname.startsWith('/app')) {
    return <Login />
  }

  // If not authenticated and not on app routes, this will be handled by the router
  if (!user) {
    return null // Let the router handle public routes
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Personal Finance Manager
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person />
            <Typography variant="body2" sx={{ mr: 2 }}>
              {user?.name || user?.email || 'User'}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Container maxWidth="lg">
          <Routes>
            <Route path="/app/dashboard" element={<Dashboard />} />
            <Route path="/app/accounts" element={<Accounts />} />
            <Route path="/app/transactions" element={<Transactions />} />
            <Route path="/app/recurring" element={<RecurringPayments />} />
            <Route path="/app/goals" element={<Goals />} />
            <Route path="/app/daily-spending" element={<DailySpending />} />
            <Route path="/app/analytics" element={<AnalyticsPage />} />
            <Route path="/app/snapshots" element={<Snapshots />} />
            <Route path="/app" element={<Dashboard />} />
          </Routes>
        </Container>
      </Box>

      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
      >
        {notification ? (
          <Alert onClose={handleCloseNotification} severity={notification.severity}>
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  )
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  )
}

function AppRouter() {
  const location = useLocation()
  
  // Handle Claude authorization flow with proper Material-UI styling
  if (location.pathname === '/claude/authorize') {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <ClaudeAuth />
      </Box>
    )
  }
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<CompleteLandingPage />} />
      <Route path="/login" element={<Login />} />
      
      {/* Protected app routes */}
      <Route path="/app/*" element={<AppContent />} />
    </Routes>
  )
}

export default App
