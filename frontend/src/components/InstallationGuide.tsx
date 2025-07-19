import React from 'react';
import { Box, Container, Typography, Paper, Link } from '@mui/material';
import { styled } from '@mui/system';

const Section = styled(Box)({
  padding: '4rem 0',
  background: '#f8f9fa',
});

const Step = styled(Paper)({
  marginBottom: '1.5rem',
  borderRadius: '10px',
  overflow: 'hidden',
  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
});

const StepHeader = styled(Box)({
  background: '#667eea',
  color: 'white',
  padding: '1rem 1.5rem',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

const StepContent = styled(Box)({
  padding: '1.5rem',
});

const CodeBlock = styled(Box)({
  background: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '5px',
  padding: '1rem',
  margin: '1rem 0',
  fontFamily: 'Monaco, Menlo, monospace',
  fontSize: '0.9rem',
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
});

interface InstallationGuideProps {
  translations: any;
}

const InstallationGuide: React.FC<InstallationGuideProps> = ({ translations: t }) => {
  return (
    <Section id="installation">
      <Container maxWidth="lg">
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom color="#333">
          🚀 Connect to Claude in 30 Seconds
        </Typography>
        <Typography variant="h6" textAlign="center" sx={{ mb: 4, color: '#666' }}>
          Just copy, paste, and connect - it's that simple!
        </Typography>
        
        <Box maxWidth="800px" margin="0 auto">
          <Step>
            <StepHeader>
              <Typography component="span">📋</Typography>
              Step 1: Copy the MCP Server URL
            </StepHeader>
            <StepContent>
              <Typography gutterBottom>Copy this URL to your clipboard:</Typography>
              <CodeBlock sx={{ 
                background: '#e8f5e8', 
                border: '2px solid #4caf50', 
                fontSize: '1.1rem', 
                textAlign: 'center', 
                fontWeight: 'bold' 
              }}>
                https://simplewallet.twc1.net/mcp/sse
              </CodeBlock>
              <Typography color="#666">This is your personal finance MCP server endpoint.</Typography>
            </StepContent>
          </Step>

          <Step>
            <StepHeader>
              <Typography component="span">🔗</Typography>
              Step 2: Go to Claude Settings
            </StepHeader>
            <StepContent>
              <Typography gutterBottom>Open Claude and navigate to:</Typography>
              <CodeBlock sx={{ background: '#e3f2fd', border: '2px solid #2196f3' }}>
                <Link 
                  href="https://claude.ai/settings/connectors" 
                  target="_blank" 
                  sx={{ color: '#1976d2', textDecoration: 'none', fontWeight: 'bold' }}
                >
                  🔗 https://claude.ai/settings/connectors
                </Link>
              </CodeBlock>
              <Typography color="#666">This will open the MCP connectors page in Claude.</Typography>
            </StepContent>
          </Step>

          <Step>
            <StepHeader>
              <Typography component="span">🔌</Typography>
              Step 3: Add MCP Server
            </StepHeader>
            <StepContent>
              <Typography gutterBottom>In Claude's connector settings:</Typography>
              <Box component="ul" sx={{ fontSize: '1.1rem', ml: 2 }}>
                <li><strong>Paste</strong> the URL: <code>https://simplewallet.twc1.net/mcp/sse</code></li>
                <li><strong>Click</strong> "Connect" button</li>
                <li><strong>Authorize</strong> the connection when prompted</li>
              </Box>
              <Typography color="#666">Claude will automatically detect it's a financial management server.</Typography>
            </StepContent>
          </Step>

          <Step>
            <StepHeader>
              <Typography component="span">👤</Typography>
              Step 4: Connect Your Wallet Account
            </StepHeader>
            <StepContent>
              <Typography gutterBottom>Create an account or use the demo credentials:</Typography>
              <CodeBlock sx={{ background: '#fff3e0', border: '2px solid #ff9800' }}>
                <strong>Demo Account:</strong>{'\n'}
                Email: demo@simplewallet.com{'\n'}
                Password: DemoPass123!
              </CodeBlock>
              <Typography>
                Or create your own account at: <Link href="https://simplewallet.twc1.net/" target="_blank">https://simplewallet.twc1.net/</Link> (debug console)
              </Typography>
            </StepContent>
          </Step>

          <Step>
            <StepHeader>
              <Typography component="span">💬</Typography>
              Step 5: Start Talking to Your Money! 💰
            </StepHeader>
            <StepContent>
              <Typography gutterBottom>Try these commands in Claude:</Typography>
              <CodeBlock sx={{ background: '#f3e5f5', border: '2px solid #9c27b0' }}>
                💬 "Show me my account balances"{'\n'}
                💬 "Add a $25 coffee expense to my checking account"{'\n'}
                💬 "What did I spend on groceries this month?"{'\n'}
                💬 "Add $3000 salary to my savings account"{'\n'}
                💬 "What's my total balance across all accounts?"
              </CodeBlock>
              <Typography sx={{ fontWeight: 'bold', color: '#2e7d32', mt: 1 }}>
                🎉 That's it! Claude now manages your finances through natural conversation!
              </Typography>
            </StepContent>
          </Step>
        </Box>
      </Container>
    </Section>
  );
};

export default InstallationGuide;