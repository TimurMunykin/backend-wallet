# MCP Setup для Claude Desktop - Финальная версия

## ⚠️ Важное уточнение по OAuth

После изучения документации MCP и тестирования выяснилось, что:

- **OAuth работает только с HTTP транспортом** (SSE, WebSocket)
- **Claude Desktop поддерживает только STDIO транспорт** 
- **STDIO транспорт не поддерживает OAuth**

## 🔧 Конфигурация для Claude Desktop

### Для Claude Desktop (STDIO)
```json
{
  "mcpServers": {
    "backend-wallet": {
      "command": "node",
      "args": ["/home/crazytimon/repo/backend-wallet/mcp-server/dist/index.js"],
      "env": {
        "BACKEND_AUTH_TOKEN": "your_jwt_token_here",
        "BACKEND_API_URL": "http://localhost:3000/api"
      }
    }
  }
}
```

### Для HTTP клиентов (OAuth)
```bash
# Простой HTTP сервер с OAuth
cd mcp-server
npm run build
npm run start:http

# HTTP endpoints:
# GET  http://localhost:3333/health
# GET  http://localhost:3333/tools
# POST http://localhost:3333/tools/{toolName}
```

## 🎯 Что мы реализовали

### 1. OAuth 2.1 Authorization Server ✅
- **Endpoints**: `/.well-known/oauth-authorization-server`, `/oauth/token`, `/oauth/register`
- **Flows**: Client Credentials, Authorization Code with PKCE, Refresh Token
- **Безопасность**: PKCE обязательно, короткий срок токенов, scope-based доступ

### 2. HTTP MCP Server с OAuth ✅
- **Транспорт**: HTTP REST API
- **Аутентификация**: OAuth 2.1 Client Credentials Flow
- **Endpoints**: `/health`, `/tools`, `/tools/{toolName}`
- **Автоматический refresh** токенов

### 3. Обновленный Backend с OAuth ✅
- **Auth middleware** поддерживает и JWT и OAuth токены
- **Все API endpoints** работают с OAuth
- **Обратная совместимость** с существующими JWT токенами

## 📱 Использование

### Claude Desktop
1. **Скопируйте** `mcp-configs/claude.desktop.config` в `~/.config/Claude/claude_desktop_config.json`
2. **Обновите** JWT токен в конфигурации
3. **Перезапустите** Claude Desktop
4. **Используйте** обычные MCP инструменты

### HTTP клиенты
1. **Запустите** HTTP сервер: `npm run start:http`
2. **Получите** tools: `GET http://localhost:3333/tools`
3. **Выполните** tool: `POST http://localhost:3333/tools/ping`

## 🔐 OAuth для будущих клиентов

HTTP сервер готов для OAuth клиентов:

```bash
# Регистрация клиента
curl -X POST http://localhost:3000/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "MCP Client",
    "grant_types": ["client_credentials"],
    "scope": "mcp:tools:list mcp:tools:call wallet:accounts:read"
  }'

# Получение токена
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=CLIENT_ID&client_secret=CLIENT_SECRET"

# Использование MCP инструментов
curl -X POST http://localhost:3333/tools/getTotalBalance \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## 🏆 Итоги

- ✅ **OAuth 2.1 Authorization Server** полностью реализован
- ✅ **HTTP MCP Server** работает с OAuth
- ✅ **Backend API** поддерживает OAuth токены
- ✅ **Claude Desktop** работает с обычным STDIO MCP сервером
- ✅ **Обратная совместимость** сохранена

**Результат**: Hardcoded JWT токены заменены на production-ready OAuth 2.1 для HTTP клиентов, а для Claude Desktop используется обычный STDIO транспорт с JWT токенами.

## 🔧 Команды для запуска

```bash
# Backend сервер
npm run docker:dev

# Обычный MCP сервер (для Claude Desktop)
cd mcp-server
npm run build
npm run start

# HTTP OAuth MCP сервер (для других клиентов)
cd mcp-server
npm run start:http

# Тестирование OAuth
npm run test:oauth
```

OAuth полностью готов для будущих HTTP MCP клиентов! 🚀 