import { useState, useEffect } from 'react'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
} from '@mui/material'
import {
  AccountBalance,
  TrendingUp,
  TrendingDown,
  Add,
  MonetizationOn,
} from '@mui/icons-material'
import { accountsAPI, transactionsAPI, goalsAPI, dailySpendingAPI } from '../services/api'

interface Account {
  id: number
  name: string
  balance: number
  currency: string
}

interface Transaction {
  id: number
  amount: number
  type: 'income' | 'expense'
  description: string
  transactionDate: string
  account: Account
}

interface Goal {
  id: number
  title: string
  targetAmount: number
  currentAmount: number
  progress: number
  targetDate: string
}

interface DailySpending {
  dailyLimit: number
  spentToday: number
  remainingToday: number
  daysRemaining: number
  currentBalance: number
  availableForGoals: number
  upcomingTransactions: number
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [dailySpending, setDailySpending] = useState<DailySpending | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [accountsRes, totalRes, transactionsRes, goalsRes] = await Promise.all([
        accountsAPI.getAll(),
        accountsAPI.getTotalBalance(),
        transactionsAPI.getAll({ limit: 5, sortBy: 'transaction_date', sortOrder: 'DESC' }),
        goalsAPI.getProgress(),
      ])

      // Handle the backend response structure { success: true, data: {...} }
      setAccounts(accountsRes.data.data || accountsRes.data || [])
      setTotalBalance(totalRes.data.data?.totalBalance || totalRes.data?.totalBalance || 0)
      setRecentTransactions(transactionsRes.data.data?.transactions || transactionsRes.data?.transactions || [])
      const goalsData = goalsRes.data.data || goalsRes.data || []
      setGoals(Array.isArray(goalsData) ? goalsData.slice(0, 3) : []) // Show top 3 goals

      // Try to get daily spending data
      try {
        const dailyRes = await dailySpendingAPI.calculate()
        setDailySpending(dailyRes.data.data || dailyRes.data)
      } catch (error) {
        // Daily spending might not be configured, that's ok
        console.log('Daily spending not configured')
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading dashboard...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Total Balance Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AccountBalance color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Balance
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(totalBalance)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Accounts Count */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AccountBalance color="secondary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Accounts
                  </Typography>
                  <Typography variant="h5">
                    {accounts.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Goals */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUp color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Goals
                  </Typography>
                  <Typography variant="h5">
                    {goals.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Daily Spending */}
        {dailySpending && (
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <MonetizationOn color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Daily Spending Limit
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(dailySpending.dailyLimit)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Spent: {formatCurrency(dailySpending.spentToday)}
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      Remaining: {formatCurrency(dailySpending.remainingToday)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recent Transactions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Recent Transactions</Typography>
                <Button size="small" href="/transactions">View All</Button>
              </Box>
              <List>
                {recentTransactions.map((transaction) => (
                  <ListItem key={transaction.id}>
                    <ListItemText
                      primary={transaction.description}
                      secondary={`${transaction.account.name} • ${formatDate(transaction.transactionDate)}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={formatCurrency(transaction.amount)}
                        color={transaction.type === 'income' ? 'success' : 'error'}
                        size="small"
                        icon={transaction.type === 'income' ? <TrendingUp /> : <TrendingDown />}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {recentTransactions.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No recent transactions"
                      secondary="Start by adding a transaction"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Goals Progress */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Goal Progress</Typography>
                <Button size="small" href="/goals">View All</Button>
              </Box>
              <List>
                {goals.map((goal) => (
                  <ListItem key={goal.id}>
                    <ListItemText
                      primary={goal.title}
                      secondary={`${formatCurrency(goal.currentAmount)} of ${formatCurrency(goal.targetAmount)} • ${goal.progress}%`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={`${goal.progress}%`}
                        color={goal.progress >= 100 ? 'success' : 'primary'}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {goals.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="No goals set"
                      secondary="Create your first financial goal"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
