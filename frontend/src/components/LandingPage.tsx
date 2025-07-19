import React, { useState, useEffect } from 'react';
import { Box, Button, Container, Typography, Card, CardContent, Select, MenuItem, FormControl } from '@mui/material';
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

interface LandingPageProps {}

const LandingPage: React.FC<LandingPageProps> = () => {
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
    </LandingContainer>
  );
};

export default LandingPage;