import React, { useState, useEffect } from 'react';
import { Box, Button, Container, Typography, Card, CardContent, Select, MenuItem, FormControl, Paper, Link } from '@mui/material';
import { styled } from '@mui/system';
import { useNavigate } from 'react-router-dom';

// Styled components
const LandingContainer = styled(Box)({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#333',
});

const Header = styled(Box)({
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  padding: '1rem 0',
  position: 'fixed',
  width: '100%',
  top: 0,
  zIndex: 1000,
});

const HeroSection = styled(Box)({
  padding: '8rem 0 4rem',
  textAlign: 'center',
  color: 'white',
});

const MCPSection = styled(Box)({
  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  color: 'white',
  textAlign: 'center',
  padding: '4rem 0',
});

const Section = styled(Box)({
  padding: '4rem 0',
  background: 'white',
});

const SectionAlt = styled(Box)({
  padding: '4rem 0',
  background: '#f8f9fa',
});

const FeatureCard = styled(Card)({
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  padding: '2rem',
  borderRadius: '15px',
  textAlign: 'center',
  transition: 'transform 0.3s',
  border: 'none',
  color: 'white',
  '&:hover': {
    transform: 'translateY(-5px)',
  },
});

const StyledButton = styled(Button)({
  padding: '1rem 2rem',
  borderRadius: '8px',
  fontSize: '1.1rem',
  transition: 'all 0.3s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
  },
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

const Footer = styled(Box)({
  background: '#333',
  color: 'white',
  textAlign: 'center',
  padding: '2rem 0',
});

// Translation data
const translations = {
  en: {
    logo: 'Personal Finance Wallet',
    navFeatures: 'Features',
    navMCP: 'MCP Integration',
    navInstallation: 'Installation',
    navRoadmap: 'Roadmap',
    navDebug: 'Debug Console',
    heroTitle: '🤖 AI-First Financial Management',
    heroSubtitle: 'The Future of Personal Finance is Here',
    heroDescription: 'Experience revolutionary financial management through Model Context Protocol (MCP). Talk to Claude naturally about your finances - no clicking, no forms, just conversation.',
    ctaTryMCP: 'Try MCP Integration',
    ctaDebug: 'Debug Console',
    ctaOpenApp: 'Open App',
    mcpTitle: '🚀 Model Context Protocol Integration',
    mcpDescription: 'This isn\'t just another finance app. It\'s the first AI-native financial assistant that integrates directly with Claude through MCP. Manage your money through natural conversation - the way financial management should be in 2025.',
    feature1Title: 'Natural Language Finance',
    feature1Desc: '"Add $50 coffee expense to my checking account" - Claude understands and executes immediately',
    feature2Title: 'Real-time Data Access',
    feature2Desc: 'Claude has instant access to your financial data through secure OAuth 2.1 authentication',
    feature3Title: 'Enterprise Security',
    feature3Desc: 'Bank-level security with proper user isolation and OAuth 2.1 authorization flows',
    feature4Title: 'AI-Powered Insights',
    feature4Desc: 'Claude analyzes your spending patterns and provides intelligent financial advice',
  },
  ru: {
    logo: 'Личный Финансовый Кошелёк',
    navFeatures: 'Возможности',
    navMCP: 'Интеграция MCP',
    navInstallation: 'Установка',
    navRoadmap: 'Дорожная карта',
    navDebug: 'Консоль отладки',
    heroTitle: '🤖 ИИ-ориентированное управление финансами',
    heroSubtitle: 'Будущее личных финансов уже здесь',
    heroDescription: 'Испытайте революционное управление финансами через Model Context Protocol (MCP). Общайтесь с Claude естественно о ваших финансах - никаких кликов, никаких форм, только разговор.',
    ctaTryMCP: 'Попробовать интеграцию MCP',
    ctaDebug: 'Консоль отладки',
    ctaOpenApp: 'Открыть приложение',
    mcpTitle: '🚀 Интеграция Model Context Protocol',
    mcpDescription: 'Это не просто ещё одно финансовое приложение. Это первый ИИ-нативный финансовый помощник, который интегрируется напрямую с Claude через MCP. Управляйте своими деньгами через естественный разговор - так, как должно быть управление финансами в 2025 году.',
    feature1Title: 'Финансы на естественном языке',
    feature1Desc: '"Добавь трату на кофе $50 к моему расчётному счёту" - Claude понимает и выполняет немедленно',
    feature2Title: 'Доступ к данным в реальном времени',
    feature2Desc: 'Claude имеет мгновенный доступ к вашим финансовым данным через безопасную аутентификацию OAuth 2.1',
    feature3Title: 'Корпоративная безопасность',
    feature3Desc: 'Безопасность банковского уровня с правильной изоляцией пользователей и потоками авторизации OAuth 2.1',
    feature4Title: 'ИИ-аналитика',
    feature4Desc: 'Claude анализирует ваши схемы трат и предоставляет умные финансовые советы',
  },
  cz: {
    logo: 'Osobní finanční peněženka',
    navFeatures: 'Funkce',
    navMCP: 'MCP integrace',
    navInstallation: 'Instalace',
    navRoadmap: 'Plán vývoje',
    navDebug: 'Debug konzole',
    heroTitle: '🤖 AI-první finanční management',
    heroSubtitle: 'Budoucnost osobních financí je zde',
    heroDescription: 'Zažijte revoluční finanční management prostřednictvím Model Context Protocol (MCP). Mluvte s Claude přirozeně o svých financích - žádné klikání, žádné formuláře, jen rozhovor.',
    ctaTryMCP: 'Vyzkoušet MCP integraci',
    ctaDebug: 'Debug konzole',
    ctaOpenApp: 'Otevřít aplikaci',
    mcpTitle: '🚀 Integrace Model Context Protocol',
    mcpDescription: 'Toto není jen další finanční aplikace. Je to první AI-nativní finanční asistent, který se integruje přímo s Claude prostřednictvím MCP. Spravujte své peníze přirozeným rozhovorem - tak, jak by měl finanční management v roce 2025 vypadat.',
    feature1Title: 'Finance v přirozeném jazyce',
    feature1Desc: '"Přidej výdaj za kávu $50 na můj běžný účet" - Claude rozumí a okamžitě vykoná',
    feature2Title: 'Přístup k datům v reálném čase',
    feature2Desc: 'Claude má okamžitý přístup k vašim finančním datům prostřednictvím zabezpečené OAuth 2.1 autentifikace',
    feature3Title: 'Podniková bezpečnost',
    feature3Desc: 'Bankovní úroveň zabezpečení s řádnou izolací uživatelů a OAuth 2.1 autorizačními toky',
    feature4Title: 'AI-poháněné přehledy',
    feature4Desc: 'Claude analyzuje vaše vzorce utrácení a poskytuje inteligentní finanční rady',
  },
};

const CompleteLandingPage: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'ru' | 'cz'>('en');
  const navigate = useNavigate();

  const t = translations[language];

  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language') as 'en' | 'ru' | 'cz';
    if (savedLanguage && translations[savedLanguage]) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleLanguageChange = (newLanguage: 'en' | 'ru' | 'cz') => {
    setLanguage(newLanguage);
    localStorage.setItem('preferred-language', newLanguage);
  };

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
    <LandingContainer>
      {/* Header */}
      <Header>
        <Container maxWidth="lg">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
              💰 {t.logo}
            </Typography>
            <Box display="flex" alignItems="center" gap={4}>
              <Box display="flex" gap={3} sx={{ display: { xs: 'none', md: 'flex' } }}>
                <Typography component="a" href="#features" sx={{ color: 'white', textDecoration: 'none' }}>
                  {t.navFeatures}
                </Typography>
                <Typography component="a" href="#mcp" sx={{ color: 'white', textDecoration: 'none' }}>
                  {t.navMCP}
                </Typography>
                <Typography component="a" href="#installation" sx={{ color: 'white', textDecoration: 'none' }}>
                  {t.navInstallation}
                </Typography>
                <Typography component="a" href="#roadmap" sx={{ color: 'white', textDecoration: 'none' }}>
                  {t.navRoadmap}
                </Typography>
                <Typography 
                  component="a" 
                  href="https://simplewallet.twc1.net/" 
                  target="_blank"
                  sx={{ color: 'white', textDecoration: 'none' }}
                >
                  {t.navDebug}
                </Typography>
              </Box>
              <FormControl size="small">
                <Select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'ru' | 'cz')}
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '& .MuiSvgIcon-root': {
                      color: 'white',
                    },
                  }}
                >
                  <MenuItem value="en">🇺🇸 EN</MenuItem>
                  <MenuItem value="ru">🇷🇺 RU</MenuItem>
                  <MenuItem value="cz">🇨🇿 CZ</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Container>
      </Header>

      {/* Hero Section */}
      <HeroSection>
        <Container maxWidth="lg">
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            {t.heroTitle}
          </Typography>
          <Typography variant="h5" gutterBottom sx={{ opacity: 0.9, mb: 2 }}>
            {t.heroSubtitle}
          </Typography>
          <Typography variant="h6" sx={{ maxWidth: 800, margin: '0 auto 2rem', opacity: 0.8 }}>
            {t.heroDescription}
          </Typography>
          <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
            <StyledButton 
              variant="contained" 
              sx={{ 
                bgcolor: '#ff6b6b', 
                '&:hover': { bgcolor: '#ff5252' } 
              }}
              href="#mcp"
            >
              🤖 {t.ctaTryMCP}
            </StyledButton>
            <StyledButton 
              variant="outlined" 
              sx={{ 
                color: 'white', 
                borderColor: 'rgba(255, 255, 255, 0.3)',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255, 255, 255, 0.1)' }
              }}
              onClick={() => navigate('/app')}
            >
              🚀 {t.ctaOpenApp}
            </StyledButton>
          </Box>
        </Container>
      </HeroSection>

      {/* MCP Highlight Section */}
      <MCPSection id="mcp">
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" gutterBottom>
            {t.mcpTitle}
          </Typography>
          <Typography variant="h6" sx={{ maxWidth: 900, margin: '0 auto 3rem', opacity: 0.95 }}>
            {t.mcpDescription}
          </Typography>
          
          <Box 
            display="grid" 
            gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
            gap={3} 
            mt={3}
          >
            <FeatureCard>
              <CardContent>
                <Typography variant="h2" component="div" sx={{ mb: 2 }}>🗣️</Typography>
                <Typography variant="h6" component="h3" gutterBottom>
                  {t.feature1Title}
                </Typography>
                <Typography variant="body2">
                  {t.feature1Desc}
                </Typography>
              </CardContent>
            </FeatureCard>
            <FeatureCard>
              <CardContent>
                <Typography variant="h2" component="div" sx={{ mb: 2 }}>⚡</Typography>
                <Typography variant="h6" component="h3" gutterBottom>
                  {t.feature2Title}
                </Typography>
                <Typography variant="body2">
                  {t.feature2Desc}
                </Typography>
              </CardContent>
            </FeatureCard>
            <FeatureCard>
              <CardContent>
                <Typography variant="h2" component="div" sx={{ mb: 2 }}>🛡️</Typography>
                <Typography variant="h6" component="h3" gutterBottom>
                  {t.feature3Title}
                </Typography>
                <Typography variant="body2">
                  {t.feature3Desc}
                </Typography>
              </CardContent>
            </FeatureCard>
            <FeatureCard>
              <CardContent>
                <Typography variant="h2" component="div" sx={{ mb: 2 }}>🔮</Typography>
                <Typography variant="h6" component="h3" gutterBottom>
                  {t.feature4Title}
                </Typography>
                <Typography variant="body2">
                  {t.feature4Desc}
                </Typography>
              </CardContent>
            </FeatureCard>
          </Box>
        </Container>
      </MCPSection>

      {/* Installation Guide */}
      <SectionAlt id="installation">
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
      </SectionAlt>

      {/* Roadmap Section */}
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

      {/* Footer */}
      <Footer>
        <Container maxWidth="lg">
          <Box display="flex" justifyContent="center" gap={4} mb={2}>
            <Link href="https://github.com/TimurMunykin/backend-wallet" target="_blank" color="inherit">
              📱 GitHub
            </Link>
            <Link href="https://simplewallet.twc1.net/" target="_blank" color="inherit">
              🐛 Debug Console
            </Link>
            <Link href="https://modelcontextprotocol.io/" target="_blank" color="inherit">
              📚 MCP Documentation
            </Link>
          </Box>
          <Typography variant="body2">
            &copy; 2025 Personal Finance Wallet. The future of AI-first financial management.
          </Typography>
        </Container>
      </Footer>
    </LandingContainer>
  );
};

export default CompleteLandingPage;