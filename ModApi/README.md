# 🚀 ModBot API - Documentação

Uma API REST para moderação automática de conteúdo usando Google Perspective API. Permite que qualquer aplicação integre funcionalidades de moderação de IA.

## 📋 Índice

- [Instalação e Configuração](#instalação-e-configuração)
- [Autenticação](#autenticação)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
- [Exemplos de Uso](#exemplos-de-uso)
- [Códigos de Status](#códigos-de-status)
- [Integração com Aplicações](#integração-com-aplicações)

## 🛠️ Instalação e Configuração

### 1. Dependências
```bash
npm install express cors helmet rate-limiter-flexible uuid
```

### 2. Configuração do .env
```env
# Configurações da API
API_PORT=3000
API_SECRET_KEY=seu-token-super-secreto-aqui

# Perspective API (obrigatório)
PERSPECTIVE_API_KEY=sua_chave_da_perspective_api

# Configurações de moderação
TOXICITY_THRESHOLD=0.7
SEVERE_TOXICITY_THRESHOLD=0.8
```

### 3. Iniciar a API
```bash
npm run api
# ou para desenvolvimento
npm run dev-api
```

## 🔐 Autenticação

### API Key
Alguns endpoints requerem autenticação via API key:

**Header:**
```
X-API-Key: seu-token-super-secreto-aqui
```

**Query Parameter:**
```
?apiKey=seu-token-super-secreto-aqui
```

### Endpoints Protegidos
- `POST /batch` - Análise em lote
- `GET /stats` - Estatísticas do sistema

## ⚡ Rate Limiting

- **Limite:** 100 requests por minuto
- **Baseado em:** IP + API Key
- **Resposta quando excedido:** HTTP 429

## 📡 Endpoints

### 1. Health Check
```http
GET /health
```

**Resposta:**
```json
{
  "success": true,
  "message": "ModBot API is running",
  "timestamp": "2025-08-27T10:30:00.000Z",
  "version": "1.0.0"
}
```

### 2. Informações da API
```http
GET /info
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "name": "ModBot API",
    "version": "1.0.0",
    "description": "API de moderação automática",
    "endpoints": [...],
    "rateLimit": "100 requests per minute per IP/API key"
  }
}
```

### 3. Moderação Básica
```http
POST /moderate
```

**Body:**
```json
{
  "text": "Texto para analisar",
  "thresholds": {
    "toxicity": 0.7,
    "severeToxicity": 0.8
  },
  "languages": ["pt", "en"]
}
```

**Resposta:**
```json
{
  "success": true,
  "requestId": "uuid-4-request",
  "data": {
    "text": "Texto para analisar",
    "isToxic": false,
    "action": "allow",
    "reason": "Content is safe",
    "confidence": 15,
    "violations": [],
    "timestamp": "2025-08-27T10:30:00.000Z"
  }
}
```

### 4. Análise Detalhada
```http
POST /analyze
```

**Body:**
```json
{
  "text": "Texto para análise detalhada",
  "thresholds": {
    "toxicity": 0.7,
    "insult": 0.6
  },
  "languages": ["pt"],
  "includeScores": true
}
```

**Resposta:**
```json
{
  "success": true,
  "requestId": "uuid-4-request",
  "data": {
    "text": "Texto para análise detalhada",
    "analysis": {
      "isToxic": false,
      "confidence": 12,
      "maxScore": 0.12,
      "violations": [],
      "reason": "Content is safe"
    },
    "recommendation": {
      "action": "allow",
      "severity": "low"
    },
    "scores": {
      "toxicity": 0.12,
      "severeToxicity": 0.05,
      "identityAttack": 0.08,
      "insult": 0.10,
      "profanity": 0.03,
      "threat": 0.02
    },
    "metadata": {
      "textLength": 32,
      "timestamp": "2025-08-27T10:30:00.000Z",
      "thresholds": {...}
    }
  }
}
```

### 5. Análise em Lote (🔒 Requer API Key)
```http
POST /batch
X-API-Key: sua-api-key
```

**Body:**
```json
{
  "texts": [
    "Primeiro texto",
    "Segundo texto",
    "Terceiro texto"
  ],
  "thresholds": {
    "toxicity": 0.7
  },
  "maxConcurrent": 3
}
```

**Resposta:**
```json
{
  "success": true,
  "requestId": "uuid-4-request",
  "data": {
    "results": [
      {
        "index": 0,
        "text": "Primeiro texto",
        "isToxic": false,
        "confidence": 10,
        "violations": [],
        "action": "allow"
      }
    ],
    "summary": {
      "total": 3,
      "toxic": 0,
      "safe": 3,
      "errors": 0
    },
    "timestamp": "2025-08-27T10:30:00.000Z"
  }
}
```

### 6. Estatísticas (🔒 Requer API Key)
```http
GET /stats
X-API-Key: sua-api-key
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "api": {
      "version": "1.0.0",
      "uptime": 3600,
      "memoryUsage": {...},
      "platform": "win32"
    },
    "configuration": {
      "toxicityThreshold": 0.7,
      "rateLimitPerMinute": 100,
      "maxTextLength": 3000
    }
  }
}
```

## 💡 Exemplos de Uso

### JavaScript/Node.js
```javascript
const axios = require('axios');

// Moderação básica
async function moderateText(text) {
  try {
    const response = await axios.post('http://localhost:3000/moderate', {
      text: text,
      thresholds: {
        toxicity: 0.6,
        insult: 0.7
      }
    });
    
    const { isToxic, action, confidence } = response.data.data;
    
    if (isToxic) {
      console.log(`Conteúdo bloqueado! Confiança: ${confidence}%`);
    } else {
      console.log('Conteúdo aprovado!');
    }
    
    return response.data;
  } catch (error) {
    console.error('Erro na moderação:', error.message);
  }
}

// Uso
moderateText("Este é um texto para testar");
```

### Python
```python
import requests

def moderate_text(text):
    url = "http://localhost:3000/moderate"
    data = {
        "text": text,
        "thresholds": {
            "toxicity": 0.7
        }
    }
    
    response = requests.post(url, json=data)
    result = response.json()
    
    if result["success"]:
        analysis = result["data"]
        if analysis["isToxic"]:
            print(f"Conteúdo tóxico detectado! Ação: {analysis['action']}")
        else:
            print("Conteúdo seguro")
    
    return result

# Uso
moderate_text("Texto para análise")
```

### cURL
```bash
# Moderação básica
curl -X POST http://localhost:3000/moderate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Texto para analisar",
    "thresholds": {
      "toxicity": 0.7
    }
  }'

# Análise em lote (com API key)
curl -X POST http://localhost:3000/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-api-key" \
  -d '{
    "texts": ["Texto 1", "Texto 2"],
    "thresholds": {"toxicity": 0.6}
  }'
```

### PHP
```php
<?php
function moderateText($text) {
    $url = 'http://localhost:3000/moderate';
    $data = [
        'text' => $text,
        'thresholds' => [
            'toxicity' => 0.7
        ]
    ];
    
    $options = [
        'http' => [
            'header' => "Content-Type: application/json\r\n",
            'method' => 'POST',
            'content' => json_encode($data)
        ]
    ];
    
    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    
    return json_decode($result, true);
}

// Uso
$result = moderateText("Texto para verificar");
if ($result['data']['isToxic']) {
    echo "Conteúdo bloqueado!";
} else {
    echo "Conteúdo aprovado!";
}
?>
```

## 🌐 Integração com Aplicações

### Websites/CMS
```javascript
// Validação de comentários em tempo real
document.getElementById('comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const comment = document.getElementById('comment').value;
    
    try {
        const response = await fetch('/api/moderate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: comment })
        });
        
        const result = await response.json();
        
        if (result.data.isToxic) {
            alert('Seu comentário contém conteúdo inadequado e não pode ser publicado.');
            return;
        }
        
        // Submeter comentário
        submitComment(comment);
    } catch (error) {
        console.error('Erro na moderação:', error);
    }
});
```

### Chat Applications
```javascript
// Middleware para chat em tempo real
const moderateMessage = async (message) => {
    const response = await axios.post('http://localhost:3000/moderate', {
        text: message,
        thresholds: { toxicity: 0.6 }
    });
    
    return response.data.data;
};

// Socket.io exemplo
io.on('connection', (socket) => {
    socket.on('message', async (data) => {
        const moderation = await moderateMessage(data.text);
        
        if (moderation.isToxic) {
            socket.emit('message_blocked', {
                reason: moderation.reason,
                confidence: moderation.confidence
            });
        } else {
            io.emit('message', data);
        }
    });
});
```

### Fóruns/Redes Sociais
```javascript
// Moderação de posts
const moderatePost = async (postContent) => {
    const response = await fetch('http://localhost:3000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: postContent,
            includeScores: true,
            thresholds: {
                toxicity: 0.7,
                insult: 0.6,
                threat: 0.5
            }
        })
    });
    
    const result = await response.json();
    const analysis = result.data.analysis;
    
    if (analysis.isToxic) {
        if (analysis.confidence > 90) {
            return 'block'; // Bloquear imediatamente
        } else if (analysis.confidence > 70) {
            return 'review'; // Enviar para revisão manual
        } else {
            return 'flag'; // Apenas marcar para monitoramento
        }
    }
    
    return 'approve';
};
```

## 📊 Códigos de Status HTTP

| Código | Significado | Descrição |
|--------|-------------|-----------|
| 200 | OK | Requisição processada com sucesso |
| 400 | Bad Request | Dados inválidos na requisição |
| 401 | Unauthorized | API key inválida ou ausente |
| 404 | Not Found | Endpoint não encontrado |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Internal Server Error | Erro interno do servidor |

## ⚙️ Configurações Avançadas

### Thresholds Personalizados
```json
{
  "text": "Texto para analisar",
  "thresholds": {
    "toxicity": 0.8,        // Toxicidade geral
    "severeToxicity": 0.9,  // Toxicidade severa
    "identityAttack": 0.7,  // Ataques de identidade
    "insult": 0.6,          // Insultos
    "profanity": 0.5,       // Palavrões
    "threat": 0.8           // Ameaças
  }
}
```

### Rate Limiting Personalizado
Edite no código da API:
```javascript
const rateLimiter = new RateLimiterMemory({
    points: 200,      // Requests por período
    duration: 60,     // Período em segundos
});
```

## 🔒 Segurança

### Boas Práticas
1. **Mude a API key padrão** no `.env`
2. **Use HTTPS** em produção
3. **Implemente logs de auditoria**
4. **Configure firewall** para limitar acesso
5. **Monitore uso da API** regularmente

### Exemplo de Proxy Reverso (Nginx)
```nginx
server {
    listen 80;
    server_name sua-api.exemplo.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Rate limiting adicional
        limit_req zone=api_limit burst=20 nodelay;
    }
}
```

## 🚀 Deploy em Produção

### PM2 (Recomendado)
```bash
npm install -g pm2

# Iniciar
pm2 start ModApi/ModBotApi.js --name "modbot-api"

# Configurar auto-restart
pm2 startup
pm2 save
```

### Docker
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["node", "ModApi/ModBotApi.js"]
```

### Variáveis de Ambiente para Produção
```env
NODE_ENV=production
API_PORT=3000
API_SECRET_KEY=chave-super-secreta-production
PERSPECTIVE_API_KEY=sua_chave_production
```

## 📈 Monitoramento

### Health Check
Configure monitoramento automático:
```bash
# Verificar se a API está funcionando
curl -f http://localhost:3000/health || exit 1
```

### Logs
Os logs incluem:
- Todas as requisições com request ID
- Erros da Perspective API
- Rate limiting ativado
- Estatísticas de uso

## 🆘 Suporte

Para problemas específicos da API:
1. Verifique os logs do console
2. Teste com `curl` ou Postman
3. Confirme que a Perspective API está funcionando
4. Verifique rate limits

---

**Versão:** 1.0.0  
**Última atualização:** Agosto 2025
