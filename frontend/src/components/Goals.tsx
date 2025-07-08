import { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  LinearProgress,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material'
import { Add, Edit, Delete, TrendingUp, Check, Flag } from '@mui/icons-material'

interface Goal {
  id: number
  user_id: number
  parent_goal_id?: number
  title: string
  target_amount: number
  min_balance: number
  target_date: string
  description?: string
  achieved: boolean
  created_at: string
  updated_at: string
}

interface GoalProgress {
  goal: Goal
  progress: number
  remainingAmount: number
  daysRemaining: number
  dailyTargetAmount: number
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalsProgress, setGoalsProgress] = useState<GoalProgress[]>([])
  const [open, setOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    targetAmount: '',
    minBalance: '',
    targetDate: '',
    description: ''
  })

  useEffect(() => {
    fetchGoals()
    fetchGoalsProgress()
  }, [])

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/goals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const result = await response.json()
        setGoals(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGoalsProgress = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/goals/progress', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const result = await response.json()
        setGoalsProgress(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching goals progress:', error)
    }
  }

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token')
      const payload = {
        title: formData.title,
        targetAmount: parseFloat(formData.targetAmount),
        minBalance: parseFloat(formData.minBalance) || 0,
        targetDate: formData.targetDate,
        description: formData.description || null
      }

      const url = editingGoal ? `/api/goals/${editingGoal.id}` : '/api/goals'
      const method = editingGoal ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setOpen(false)
        setEditingGoal(null)
        setFormData({
          title: '',
          targetAmount: '',
          minBalance: '',
          targetDate: '',
          description: ''
        })
        fetchGoals()
        fetchGoalsProgress()
      }
    } catch (error) {
      console.error('Error saving goal:', error)
    }
  }

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setFormData({
      title: goal.title,
      targetAmount: goal.target_amount.toString(),
      minBalance: goal.min_balance.toString(),
      targetDate: goal.target_date,
      description: goal.description || ''
    })
    setOpen(true)
  }

  const handleDelete = async (goalId: number) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/goals/${goalId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          fetchGoals()
          fetchGoalsProgress()
        }
      } catch (error) {
        console.error('Error deleting goal:', error)
      }
    }
  }

  const handleAchieve = async (goalId: number) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/goals/${goalId}/achieve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        fetchGoals()
        fetchGoalsProgress()
      }
    } catch (error) {
      console.error('Error achieving goal:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getPriorityColor = (daysRemaining: number) => {
    if (daysRemaining <= 0) return 'error'
    if (daysRemaining <= 30) return 'warning'
    if (daysRemaining <= 90) return 'info'
    return 'primary'
  }

  const getPriorityLabel = (daysRemaining: number) => {
    if (daysRemaining <= 0) return 'Overdue'
    if (daysRemaining <= 30) return 'Urgent'
    if (daysRemaining <= 90) return 'Soon'
    return 'Long-term'
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Financial Goals
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Goals
              </Typography>
              <Typography variant="h5">
                {goals.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Goals
              </Typography>
              <Typography variant="h5">
                {goals.filter(g => !g.achieved).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Target Amount
              </Typography>
              <Typography variant="h5">
                {formatCurrency(goals.reduce((sum, g) => sum + g.target_amount, 0))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg. Progress
              </Typography>
              <Typography variant="h5">
                {goalsProgress.length > 0 
                  ? Math.round(goalsProgress.reduce((sum, g) => sum + g.progress, 0) / goalsProgress.length)
                  : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Goals Table */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          Your Goals
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          Add Goal
        </Button>
      </Box>

      {goals.length === 0 ? (
        <Alert severity="info">
          You haven't set any financial goals yet. Create your first goal to start tracking your progress!
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Goal</TableCell>
                <TableCell>Target Amount</TableCell>
                <TableCell>Target Date</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Daily Target</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {goals.map((goal) => {
                const progress = goalsProgress.find(p => p.goal.id === goal.id)
                return (
                  <TableRow key={goal.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle1">{goal.title}</Typography>
                        {goal.description && (
                          <Typography variant="body2" color="textSecondary">
                            {goal.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatCurrency(goal.target_amount)}
                      </Typography>
                      {goal.min_balance > 0 && (
                        <Typography variant="caption" color="textSecondary">
                          Min: {formatCurrency(goal.min_balance)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(goal.target_date)}</TableCell>
                    <TableCell>
                      {progress ? (
                        <Box sx={{ minWidth: 120 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min(progress.progress, 100)}
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {Math.round(progress.progress)}%
                          </Typography>
                        </Box>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {progress && (
                        <Chip
                          label={getPriorityLabel(progress.daysRemaining)}
                          color={getPriorityColor(progress.daysRemaining)}
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {progress && (
                        <Typography variant="body2">
                          {formatCurrency(progress.dailyTargetAmount)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(goal)}
                          disabled={goal.achieved}
                        >
                          <Edit />
                        </IconButton>
                        {!goal.achieved && progress && progress.progress >= 100 && (
                          <IconButton
                            size="small"
                            onClick={() => handleAchieve(goal.id)}
                            color="success"
                          >
                            <Check />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(goal.id)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Goal Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingGoal ? 'Edit Goal' : 'Create New Goal'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Goal Title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Target Amount"
                type="number"
                value={formData.targetAmount}
                onChange={(e) => setFormData({...formData, targetAmount: e.target.value})}
                required
                InputProps={{
                  startAdornment: '$',
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Min Balance (optional)"
                type="number"
                value={formData.minBalance}
                onChange={(e) => setFormData({...formData, minBalance: e.target.value})}
                InputProps={{
                  startAdornment: '$',
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Target Date"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({...formData, targetDate: e.target.value})}
                InputLabelProps={{
                  shrink: true,
                }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description (optional)"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingGoal ? 'Update' : 'Create'} Goal
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
