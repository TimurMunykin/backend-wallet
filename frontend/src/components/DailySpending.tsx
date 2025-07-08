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
  ListItemText
} from '@mui/material'
import { Add, Delete, Settings, Calculate, CheckCircle, ExpandMore } from '@mui/icons-material'

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
    emergencyBuffer: ''
  })

  useEffect(() => {
    fetchConfigs()
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
      const response = await fetch('/api/daily-spending/configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          periodType: formData.periodType,
          customDays: formData.periodValue ? parseInt(formData.periodValue) : undefined,
          customEndDate: formData.targetDate || undefined,
          salaryDate: formData.salaryDate || undefined,
          includePendingSalary: formData.includeSalary,
          includeRecurringIncome: formData.includeRecurringIncome,
          includeRecurringExpenses: formData.includeRecurringExpenses,
          activeGoals: [],
          emergencyBuffer: formData.emergencyBuffer ? parseFloat(formData.emergencyBuffer) : 0
        })
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
          emergencyBuffer: ''
        })
        fetchConfigs()
      }
    } catch (error) {
      console.error('Error creating config:', error)
    }
  }

  const handleActivate = async (configId: number) => {
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

  const handleDelete = async (configId: number) => {
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
        calculateDailySpending()
      }
    } catch (error) {
      console.error('Error deleting config:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getPeriodLabel = (config: DailySpendingConfig) => {
    switch (config.period_type) {
      case 'to_salary':
        return 'Until next salary'
      case 'to_month_end':
        return 'Until month end'
      case 'custom_days':
        return `${config.custom_days} days`
      case 'to_date':
        return 'Until specific date'
      default:
        return config.period_type
    }
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Daily Spending Calculator
        </Typography>
        <Typography>Loading...</Typography>
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

      {configs.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          No configurations found. Create your first daily spending configuration to get started.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Emergency Buffer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>{config.name}</TableCell>
                  <TableCell>{getPeriodLabel(config)}</TableCell>
                  <TableCell>{formatCurrency(parseFloat(config.emergency_buffer))}</TableCell>
                  <TableCell>
                    {config.is_active ? (
                      <Chip 
                        label="Active" 
                        color="success"
                        size="small"
                        icon={<CheckCircle />}
                      />
                    ) : (
                      <Chip 
                        label="Inactive" 
                        color="default"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {!config.is_active && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleActivate(config.id)}
                        sx={{ mr: 1 }}
                      >
                        Activate
                      </Button>
                    )}
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Daily Spending Configuration</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Configuration Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Period Type</InputLabel>
                <Select
                  value={formData.periodType}
                  label="Period Type"
                  onChange={(e) => setFormData({...formData, periodType: e.target.value as any})}
                >
                  <MenuItem value="to_salary">Until Next Salary</MenuItem>
                  <MenuItem value="to_month_end">Until Month End</MenuItem>
                  <MenuItem value="custom_days">Custom Days</MenuItem>
                  <MenuItem value="to_date">Until Specific Date</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {formData.periodType === 'custom_days' && (
              <Grid item xs={12}>
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="Next Salary Date"
                  value={formData.salaryDate}
                  onChange={(e) => setFormData({...formData, salaryDate: e.target.value})}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
            )}
            {formData.periodType === 'to_date' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="date"
                  label="Target Date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({...formData, targetDate: e.target.value})}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Emergency Buffer"
                value={formData.emergencyBuffer}
                onChange={(e) => setFormData({...formData, emergencyBuffer: e.target.value})}
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Create
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
                {/* Calculation Formula */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        📊 Calculation Formula
                      </Typography>
                      <Box sx={{ fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'pre-line', bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                        {calculation.breakdown.calculationFormula}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Step-by-Step Breakdown */}
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
                        <ListItem>
                          <ListItemText 
                            primary="- Spent Today"
                            secondary={formatCurrency(calculation.spentToday)}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Detailed Transaction Lists */}
                {calculation.breakdown.salaryDetails.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          💰 Expected Salary Payments
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
                          🕐 Upcoming Transactions
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
                                    <Chip label={item.type} size="small" color="warning" />
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

                {/* Calculation Metadata */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        📝 Calculation Info
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="textSecondary">
                            Calculation Date: {formatDate(calculation.breakdown.calculationDate)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="textSecondary">
                            Target End Date: {formatDate(calculation.breakdown.endDate)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
    </Box>
  )
}
