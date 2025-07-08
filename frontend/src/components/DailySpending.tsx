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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  ListItemIcon,
  Slider,
  FormLabel
} from '@mui/material'
import { Add, Delete, Settings, Calculate, CheckCircle, ExpandMore, TrendingUp, Flag } from '@mui/icons-material'

interface Goal {
  id: number
  title: string
  target_amount: number
  min_balance: number
  target_date: string
  description?: string
  achieved: boolean
}

interface GoalProgress {
  goal: Goal
  progress: number
  remainingAmount: number
  daysRemaining: number
  dailyTargetAmount: number
}

interface DailySpendingConfig {
  id: number
  user_id: number
  name: string
  is_active: boolean
  period_type: 'to_salary' | 'to_month_end' | 'custom_days' | 'to_date'
  custom_days?: number
  custom_end_date?: string
  include_pending_salary: boolean
  include_recurring_income: boolean
  include_recurring_expenses: boolean
  active_goals: number[]
  goal_priorities: any
  emergency_buffer: string
  created_at: string
  updated_at: string
}

interface DailySpendingCalculation {
  dailyLimit: number
  currentBalance: number
  availableForGoals: number
  daysRemaining: number
  spentToday: number
  remainingToday: number
  upcomingTransactions: number
  breakdown: {
    startingBalance: number
    expectedSalary: number
    expectedRecurringIncome: number
    expectedRecurringExpenses: number
    goalsReserved: number
    emergencyBuffer: number
    availableAmount: number
    periodDays: number
    salaryDetails: Array<{date: string, amount: number, description: string}>
    recurringIncomeDetails: Array<{date: string, amount: number, description: string, frequency: string}>
    recurringExpenseDetails: Array<{date: string, amount: number, description: string, frequency: string}>
    upcomingTransactionDetails: Array<{date: string, amount: number, description: string, type: string}>
    calculationSteps: {
      step1_startingAmount: number
      step2_afterSalary: number
      step3_afterRecurringIncome: number
      step4_afterRecurringExpenses: number
      step5_afterGoals: number
      step6_afterEmergencyBuffer: number
      step7_afterUpcomingTransactions: number
      finalDailyLimit: number
      spentToday: number
      remainingToday: number
    }
    calculationFormula: string
    endDate: string
    calculationDate: string
  }
}

export default function DailySpending() {
  const [configs, setConfigs] = useState<DailySpendingConfig[]>([])
  const [calculation, setCalculation] = useState<DailySpendingCalculation | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalsProgress, setGoalsProgress] = useState<GoalProgress[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [calculationLoading, setCalculationLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    periodType: 'to_month_end' as 'to_salary' | 'to_month_end' | 'custom_days' | 'to_date',
    periodValue: '',
    salaryDate: '',
    targetDate: '',
    includeSalary: true,
    includeRecurringIncome: true,
    includeRecurringExpenses: true,
    emergencyBuffer: '',
    activeGoals: [] as number[],
    goalPriorities: {} as Record<number, number>
  })

  useEffect(() => {
    fetchConfigs()
    fetchGoals()
    fetchGoalsProgress()
    calculateDailySpending()
  }, [])

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/daily-spending/configs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const result = await response.json()
        const data = result.success ? result.data : []
        setConfigs(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching configs:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const calculateDailySpending = async (configId?: number) => {
    try {
      setCalculationLoading(true)
      const token = localStorage.getItem('token')
      const url = configId ? `/api/daily-spending/calculate?configId=${configId}` : '/api/daily-spending/calculate'
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setCalculation(result.data)
        } else {
          console.error('Calculation failed:', result.message)
          setCalculation(null)
        }
      } else {
        const result = await response.json()
        console.error('API error:', result.message || 'Unknown error')
        setCalculation(null)
      }
    } catch (error) {
      console.error('Error calculating daily spending:', error)
      setCalculation(null)
    } finally {
      setCalculationLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token')
      
      const payload = {
        name: formData.name,
        periodType: formData.periodType,
        ...(formData.periodType === 'custom_days' ? { customDays: parseInt(formData.periodValue) } : {}),
        ...(formData.periodType === 'to_date' ? { customEndDate: formData.targetDate } : {}),
        ...(formData.periodType === 'to_salary' ? { salaryDate: formData.salaryDate } : {}),
        includePendingSalary: formData.includeSalary,
        includeRecurringIncome: formData.includeRecurringIncome,
        includeRecurringExpenses: formData.includeRecurringExpenses,
        emergencyBuffer: parseFloat(formData.emergencyBuffer) || 0,
        activeGoals: formData.activeGoals,
        goalPriorities: formData.goalPriorities
      }

      const response = await fetch('/api/daily-spending/configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setOpen(false)
        setFormData({
          name: '',
          periodType: 'to_month_end',
          periodValue: '',
          salaryDate: '',
          targetDate: '',
          includeSalary: true,
          includeRecurringIncome: true,
          includeRecurringExpenses: true,
          emergencyBuffer: '',
          activeGoals: [],
          goalPriorities: {}
        })
        fetchConfigs()
      }
    } catch (error) {
      console.error('Error saving config:', error)
    }
  }

  const handleGoalToggle = (goalId: number) => {
    const newActiveGoals = formData.activeGoals.includes(goalId)
      ? formData.activeGoals.filter(id => id !== goalId)
      : [...formData.activeGoals, goalId]
    
    // If goals are selected, automatically set period to goal-based
    let updatedFormData = {
      ...formData,
      activeGoals: newActiveGoals
    }

    // If we have active goals, set the period to the earliest goal target date
    if (newActiveGoals.length > 0) {
      const selectedGoals = goals.filter(goal => newActiveGoals.includes(goal.id))
      const earliestTargetDate = selectedGoals.reduce((earliest, goal) => {
        const goalDate = new Date(goal.target_date)
        return goalDate < earliest ? goalDate : earliest
      }, new Date(selectedGoals[0].target_date))

      updatedFormData = {
        ...updatedFormData,
        periodType: 'to_date',
        targetDate: earliestTargetDate.toISOString().split('T')[0]
      }
    } else {
      // If no goals selected, reset to default period type
      updatedFormData = {
        ...updatedFormData,
        periodType: 'to_month_end',
        targetDate: ''
      }
    }
    
    setFormData(updatedFormData)
  }

  const handleGoalPriorityChange = (goalId: number, priority: number) => {
    setFormData({
      ...formData,
      goalPriorities: {
        ...formData.goalPriorities,
        [goalId]: priority
      }
    })
  }

  const activateConfig = async (configId: number) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/daily-spending/configs/${configId}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        fetchConfigs()
        calculateDailySpending(configId)
      }
    } catch (error) {
      console.error('Error activating config:', error)
    }
  }

  const deleteConfig = async (configId: number) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/daily-spending/configs/${configId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          fetchConfigs()
          if (calculation) {
            calculateDailySpending()
          }
        }
      } catch (error) {
        console.error('Error deleting config:', error)
      }
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

  const getGoalProgressColor = (progress: number) => {
    if (progress >= 100) return 'success'
    if (progress >= 75) return 'info'
    if (progress >= 50) return 'warning'
    return 'error'
  }

  const getGoalPriorityLabel = (daysRemaining: number) => {
    if (daysRemaining <= 0) return 'Overdue'
    if (daysRemaining <= 30) return 'Urgent'
    if (daysRemaining <= 90) return 'Soon'
    return 'Long-term'
  }

  const getGoalPriorityColor = (daysRemaining: number) => {
    if (daysRemaining <= 0) return 'error'
    if (daysRemaining <= 30) return 'warning'
    if (daysRemaining <= 90) return 'info'
    return 'primary'
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
        Daily Spending Calculator
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Daily Spending Calculator</Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={calculationLoading ? <CircularProgress size={16} /> : <Calculate />}
              onClick={() => calculateDailySpending()}
              disabled={calculationLoading}
            >
              {calculation ? 'Recalculate' : 'Calculate'}
            </Button>
          </Box>
          
          {calculation ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Typography variant="h3" color="primary">
                  {formatCurrency(Number(calculation.dailyLimit))}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Daily Limit
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="h5" color="error">
                  {formatCurrency(Number(calculation.spentToday))}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Spent Today
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="h5" color="success">
                  {formatCurrency(Number(calculation.remainingToday))}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Remaining Today
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="h5">
                  {formatCurrency(Number(calculation.currentBalance))}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Current Balance
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="h5">
                  {Number(calculation.daysRemaining).toFixed(1)}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Days Remaining
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="h5">
                  {formatCurrency(Number(calculation.availableForGoals))}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Available for Goals
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="h5" color="warning">
                  {formatCurrency(Number(calculation.upcomingTransactions))}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Upcoming Expenses
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="h5">
                  {calculation.spentToday > 0 ? 
                    `${((calculation.spentToday / calculation.dailyLimit) * 100).toFixed(1)}%` : 
                    '0%'
                  }
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                  Daily Budget Used
                </Typography>
              </Grid>
            </Grid>
          ) : calculationLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
              <Typography variant="body1" sx={{ ml: 2 }}>
                Calculating your daily spending limit...
              </Typography>
            </Box>
          ) : (
            <Alert severity="warning">
              {configs.length === 0 
                ? "Create and activate a configuration to calculate your daily spending limit." 
                : "Unable to calculate daily spending limit. There may be a backend issue. Please try again or contact support if the problem persists."
              }
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Goals Overview */}
      {goalsProgress.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🎯 Active Goals Overview
            </Typography>
            <Grid container spacing={2}>
              {goalsProgress.map((goalProgress) => (
                <Grid item xs={12} md={6} key={goalProgress.goal.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle1">
                          {goalProgress.goal.title}
                        </Typography>
                        <Chip
                          label={getGoalPriorityLabel(goalProgress.daysRemaining)}
                          color={getGoalPriorityColor(goalProgress.daysRemaining)}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        {formatCurrency(goalProgress.remainingAmount)} remaining • {goalProgress.daysRemaining} days
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" color="primary">
                          {formatCurrency(goalProgress.dailyTargetAmount)}/day
                        </Typography>
                        <Typography variant="body2">
                          ({Math.round(goalProgress.progress)}% complete)
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          Spending Configurations
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          Add Configuration
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Configuration</TableCell>
              <TableCell>Period Type</TableCell>
              <TableCell>Active Goals</TableCell>
              <TableCell>Emergency Buffer</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell>{config.name}</TableCell>
                <TableCell>
                  <Chip 
                    label={config.period_type.replace('_', ' ').toUpperCase()} 
                    size="small" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {config.active_goals.length > 0 ? (
                    <Box>
                      {config.active_goals.map(goalId => {
                        const goal = goals.find(g => g.id === goalId)
                        return goal ? (
                          <Chip 
                            key={goalId}
                            label={goal.title}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ) : null
                      })}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No goals selected
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {formatCurrency(parseFloat(config.emergency_buffer))}
                </TableCell>
                <TableCell>
                  {config.is_active ? (
                    <Chip label="Active" color="success" size="small" />
                  ) : (
                    <Chip label="Inactive" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Box>
                    {!config.is_active && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => activateConfig(config.id)}
                        sx={{ mr: 1 }}
                      >
                        Activate
                      </Button>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => deleteConfig(config.id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Configuration Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Configuration</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Configuration Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Period Type</InputLabel>
                <Select
                  value={formData.periodType}
                  onChange={(e) => setFormData({...formData, periodType: e.target.value as any})}
                  disabled={formData.activeGoals.length > 0}
                >
                  <MenuItem value="to_month_end">Until End of Month</MenuItem>
                  <MenuItem value="custom_days">Custom Days</MenuItem>
                  <MenuItem value="to_date">Until Specific Date</MenuItem>
                  <MenuItem value="to_salary">Until Salary Date</MenuItem>
                </Select>
              </FormControl>
              {formData.activeGoals.length > 0 && (
                <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                  🎯 Period automatically set to match your selected goal(s)
                </Typography>
              )}
            </Grid>
            {formData.periodType === 'custom_days' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Number of Days"
                  value={formData.periodValue}
                  onChange={(e) => setFormData({...formData, periodValue: e.target.value})}
                />
              </Grid>
            )}
            {formData.periodType === 'to_salary' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Salary Date"
                  value={formData.salaryDate}
                  onChange={(e) => setFormData({...formData, salaryDate: e.target.value})}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
            )}
            {formData.periodType === 'to_date' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Target Date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({...formData, targetDate: e.target.value})}
                  disabled={formData.activeGoals.length > 0}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                {formData.activeGoals.length > 0 && formData.targetDate && (
                  <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                    🗓️ Automatically set to: {formatDate(formData.targetDate)}
                    {(() => {
                      const selectedGoals = goals.filter(goal => formData.activeGoals.includes(goal.id))
                      if (selectedGoals.length === 1) {
                        return ` (${selectedGoals[0].title} target date)`
                      } else if (selectedGoals.length > 1) {
                        const earliestGoal = selectedGoals.reduce((earliest, goal) => {
                          const goalDate = new Date(goal.target_date)
                          const earliestDate = new Date(earliest.target_date)
                          return goalDate < earliestDate ? goal : earliest
                        })
                        return ` (earliest goal: ${earliestGoal.title})`
                      }
                      return ''
                    })()}
                  </Typography>
                )}
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Emergency Buffer"
                value={formData.emergencyBuffer}
                onChange={(e) => setFormData({...formData, emergencyBuffer: e.target.value})}
                InputProps={{
                  startAdornment: '$',
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.includeSalary}
                    onChange={(e) => setFormData({...formData, includeSalary: e.target.checked})}
                  />
                }
                label="Include Salary"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.includeRecurringIncome}
                    onChange={(e) => setFormData({...formData, includeRecurringIncome: e.target.checked})}
                  />
                }
                label="Include Recurring Income"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.includeRecurringExpenses}
                    onChange={(e) => setFormData({...formData, includeRecurringExpenses: e.target.checked})}
                  />
                }
                label="Include Recurring Expenses"
              />
            </Grid>
            
            {/* Goals Selection */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                🎯 Select Goals to Include
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Choose which goals should be factored into your daily spending calculation.
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                💡 <strong>Smart Period Setting:</strong> When you select goals, the calculation period will automatically be set to your goal's target date. This ensures your daily spending is perfectly aligned with achieving your goals on time!
              </Alert>
              {goals.filter(goal => !goal.achieved).length === 0 ? (
                <Alert severity="info">
                  No active goals found. <Button href="/goals" size="small">Create a goal</Button> to get started.
                </Alert>
              ) : (
                <Box>
                  {goals.filter(goal => !goal.achieved).map((goal) => {
                    const goalProgress = goalsProgress.find(gp => gp.goal.id === goal.id)
                    const isSelected = formData.activeGoals.includes(goal.id)
                    
                    return (
                      <Box key={goal.id} mb={2}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleGoalToggle(goal.id)}
                              />
                              <Box flex={1}>
                                <Typography variant="subtitle1">
                                  {goal.title}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  {formatCurrency(goal.target_amount)} by {formatDate(goal.target_date)}
                                </Typography>
                                {goalProgress && (
                                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                                    <Chip
                                      label={`${Math.round(goalProgress.progress)}% complete`}
                                      color={getGoalProgressColor(goalProgress.progress)}
                                      size="small"
                                    />
                                    <Typography variant="body2">
                                      {formatCurrency(goalProgress.dailyTargetAmount)}/day needed
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                            
                            {isSelected && (
                              <Box mt={2}>
                                <FormLabel component="legend">
                                  Priority Level (1 = Highest, 5 = Lowest)
                                </FormLabel>
                                <Slider
                                  value={formData.goalPriorities[goal.id] || 3}
                                  onChange={(_, value) => handleGoalPriorityChange(goal.id, value as number)}
                                  step={1}
                                  marks
                                  min={1}
                                  max={5}
                                  valueLabelDisplay="auto"
                                />
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Box>
                    )
                  })}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Create Configuration
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detailed Breakdown Section */}
      {calculation && (
        <Box sx={{ mt: 4 }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">
                💡 Detailed Calculation Breakdown
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Calculation Steps */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        🔢 Step-by-Step Calculation
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Starting Balance"
                            secondary={formatCurrency(calculation.breakdown.calculationSteps.step1_startingAmount)}
                          />
                        </ListItem>
                        {calculation.breakdown.expectedSalary > 0 && (
                          <ListItem>
                            <ListItemText 
                              primary="+ Expected Salary"
                              secondary={formatCurrency(calculation.breakdown.calculationSteps.step2_afterSalary)}
                            />
                          </ListItem>
                        )}
                        {calculation.breakdown.expectedRecurringIncome > 0 && (
                          <ListItem>
                            <ListItemText 
                              primary="+ Recurring Income"
                              secondary={formatCurrency(calculation.breakdown.calculationSteps.step3_afterRecurringIncome)}
                            />
                          </ListItem>
                        )}
                        {calculation.breakdown.expectedRecurringExpenses > 0 && (
                          <ListItem>
                            <ListItemText 
                              primary="- Recurring Expenses"
                              secondary={formatCurrency(calculation.breakdown.calculationSteps.step4_afterRecurringExpenses)}
                            />
                          </ListItem>
                        )}
                        {calculation.breakdown.goalsReserved > 0 && (
                          <ListItem>
                            <ListItemText 
                              primary="- Goals Reserved"
                              secondary={formatCurrency(calculation.breakdown.calculationSteps.step5_afterGoals)}
                            />
                          </ListItem>
                        )}
                        {calculation.breakdown.emergencyBuffer > 0 && (
                          <ListItem>
                            <ListItemText 
                              primary="- Emergency Buffer"
                              secondary={formatCurrency(calculation.breakdown.calculationSteps.step6_afterEmergencyBuffer)}
                            />
                          </ListItem>
                        )}
                        {calculation.upcomingTransactions > 0 && (
                          <ListItem>
                            <ListItemText 
                              primary="- Upcoming Transactions"
                              secondary={formatCurrency(calculation.upcomingTransactions)}
                            />
                          </ListItem>
                        )}
                        <Divider sx={{ my: 1 }} />
                        <ListItem>
                          <ListItemText 
                            primary="= Available Amount"
                            secondary={formatCurrency(calculation.breakdown.availableAmount)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary={`÷ Days Remaining (${calculation.daysRemaining})`}
                            secondary={formatCurrency(calculation.breakdown.calculationSteps.finalDailyLimit)}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Goals Impact */}
                {calculation.breakdown.goalsReserved > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          🎯 Goals Impact
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          Amount reserved for achieving your selected goals
                        </Typography>
                        <Typography variant="h5" color="primary">
                          {formatCurrency(calculation.breakdown.goalsReserved)}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          This amount is automatically set aside to help you reach your goals on time.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Remaining sections... */}
                {calculation.breakdown.salaryDetails.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          💰 Expected Salary
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Description</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {calculation.breakdown.salaryDetails.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{formatDate(item.date)}</TableCell>
                                  <TableCell>{formatCurrency(item.amount)}</TableCell>
                                  <TableCell>{item.description}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {calculation.breakdown.recurringIncomeDetails.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          📈 Recurring Income
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Frequency</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {calculation.breakdown.recurringIncomeDetails.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{formatDate(item.date)}</TableCell>
                                  <TableCell>{formatCurrency(item.amount)}</TableCell>
                                  <TableCell>{item.description}</TableCell>
                                  <TableCell>
                                    <Chip label={item.frequency} size="small" color="success" />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {calculation.breakdown.recurringExpenseDetails.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          📉 Recurring Expenses
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Frequency</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {calculation.breakdown.recurringExpenseDetails.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{formatDate(item.date)}</TableCell>
                                  <TableCell>{formatCurrency(item.amount)}</TableCell>
                                  <TableCell>{item.description}</TableCell>
                                  <TableCell>
                                    <Chip label={item.frequency} size="small" color="error" />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {calculation.breakdown.upcomingTransactionDetails.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          ⏰ Upcoming Transactions
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Type</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {calculation.breakdown.upcomingTransactionDetails.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{formatDate(item.date)}</TableCell>
                                  <TableCell>{formatCurrency(item.amount)}</TableCell>
                                  <TableCell>{item.description}</TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={item.type} 
                                      size="small" 
                                      color={item.type === 'income' ? 'success' : 'error'} 
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
    </Box>
  )
}
