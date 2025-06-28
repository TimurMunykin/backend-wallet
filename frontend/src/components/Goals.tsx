import { Box, Typography, Card, CardContent } from '@mui/material'

export default function Goals() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Financial Goals
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="body1">
            Goals management will include:
          </Typography>
          <ul>
            <li>Create savings goals</li>
            <li>Track progress</li>
            <li>Set target dates</li>
            <li>Sub-goals support</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  )
}
