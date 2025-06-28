import { Box, Typography, Card, CardContent } from '@mui/material'

export default function AnalyticsPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Financial Analytics
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Analytics features will include:
          </Typography>
          <ul>
            <li>Income vs expense trends</li>
            <li>Spending patterns analysis</li>
            <li>Financial forecasts</li>
            <li>Cash flow analysis</li>
            <li>Interactive charts and graphs</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  )
}
