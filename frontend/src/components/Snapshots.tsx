import { Box, Typography, Card, CardContent } from '@mui/material'

export default function Snapshots() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Financial Snapshots
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Snapshots feature will include:
          </Typography>
          <ul>
            <li>Create financial snapshots</li>
            <li>Track progress over time</li>
            <li>Compare different time periods</li>
            <li>Export snapshot data</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  )
}
