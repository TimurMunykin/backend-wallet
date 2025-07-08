import { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
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
  Grid
} from '@mui/material'
import { Add, Delete } from '@mui/icons-material'

interface Account {
  id: number
  name: string
  balance: number
  currency: string
}

interface RecurringPayment {
  id: number
  amount: number
  type: 'income' | 'expense'
  description: string
  frequency: 'daily' | 'weekly' | 'monthly'
  start_date: string
  end_date?: string
  account_id: number
  account?: {
    id: number
    name: string
  }
}

export default function RecurringPayments() {
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense' as 'income' | 'expense',
    description: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly',
    startDate: '',
    accountId: ''
  })

  useEffect(() => {
    fetchRecurringPayments()
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const result = await response.json()
        const data = result.success ? result.data : []
        setAccounts(Array.isArray(data) ? data : [])
        // Set default account if available
        if (data.length > 0 && !formData.accountId) {
          setFormData(prev => ({ ...prev, accountId: data[0].id.toString() }))
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    }
  }

  const fetchRecurringPayments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/recurring-payments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const result = await response.json()
        const data = result.success ? result.data : []
        setRecurringPayments(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch recurring payments:', response.status)
        setRecurringPayments([])
      }
    } catch (error) {
      console.error('Error fetching recurring payments:', error)
      setRecurringPayments([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/recurring-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          accountId: parseInt(formData.accountId),
          amount: parseFloat(formData.amount),
          type: formData.type,
          description: formData.description,
          frequency: formData.frequency,
          startDate: formData.startDate
        })
      })
      
      if (response.ok) {
        setOpen(false)
        resetForm()
        fetchRecurringPayments()
      }
    } catch (error) {
      console.error('Error creating recurring payment:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      amount: '',
      type: 'expense',
      description: '',
      frequency: 'monthly',
      startDate: '',
      accountId: accounts.length > 0 ? accounts[0].id.toString() : ''
    })
  }

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/recurring-payments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        fetchRecurringPayments()
      }
    } catch (error) {
      console.error('Error deleting recurring payment:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getTypeColor = (type: string) => {
    return type === 'income' ? 'success' : 'error'
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Recurring Payments
        </Typography>
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Recurring Payments
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          Add Recurring Payment
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Description</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.isArray(recurringPayments) && recurringPayments.length > 0 ? (
              recurringPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.description}</TableCell>
                  <TableCell>{payment.account?.name || `Account ${payment.account_id}`}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={payment.type} 
                      color={getTypeColor(payment.type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{payment.frequency}</TableCell>
                  <TableCell>{new Date(payment.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDelete(payment.id)}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No recurring payments found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Recurring Payment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Account *</InputLabel>
                <Select
                  value={formData.accountId}
                  label="Account *"
                  onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                >
                  {accounts.map((account) => (
                    <MenuItem key={account.id} value={account.id.toString()}>
                      {account.name} ({formatCurrency(account.balance)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Amount"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'income' | 'expense'})}
                >
                  <MenuItem value="expense">Expense</MenuItem>
                  <MenuItem value="income">Income</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={formData.frequency}
                  label="Frequency"
                  onChange={(e) => setFormData({...formData, frequency: e.target.value as 'daily' | 'weekly' | 'monthly'})}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
