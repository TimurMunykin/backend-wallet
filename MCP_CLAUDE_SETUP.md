# MCP OAuth Setup для Claude Desktop

## Варианты конфигурации

У вас есть два варианта настройки MCP сервера:

### 1. OAuth MCP Server (Рекомендуется) ✅

**Тип протокола**: STDIO (как обычно)
**Аутентификация**: OAuth 2.1 с динамической регистрацией клиентов

```json
{
  "mcpServers": {
    "backend-wallet-oauth": {
      "command": "node",
      "args": ["/home/crazytimon/repo/backend-wallet/mcp-server/dist/oauth-mcp-server.js"],
      "env": {
        "OAUTH_AUTHORIZATION_SERVER": "http://localhost:3000",
        "OAUTH_CLIENT_ID": "mcp_default_client",
        "OAUTH_CLIENT_SECRET": "default_secret_for_development_only", 
        "BACKEND_API_URL": "http://localhost:3000/api",
        "NODE_ENV": "development"
      }
    }
  }
}
```

### 2. Legacy MCP Server (Обратная совместимость)

**Тип протокола**: STDIO
**Аутентификация**: JWT токены (hardcoded)

```json
{
  "mcpServers": {
    "backend-wallet-legacy": {
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

## Настройка OAuth MCP Server

### Шаг 1: Запустите сервер

```bash
# В первом терминале - запустите backend сервер
npm run docker:dev

# Во втором терминале - соберите MCP сервер
cd mcp-server
npm run build
```

### Шаг 2: Зарегистрируйте OAuth клиента

```bash
# Зарегистрируйте клиента для Claude Desktop
CLIENT_DATA=$(curl -s -X POST http://localhost:3000/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Claude Desktop MCP Client",
    "client_uri": "https://claude.ai",
    "redirect_uris": ["https://claude.ai/callback"],
    "grant_types": ["client_credentials"],
    "response_types": ["code"],
    "scope": "mcp:tools:list mcp:tools:call wallet:accounts:read wallet:transactions:read"
  }')

# Получите client_id и client_secret
echo $CLIENT_DATA | jq '.client_id'
echo $CLIENT_DATA | jq '.client_secret'
```

### Шаг 3: Обновите конфигурацию Claude Desktop

Скопируйте `mcp-configs/claude.desktop.config` в папку конфигурации Claude Desktop:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

И замените `OAUTH_CLIENT_ID` и `OAUTH_CLIENT_SECRET` на полученные значения.

### Шаг 4: Перезапустите Claude Desktop

После обновления конфигурации перезапустите Claude Desktop.

## Что изменилось от hardcoded токенов?

### Было (Legacy):
- Hardcoded JWT токены с истечением срока действия
- Ручное обновление токенов в конфигурации
- Отсутствие scope-based доступа

### Стало (OAuth):
- ✅ Автоматическая регистрация клиентов
- ✅ Автоматическое обновление токенов
- ✅ Scope-based авторизация
- ✅ Production-ready безопасность
- ✅ Соответствие MCP Authorization Specification

## Доступные scopes

- `mcp:tools:list` - Просмотр доступных инструментов
- `mcp:tools:call` - Вызов MCP инструментов  
- `mcp:resources:read` - Чтение ресурсов
- `mcp:resources:write` - Запись ресурсов
- `wallet:accounts:read` - Чтение счетов
- `wallet:accounts:write` - Управление счетами
- `wallet:transactions:read` - Чтение транзакций
- `wallet:transactions:write` - Создание транзакций
- `wallet:analytics:read` - Просмотр аналитики

## Отладка

### Проверка OAuth сервера:
```bash
curl -s http://localhost:3000/.well-known/oauth-authorization-server | jq
```

### Тестирование MCP сервера:
```bash
cd mcp-server
npm run test:oauth
```

### Логи Claude Desktop:
- **macOS**: `~/Library/Logs/Claude/`
- **Windows**: `%LOCALAPPDATA%\Claude\logs\`
- **Linux**: `~/.local/state/Claude/logs/`

## Troubleshooting

1. **"Cannot find module"** - Убедитесь что запустили `npm run build` в папке `mcp-server`
2. **"OAuth server not reachable"** - Убедитесь что backend сервер запущен через `npm run docker:dev`  
3. **"Invalid client credentials"** - Проверьте `client_id` и `client_secret` в конфигурации
4. **"Scope not allowed"** - Убедитесь что при регистрации клиента указали нужные scopes 