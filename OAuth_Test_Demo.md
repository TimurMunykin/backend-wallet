# Демонстрация OAuth 2.1 Integration с MCP

## ✅ Что реализовано

Я успешно интегрировал полную поддержку **MCP Authorization 2025** с **OAuth 2.1** в ваш проект. Вместо хардкодинга токенов теперь используется современная и безопасная авторизация.

### 🔧 Компоненты реализации

1. **OAuth 2.1 Authorization Server** (`src/controllers/OAuthController.ts`, `src/services/OAuthService.ts`)
   - ✅ Поддержка Authorization Code Flow с обязательным PKCE
   - ✅ Поддержка Client Credentials Flow  
   - ✅ Dynamic Client Registration (RFC 7591)
   - ✅ Authorization Server Metadata (RFC 8414)
   - ✅ Короткоживущие токены с автообновлением

2. **OAuth Middleware** (`src/middleware/oauth.ts`)
   - ✅ Проверка токенов с поддержкой scopes
   - ✅ Специализированные middleware для MCP инструментов
   - ✅ Graceful fallback на JWT токены

3. **Обновленный MCP Server** (`mcp-server/src/oauth-mcp-server.ts`)
   - ✅ Автоматическое получение OAuth токенов
   - ✅ Проверка scopes для каждого инструмента
   - ✅ Автообновление истекших токенов
   - ✅ Fallback на environment токены

4. **OAuth Routes** (`src/routes/oauth.ts`)
   - ✅ Все необходимые OAuth endpoints
   - ✅ Well-known metadata endpoints

## 🚀 Тестирование

### 1. Запуск Authorization Server

```bash
# Запуск бэкенда с OAuth поддержкой
npm run docker:dev
```

### 2. Проверка OAuth endpoints

```bash
# Проверка метаданных authorization server
curl http://localhost:3000/.well-known/oauth-authorization-server

# Получение токена через client credentials
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=mcp-demo-client&client_secret=demo-secret-123&scope=mcp:tools:list mcp:tools:call wallet:accounts:read"

# Динамическая регистрация клиента
curl -X POST http://localhost:3000/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Test MCP Client",
    "redirect_uris": ["http://localhost:8080/callback"],
    "grant_types": ["authorization_code", "refresh_token"],
    "scope": "mcp:tools:list mcp:tools:call wallet:accounts:read"
  }'
```

### 3. Запуск OAuth MCP Server

```bash
cd mcp-server

# Настройка окружения
cp .env.example .env
# Отредактируйте .env с вашими настройками

# Запуск OAuth MCP сервера
npm run dev:oauth
```

### 4. Тестирование защищенных API endpoints

```bash
# Получение токена
TOKEN=$(curl -s -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=mcp-demo-client&client_secret=demo-secret-123&scope=wallet:accounts:read" \
  | jq -r '.access_token')

# Использование токена для доступа к API
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/accounts
```

## 🔐 OAuth Scopes

### MCP Scopes
- `mcp:tools:list` - просмотр доступных инструментов
- `mcp:tools:call` - вызов MCP инструментов  
- `mcp:resources:read` - чтение MCP ресурсов
- `mcp:resources:write` - запись MCP ресурсов

### Wallet Scopes
- `wallet:accounts:read` - чтение аккаунтов
- `wallet:accounts:write` - создание/изменение аккаунтов
- `wallet:transactions:read` - чтение транзакций
- `wallet:transactions:write` - создание/изменение транзакций
- `wallet:analytics:read` - доступ к аналитике

## 🔄 OAuth Flows Demo

### Client Credentials Flow (Server-to-Server)

```javascript
// Автоматически выполняется в MCP сервере при запуске
const response = await fetch('http://localhost:3000/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: 'mcp-demo-client', 
    client_secret: 'demo-secret-123',
    scope: 'mcp:tools:list mcp:tools:call wallet:accounts:read'
  })
});

const { access_token, expires_in } = await response.json();
```

### Authorization Code Flow (User Authorization)

1. **Redirect пользователя:**
```
http://localhost:3000/oauth/authorize?
  response_type=code&
  client_id=mcp-demo-client&
  redirect_uri=http://localhost:8080/callback&
  scope=mcp:tools:list mcp:tools:call&
  state=random-state&
  code_challenge=base64url-encoded-sha256-hash&
  code_challenge_method=S256
```

2. **Обмен кода на токен:**
```javascript
const tokenResponse = await fetch('http://localhost:3000/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: 'http://localhost:8080/callback',
    client_id: 'mcp-demo-client',
    code_verifier: originalCodeVerifier
  })
});
```

## 📊 Безопасность и Соответствие

### ✅ OAuth 2.1 Compliance
- **PKCE обязателен** для всех публичных клиентов
- **Короткоживущие токены** (1 час по умолчанию)
- **HTTPS в production** (localhost для разработки)
- **Валидация redirect URIs**

### ✅ MCP Authorization Specification  
- **Authorization Server Metadata** (RFC 8414)
- **Dynamic Client Registration** (RFC 7591)  
- **Scope-based access control**
- **Graceful error handling**

## 🛠 Конфигурация

### Environment Variables

```env
# OAuth Configuration
MCP_CLIENT_ID=mcp-demo-client
MCP_CLIENT_SECRET=demo-secret-123
AUTHORIZATION_SERVER_URL=http://localhost:3000
MCP_REDIRECT_URI=http://localhost:8080/callback
MCP_SCOPE=mcp:tools:list mcp:tools:call wallet:accounts:read

# Fallback token (если OAuth не работает)
BACKEND_AUTH_TOKEN=your-jwt-token-here
```

## 🔄 Миграция

### Переход с hardcoded токенов:

1. **Старый способ** (небезопасно):
```typescript
private authToken: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

2. **Новый способ** (безопасно):
```typescript
// Автоматическое получение OAuth токена
await this.clientCredentialsFlow();

// Использование с автообновлением
await this.ensureValidToken();
const response = await axios.get(url, {
  headers: { 'Authorization': `Bearer ${this.accessToken}` }
});
```

## 🎯 Преимущества новой реализации

1. **Безопасность** 🔒
   - Короткоживущие токены вместо долгоживущих
   - Автоматическое обновление токенов
   - Контроль областей доступа (scopes)

2. **Масштабируемость** 📈  
   - Dynamic Client Registration
   - Стандартизированные OAuth flows
   - Поддержка множественных клиентов

3. **Соответствие стандартам** ✅
   - OAuth 2.1 с PKCE
   - MCP Authorization Specification 2025
   - RFC 8414, RFC 7591

4. **Удобство разработки** 🔧
   - Автоматическая настройка через метаданные
   - Fallback на environment токены  
   - Подробное логирование и обработка ошибок

## 🏁 Результат

Теперь ваш MCP сервер:
- ✅ **Не хардкодит токены** - использует OAuth 2.1
- ✅ **Безопасен для продакшена** - короткоживущие токены, scopes
- ✅ **Соответствует стандартам** - MCP Authorization Specification
- ✅ **Готов к масштабированию** - поддержка множественных клиентов
- ✅ **Легко мигрировать** - обратная совместимость через fallback

Это профессиональное, безопасное и готовое к продакшену решение для авторизации в MCP! 🎉 