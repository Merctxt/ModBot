# 🤖 ModBot - Sistema Completo de Moderação com IA

Um sistema completo de moderação automática que inclui:
- **Discord Bot** para moderação automática de servidores
- **API REST** para integração com qualquer aplicação
- **Exemplos práticos** de integração

Utiliza a Google Perspective API para detectar e moderar conteúdo tóxico em tempo real.

## 🚀 Funcionalidades

### Discord Bot
- **Detecção automática de toxicidade** usando Google Perspective API
- **Deleção automática** de mensagens tóxicas
- **Sistema de avisos** para usuários infratores
- **Mute automático** após atingir o limite de avisos
- **Monitoramento de canais específicos** configurável
- **Comandos de administração** para o proprietário do bot
- **Logs detalhados** de todas as ações
- **Mensagens privadas** para usuários punidos

### API REST
- **Moderação de texto** via endpoints REST
- **Análise em lote** para grandes volumes
- **Rate limiting** para controle de uso
- **Autenticação via API key**
- **Integração fácil** com qualquer aplicação
- **Exemplos completos** de uso

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- Google Perspective API Key
- **Para Discord Bot:** Conta Discord Developer
- **Para API:** Servidor web (opcional)

## 🛠️ Instalação

1. Clone este repositório ou baixe os arquivos
2. Instale as dependências:
```bash
npm install
```

3. Configure o arquivo `.env` com suas credenciais:
```env
# Obrigatório - Google Perspective API
PERSPECTIVE_API_KEY=sua_api_key_aqui

# Para Discord Bot
DISCORD_TOKEN=seu_token_do_bot_aqui
OWNER_ID=seu_id_do_discord
MONITORED_CHANNELS=id_canal_1,id_canal_2

# Para API REST
API_PORT=3000
API_SECRET_KEY=sua-chave-secreta-aqui

# Configurações de moderação
TOXICITY_THRESHOLD=0.7
SEVERE_TOXICITY_THRESHOLD=0.8
MUTE_DURATION=600000
MAX_WARNINGS=3
```

## 🎮 Como Usar

### Discord Bot
```bash
npm start        # Inicia o bot Discord
npm run bot      # Inicia apenas o bot (sem verificações)
```

### API REST
```bash
npm run api      # Inicia apenas a API
npm run dev-api  # Inicia API em modo desenvolvimento
```

### Ambos Simultaneamente
Execute em terminais separados:
```bash
# Terminal 1 - Discord Bot
npm start

# Terminal 2 - API REST
npm run api
```

## 📡 API REST - Integração com Aplicações

A ModBot API permite integrar moderação de IA em qualquer aplicação via HTTP REST.

### Endpoints Principais

```http
POST /moderate          # Moderação básica
POST /analyze           # Análise detalhada  
POST /batch            # Análise em lote (requer API key)
GET  /stats            # Estatísticas (requer API key)
GET  /health           # Status da API
```

### Exemplo de Uso

```javascript
// Moderar um texto
const response = await fetch('http://localhost:3000/moderate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        text: "Texto para analisar",
        thresholds: { toxicity: 0.7 }
    })
});

const result = await response.json();
console.log(result.data.isToxic); // true/false
```

### Exemplos Práticos

- **`examples/web-example.js`** - Interface web para testar a API
- **`examples/comment-system.js`** - Sistema de comentários moderado
- **`examples/chat-example.js`** - Chat em tempo real com moderação

Para mais detalhes, consulte: **[ModApi/README.md](ModApi/README.md)**

## ⚙️ Configurações

### Variáveis do .env

**Obrigatório:**
- `PERSPECTIVE_API_KEY`: Sua chave da Google Perspective API

**Discord Bot:**
- `DISCORD_TOKEN`: Token do seu bot Discord
- `OWNER_ID`: Seu ID no Discord (para comandos administrativos)
- `MONITORED_CHANNELS`: IDs dos canais a serem monitorados (separados por vírgula)

**API REST:**
- `API_PORT`: Porta da API (padrão: 3000)
- `API_SECRET_KEY`: Chave secreta para endpoints protegidos

**Moderação:**
- `TOXICITY_THRESHOLD`: Limite de toxicidade (0.0 a 1.0, padrão: 0.7)
- `SEVERE_TOXICITY_THRESHOLD`: Limite de toxicidade severa (padrão: 0.8)
- `MUTE_DURATION`: Duração do mute em milissegundos (padrão: 600000 = 10 minutos)
- `MAX_WARNINGS`: Número máximo de avisos antes do mute (padrão: 3)

## 🎮 Comandos (Apenas para o proprietário)

- `!mod addchannel <id>` - Adiciona um canal à lista de monitoramento
- `!mod removechannel <id>` - Remove um canal da lista de monitoramento
- `!mod listchannels` - Lista todos os canais monitorados
- `!mod warnings <@user>` - Mostra os avisos de um usuário
- `!mod clearwarnings <@user>` - Limpa os avisos de um usuário
- `!mod status` - Mostra o status atual do bot
- `!mod help` - Mostra a lista de comandos

## 🔧 Como obter as credenciais

### Discord Bot Token
1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Crie uma nova aplicação
3. Vá para "Bot" na sidebar
4. Clique em "Add Bot"
5. Copie o token

### Google Perspective API Key
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a Perspective Comment Analyzer API
4. Crie uma credencial de API Key
5. Copie a chave

### Seu Discord ID
1. Ative o Modo Desenvolvedor no Discord (Configurações > Avançado > Modo Desenvolvedor)
2. Clique com o botão direito no seu perfil
3. Selecione "Copiar ID"

### IDs dos Canais
1. Com o Modo Desenvolvedor ativo
2. Clique com o botão direito no canal desejado
3. Selecione "Copiar ID"

## 🛡️ Permissões necessárias para o bot

O bot precisa das seguintes permissões no servidor:
- Ler Mensagens
- Enviar Mensagens
- Gerenciar Mensagens (para deletar)
- Timeout de Membros (para mutar)
- Ver Histórico de Mensagens

## 📊 Como funciona

1. O bot monitora todos os canais configurados
2. Cada mensagem é analisada pela Perspective API
3. Se a toxicidade exceder o limite configurado, a mensagem é deletada
4. O usuário recebe um aviso (via DM)
5. Após atingir o limite de avisos, o usuário é mutado automaticamente
6. Logs são enviados no canal e salvos no sistema

## 🔍 Tipos de conteúdo detectados

- Toxicidade geral
- Toxicidade severa
- Ataques de identidade
- Insultos
- Profanidade
- Ameaças

## 📁 Estrutura de arquivos

```
ModBot/
├── bot.js              # Arquivo principal do bot
├── package.json        # Dependências e scripts
├── .env               # Configurações (não versionar)
├── userData.json      # Dados dos usuários (criado automaticamente)
└── README.md          # Este arquivo
```

## 🐛 Solução de problemas

### Bot não responde
- Verifique se o token está correto
- Verifique se o bot tem as permissões necessárias
- Verifique se o bot está online no servidor

### API não funciona
- Verifique se a chave da Perspective API está correta
- Verifique se a API está ativada no Google Cloud Console
- Verifique sua cota de uso da API

### Comandos não funcionam
- Verifique se você é o proprietário configurado (OWNER_ID)
- Verifique se está usando o prefixo correto (!mod)

## 📝 Logs

O bot salva automaticamente:
- Avisos dos usuários em `userData.json`
- Logs no console com detalhes das ações
- Mensagens de log temporárias nos canais

## 🚨 Importante

- Mantenha seu token Discord e API key seguros
- Não compartilhe o arquivo `.env`
- O proprietário (OWNER_ID) é imune à moderação
- O bot precisa estar online para funcionar

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no console
2. Confirme as configurações do `.env`
3. Verifique as permissões do bot
4. Teste a conectividade com as APIs
