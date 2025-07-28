# 🤖 Discord ModBot - Auto-Moderação com IA

Um bot Discord de auto-moderação que utiliza a Google Perspective API para detectar e remover conteúdo tóxico automaticamente.

## 🚀 Funcionalidades

- **Detecção automática de toxicidade** usando Google Perspective API
- **Deleção automática** de mensagens tóxicas
- **Sistema de avisos** para usuários infratores
- **Mute automático** após atingir o limite de avisos
- **Monitoramento de canais específicos** configurável
- **Comandos de administração** para o proprietário do bot
- **Logs detalhados** de todas as ações
- **Mensagens privadas** para usuários punidos

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- Conta Discord Developer
- Google Perspective API Key
- Bot Discord configurado

## 🛠️ Instalação

1. Clone este repositório ou baixe os arquivos
2. Instale as dependências:
```bash
npm install
```

3. Configure o arquivo `.env` com suas credenciais:
```env
PERSPECTIVE_API_KEY=sua_api_key_aqui
DISCORD_TOKEN=seu_token_do_bot_aqui
OWNER_ID=seu_id_do_discord
MONITORED_CHANNELS=id_canal_1,id_canal_2
TOXICITY_THRESHOLD=0.7
SEVERE_TOXICITY_THRESHOLD=0.8
MUTE_DURATION=600000
MAX_WARNINGS=3
```

4. Inicie o bot:
```bash
npm start
```

## ⚙️ Configurações

### Variáveis do .env

- `PERSPECTIVE_API_KEY`: Sua chave da Google Perspective API
- `DISCORD_TOKEN`: Token do seu bot Discord
- `OWNER_ID`: Seu ID no Discord (para comandos administrativos)
- `MONITORED_CHANNELS`: IDs dos canais a serem monitorados (separados por vírgula)
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
