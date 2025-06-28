import { Box, Typography, Card, CardContent } from '@mui/material'

export default function RecurringPayments() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Recurring Payments
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Recurring payments management will be implemented here. Features include:
          </Typography>
          <ul>
            <li>Set up monthly/weekly/yearly recurring payments</li>
            <li>Track upcoming payments</li>
            <li>Confirm executed payments</li>
            <li>View payment history</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  )
}
