# MCP OAuth 2.1 Authorization Guide

Это руководство описывает, как использовать Model Context Protocol (MCP) с OAuth 2.1 авторизацией в соответствии с [MCP Authorization Specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization).

## Обзор

Вместо хардкодинга токенов, новая реализация использует OAuth 2.1 для безопасной авторизации между MCP клиентами и серверами. Это обеспечивает:

- ✅ Безопасная авторизация с короткоживущими токенами
- ✅ Контроль областей доступа (scopes) для разных инструментов  
- ✅ Автообновление токенов
- ✅ Соответствие стандартам OAuth 2.1 и MCP Authorization

## Архитектура

```
MCP Client → OAuth Authorization Server → MCP Server (Resource Server) → Backend API
```

1. **MCP Client** - получает OAuth токены и вызывает MCP инструменты
2. **OAuth Authorization Server** - выдает и проверяет токены (наш бэкенд)
3. **MCP Server** - использует OAuth токены для доступа к Backend API
4. **Backend API** - проверяет токены и предоставляет данные

## Настройка

### 1. Запуск Authorization Server

Запустите бэкенд с OAuth поддержкой:

```bash
[[memory:2626060]]
npm run docker:dev
```

Это запустит сервер с OAuth endpoints:
- `GET /.well-known/oauth-authorization-server` - метаданные сервера
- `POST /oauth/token` - получение токенов  
- `POST /oauth/register` - динамическая регистрация клиентов
- `GET /oauth/authorize` - авторизация пользователей

### 2. Конфигурация MCP Server

Скопируйте файл конфигурации:
```bash
cd mcp-server
cp .env.example .env
```

Отредактируйте `.env`:
```env
# Backend API
BACKEND_API_URL=http://localhost:3000

# OAuth Configuration  
MCP_CLIENT_ID=mcp-demo-client
MCP_CLIENT_SECRET=demo-secret-123
AUTHORIZATION_SERVER_URL=http://localhost:3000
MCP_SCOPE=mcp:tools:list mcp:tools:call wallet:accounts:read wallet:transactions:read
```

### 3. Запуск OAuth MCP Server

```bash
cd mcp-server
npm run dev:oauth
```

## OAuth Flows

### Client Credentials Flow (Server-to-Server)

Используется когда MCP сервер работает как сервис без взаимодействия с пользователем:

```typescript
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&
client_id=mcp-demo-client&
client_secret=demo-secret-123&
scope=mcp:tools:list mcp:tools:call wallet:accounts:read
```

### Authorization Code Flow (User Authorization)

Используется когда требуется авторизация пользователя:

1. **Получение кода авторизации:**
```
GET /oauth/authorize?
  response_type=code&
  client_id=mcp-demo-client&
  redirect_uri=http://localhost:8080/callback&
  scope=mcp:tools:list mcp:tools:call&
  state=random-state&
  code_challenge=base64url-encoded-sha256-hash&
  code_challenge_method=S256
```

2. **Обмен кода на токен:**
```typescript
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=received-auth-code&
redirect_uri=http://localhost:8080/callback&
client_id=mcp-demo-client&
code_verifier=original-code-verifier
```

## Области доступа (Scopes)

### MCP Scopes
- `mcp:tools:list` - просмотр доступных инструментов
- `mcp:tools:call` - вызов MCP инструментов
- `mcp:resources:read` - чтение MCP ресурсов
- `mcp:resources:write` - запись MCP ресурсов

### Wallet-specific Scopes  
- `wallet:accounts:read` - чтение информации об аккаунтах
- `wallet:accounts:write` - создание/изменение аккаунтов
- `wallet:transactions:read` - чтение транзакций
- `wallet:transactions:write` - создание/изменение транзакций
- `wallet:analytics:read` - доступ к аналитике

## Dynamic Client Registration

MCP клиенты могут регистрироваться автоматически:

```typescript
POST /oauth/register
Content-Type: application/json

{
  "client_name": "My MCP Client",
  "redirect_uris": ["http://localhost:8080/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "scope": "mcp:tools:list mcp:tools:call"
}
```

Response:
```json
{
  "client_id": "mcp_a1b2c3d4...",
  "client_secret": "secret_xyz...", 
  "client_name": "My MCP Client",
  "redirect_uris": ["http://localhost:8080/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "scope": "mcp:tools:list mcp:tools:call",
  "client_id_issued_at": 1640995200,
  "client_secret_expires_at": 0
}
```

## Использование MCP инструментов

### Доступные инструменты

После авторизации доступны следующие инструменты:

- `ping` - тест соединения с OAuth аутентификацией
- `getTotalBalance` - общий баланс (требует `wallet:accounts:read`)
- `getRecentTransactions` - последние транзакции (требует `wallet:transactions:read`)  
- `getUserAccounts` - список аккаунтов (требует `wallet:accounts:read`)
- `createAccount` - создание аккаунта (требует `wallet:accounts:write`)

### Пример вызова

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "getTotalBalance",
    "arguments": {}
  }
}
```

Response:
```json
{
  "jsonrpc": "2.0", 
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "💰 Total Balance: $5,432.10\nAccounts: 3\nRetrieved with OAuth scope: wallet:accounts:read"
      }
    ]
  }
}
```

## Безопасность

### OAuth 2.1 требования
- ✅ PKCE обязателен для всех публичных клиентов
- ✅ Короткоживущие токены (1 час по умолчанию)
- ✅ HTTPS для production (localhost допускается для разработки)
- ✅ Валидация redirect URIs

### Проверка токенов
- Все API запросы проверяют валидность токена
- Области доступа проверяются для каждого инструмента
- Автоматическое обновление истекших токенов

## Troubleshooting

### Ошибка "invalid_token"
- Проверьте срок действия токена
- Убедитесь, что используете правильный authorization header: `Authorization: Bearer <token>`

### Ошибка "insufficient_scope"  
- Проверьте, что клиент имеет необходимые области доступа
- Обновите scope в конфигурации OAuth клиента

### Ошибка "invalid_client"
- Проверьте client_id и client_secret
- Убедитесь, что клиент зарегистрирован в системе

### Fallback режим
Если OAuth не настроен, система автоматически переключится на токен из переменной окружения `BACKEND_AUTH_TOKEN`.

## Миграция с hardcoded токенов

1. **Остановите старый MCP сервер**
2. **Настройте OAuth конфигурацию** в `.env`
3. **Запустите новый OAuth MCP сервер**: `npm run dev:oauth`
4. **Обновите MCP клиенты** для работы с OAuth flow

## Дальнейшее развитие

- [ ] Поддержка JWT токенов с RSA подписью
- [ ] Интеграция с внешними OAuth провайдерами (Google, Microsoft)  
- [ ] UI для управления OAuth клиентами
- [ ] Поддержка token introspection
- [ ] Rate limiting для OAuth endpoints

## Ссылки

- [MCP Authorization Specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
- [OAuth 2.1 Draft](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/)
- [RFC 7636 - PKCE](https://tools.ietf.org/html/rfc7636)
- [RFC 8414 - Authorization Server Metadata](https://tools.ietf.org/html/rfc8414)
- [RFC 7591 - Dynamic Client Registration](https://tools.ietf.org/html/rfc7591) 