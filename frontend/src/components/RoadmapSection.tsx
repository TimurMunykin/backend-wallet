import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import { styled } from '@mui/system';

const Section = styled(Box)({
  padding: '4rem 0',
  background: 'white',
});

const RoadmapItem = styled(Box)({
  display: 'flex',
  marginBottom: '2rem',
  alignItems: 'flex-start',
  '@media (max-width: 768px)': {
    flexDirection: 'column',
  },
});

const RoadmapDate = styled(Box)({
  background: '#667eea',
  color: 'white',
  padding: '0.5rem 1rem',
  borderRadius: '20px',
  fontWeight: 'bold',
  marginRight: '2rem',
  minWidth: '120px',
  textAlign: 'center',
  '@media (max-width: 768px)': {
    marginRight: 0,
    marginBottom: '1rem',
    alignSelf: 'flex-start',
  },
});

const RoadmapContent = styled(Paper)({
  flex: 1,
  background: 'white',
  padding: '1.5rem',
  borderRadius: '10px',
  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.1)',
});

interface RoadmapSectionProps {
  translations: any;
}

const RoadmapSection: React.FC<RoadmapSectionProps> = ({ translations: t }) => {
  const roadmapItems = [
    {
      date: '✅ v1.0',
      title: 'MCP Foundation',
      description: 'Core MCP integration with Claude Web, basic financial tools (accounts, transactions, balances), OAuth 2.1 security, and multi-user support. Full financial management backend with React frontend.',
    },
    {
      date: 'Aug 2025',
      title: 'Recurring Transactions',
      description: 'Add MCP tools for managing recurring payments and income. "Set up $1200 monthly rent payment" or "Add weekly $50 grocery budget". Automated transaction scheduling through Claude conversations.',
    },
    {
      date: 'Sep 2025',
      title: 'Financial Goals',
      description: 'Goal setting and tracking through MCP. "I want to save $10,000 for vacation by December" - Claude helps create goals, track progress, and suggest adjustments to spending habits.',
    },
    {
      date: 'Q4 2025',
      title: 'Advanced AI Analytics',
      description: 'Claude-powered spending insights, predictive budgeting, automated financial advice, and intelligent transaction categorization with machine learning patterns.',
    },
    {
      date: 'Q1 2026',
      title: 'Banking Integration',
      description: 'Real bank account connections, automatic transaction imports, investment portfolio tracking, and integration with popular financial services through MCP.',
    },
    {
      date: 'Q2 2026',
      title: 'AI Financial Advisor',
      description: 'Advanced financial planning, tax optimization suggestions, investment advice, and personalized financial coaching through Claude conversations.',
    },
    {
      date: '2026+',
      title: 'Commercial MCP Service',
      description: 'Remote MCP servers for easy Claude integration, white-label solutions for financial institutions, and enterprise multi-tenant deployments.',
    },
  ];

  return (
    <Section id="roadmap">
      <Container maxWidth="lg">
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom color="#333">
          🗺️ Roadmap: The Future of AI Finance
        </Typography>
        <Typography variant="h6" textAlign="center" sx={{ mb: 4, color: '#666' }}>
          We're building the most advanced AI-native financial platform
        </Typography>
        
        <Box maxWidth="900px" margin="0 auto">
          {roadmapItems.map((item, index) => (
            <RoadmapItem key={index}>
              <RoadmapDate>{item.date}</RoadmapDate>
              <RoadmapContent>
                <Typography variant="h6" component="h3" gutterBottom color="#333">
                  {item.title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {item.description}
                </Typography>
              </RoadmapContent>
            </RoadmapItem>
          ))}
        </Box>
      </Container>
    </Section>
  );
};

export default RoadmapSection;