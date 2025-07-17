# 🔒 SSL Setup Guide - Backend-Wallet с Let's Encrypt

Это руководство поможет вам настроить HTTPS для вашего backend-wallet проекта с автоматическими SSL сертификатами от Let's Encrypt.

## 📋 Предварительные требования

### 1. Домен и DNS
- ✅ Зарегистрированный домен (например, `example.com`)
- ✅ A-запись домена указывает на IP вашего сервера
- ✅ Дополнительно: A-запись для `www.example.com`

### 2. Сервер
- ✅ Ubuntu/Debian/CentOS Linux сервер
- ✅ Docker и Docker Compose установлены
- ✅ Порты 80 и 443 открыты в firewall
- ✅ Права на запуск Docker без sudo (рекомендуется)

### 3. Проект
- ✅ Backend-wallet проект склонирован
- ✅ Все файлы из этого commit применены

## 🚀 Быстрая настройка

### Шаг 1: Клонирование и подготовка
```bash
# Клонируем проект (если еще не сделано)
git clone <your-repo-url>
cd backend-wallet

# Убеждаемся что скрипты исполняемые
chmod +x init-letsencrypt.sh renew-ssl.sh
```

### Шаг 2: Настройка домена
```bash
# Откройте скрипт инициализации
nano init-letsencrypt.sh

# Измените эти строки:
DOMAIN="your-domain.com"          # Замените на ваш домен
EMAIL="your-email@example.com"    # Замените на ваш email
STAGING=1                         # Оставьте 1 для тестирования
```

### Шаг 3: Запуск инициализации SSL
```bash
# Запускаем инициализацию (тестовый режим)
./init-letsencrypt.sh

# Если все прошло успешно, переключаемся на продакшн
# Измените STAGING=0 в скрипте и запустите снова
nano init-letsencrypt.sh  # STAGING=0
./init-letsencrypt.sh
```

### Шаг 4: Проверка
```bash
# Проверяем статус
./renew-ssl.sh status

# Тестируем обновление сертификатов
./renew-ssl.sh test

# Проверяем сайт в браузере
# https://your-domain.com
```

## 📁 Структура файлов SSL

После настройки у вас будет следующая структура:

```
backend-wallet/
├── docker-compose.yml           # Обновлен для SSL
├── init-letsencrypt.sh         # Скрипт инициализации SSL
├── renew-ssl.sh               # Скрипт обновления сертификатов
├── env.example                # Пример переменных окружения
├── nginx/
│   ├── nginx.conf             # Основная конфигурация nginx
│   ├── sites-enabled/
│   │   └── backend-wallet.conf # SSL конфигурация сайта
│   └── ssl/                   # TLS параметры
├── certbot/
│   ├── conf/                  # Сертификаты Let's Encrypt
│   └── www/                   # Веб-вызов ACME
└── SSL_SETUP_GUIDE.md         # Этот файл
```

## ⚙️ Детальная настройка

### 1. Настройка переменных окружения
```bash
# Скопируйте пример
cp env.example .env

# Отредактируйте переменные
nano .env
```

Важные переменные для SSL:
```bash
# Замените на ваш домен
FRONTEND_URL=https://your-domain.com
API_URL=https://your-domain.com

# SSL настройки
SSL_DOMAIN=your-domain.com
SSL_EMAIL=your-email@example.com
SSL_STAGING=0  # 0 для продакшн, 1 для тестирования
```

### 2. Настройка nginx конфигурации

#### Обновление домена в nginx
```bash
# Автоматически заменяется скриптом init-letsencrypt.sh
# Или вручную:
sed -i 's/your-domain.com/example.com/g' nginx/sites-enabled/backend-wallet.conf
```

#### Кастомизация nginx (опционально)
```bash
# Отредактируйте nginx конфигурацию
nano nginx/sites-enabled/backend-wallet.conf
```

Основные секции:
- **HTTP → HTTPS редирект** (порт 80)
- **HTTPS сервер** (порт 443)
- **Проксирование API** (`/api/` → backend:3000)
- **MCP интеграция** (`/mcp/` → backend:3000) 
- **OAuth endpoints** (`/oauth/` → backend:3000)
- **Frontend статика** (React SPA)

### 3. Запуск и тестирование

#### Проверка DNS
```bash
# Убедитесь что домен указывает на ваш сервер
dig +short your-domain.com
curl -I ifconfig.me  # Должен совпадать с выводом dig
```

#### Запуск в тестовом режиме
```bash
# Инициализация с staging сертификатами
STAGING=1 ./init-letsencrypt.sh
```

#### Переход на продакшн
```bash
# Обновите скрипт
sed -i 's/STAGING=1/STAGING=0/' init-letsencrypt.sh

# Запустите для получения реальных сертификатов
./init-letsencrypt.sh
```

## 🔧 Управление сертификатами

### Автоматическое обновление
Сертификаты автоматически обновляются через docker-compose:
- **Certbot контейнер** проверяет каждые 12 часов
- **Nginx контейнер** перезагружается каждые 6 часов

### Ручное управление
```bash
# Проверка статуса
./renew-ssl.sh status

# Тестирование обновления (dry run)
./renew-ssl.sh test

# Принудительное обновление
./renew-ssl.sh renew

# Просмотр логов
./renew-ssl.sh logs

# Помощь
./renew-ssl.sh help
```

### npm скрипты
```bash
# Инициализация SSL
npm run ssl:init

# Обновление сертификатов
npm run ssl:renew

# Тест обновления
npm run ssl:test

# Логи SSL
npm run ssl:logs
```

## 🛡️ Безопасность

### SSL/TLS настройки
- ✅ **TLS 1.2+ только** (TLS 1.0/1.1 отключены)
- ✅ **Современные шифры** (ECDHE, ChaCha20-Poly1305)
- ✅ **HSTS заголовок** (принудительный HTTPS)
- ✅ **OCSP Stapling** (быстрая проверка сертификатов)

### Security Headers
- ✅ **X-Frame-Options**: защита от clickjacking
- ✅ **X-Content-Type-Options**: защита от MIME sniffing
- ✅ **X-XSS-Protection**: защита от XSS
- ✅ **Referrer-Policy**: контроль передачи referrer
- ✅ **Content-Security-Policy**: базовая CSP

### Rate Limiting
- ✅ **API endpoints**: 10 запросов/сек с burst 20
- ✅ **Auth endpoints**: 5 запросов/сек с burst 5
- ✅ **По IP адресам** с sliding window

## 🔍 Мониторинг и диагностика

### Проверка SSL
```bash
# Проверка сертификата
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Онлайн проверка SSL
# https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

### Логи
```bash
# Nginx логи
docker-compose logs nginx

# Certbot логи
docker-compose logs certbot

# Все логи
docker-compose logs

# Следить за логами в реальном времени
docker-compose logs -f nginx certbot
```

### Проверка конфигурации
```bash
# Тест nginx конфигурации
docker-compose exec nginx nginx -t

# Перезагрузка nginx
docker-compose exec nginx nginx -s reload

# Проверка статуса сервисов
docker-compose ps
```

## 🚨 Решение проблем

### Проблема: Домен не резолвится
```bash
# Проверка DNS
dig +short your-domain.com
nslookup your-domain.com

# Решение: убедитесь что A-запись указывает на правильный IP
```

### Проблема: Let's Encrypt rate limit
```bash
# Если превышен лимит запросов
# Решение: используйте staging пока не убедитесь что все работает
STAGING=1 ./init-letsencrypt.sh
```

### Проблема: Nginx не запускается
```bash
# Проверка конфигурации
docker-compose exec nginx nginx -t

# Проверка логов
docker-compose logs nginx

# Решение: исправьте синтаксис в nginx/sites-enabled/backend-wallet.conf
```

### Проблема: Сертификат не обновляется
```bash
# Проверка статуса
./renew-ssl.sh status

# Тест обновления
./renew-ssl.sh test

# Принудительное обновление
docker-compose exec certbot certbot renew --force-renewal
```

### Проблема: 502 Bad Gateway
```bash
# Проверка backend контейнера
docker-compose ps app
docker-compose logs app

# Решение: убедитесь что backend запущен на порту 3000
```

## 📚 Дополнительные ресурсы

### Let's Encrypt
- [Документация Let's Encrypt](https://letsencrypt.org/docs/)
- [Лимиты Let's Encrypt](https://letsencrypt.org/docs/rate-limits/)

### Nginx SSL
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)

### Security Testing
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- [Security Headers Test](https://securityheaders.com/)

## 🎯 Заключение

После успешной настройки у вас будет:

✅ **Автоматический HTTPS** с редиректом с HTTP  
✅ **Автообновляющиеся SSL сертификаты** каждые 3 месяца  
✅ **A+ рейтинг SSL** на SSL Labs  
✅ **Reverse proxy** с оптимизацией производительности  
✅ **Security headers** для защиты от атак  
✅ **Rate limiting** для предотвращения злоупотреблений  
✅ **Готовность к продакшн** использованию  

Ваш backend-wallet теперь полностью готов для безопасного использования в продакшн среде!

## 📞 Поддержка

Если у вас возникли проблемы:

1. **Проверьте логи**: `./renew-ssl.sh logs`
2. **Проверьте статус**: `./renew-ssl.sh status`  
3. **Тестируйте в staging**: измените `STAGING=1`
4. **Проверьте DNS**: убедитесь что домен указывает на сервер

Удачного использования! 🚀 