# 🔧 Solução de Problemas - Discord ModBot

## ❌ Erros Comuns e Soluções

### 1. **DiscordAPIError[10008]: Unknown Message**
**Causa:** Tentativa de deletar uma mensagem que já foi deletada ou não existe.

**Solução:** ✅ **JÁ CORRIGIDO** - O bot agora verifica se a mensagem existe antes de tentar deletá-la.

**Como identificar:**
```
Erro ao processar mensagem: DiscordAPIError[10008]: Unknown Message
```

**Status:** Resolvido na versão atual do bot.

---

### 2. **DiscordAPIError[50013]: Missing Permissions**
**Causa:** O bot não tem permissões necessárias no servidor.

**Soluções:**
1. Verifique se o bot tem as permissões necessárias:
   - ✅ Ler Mensagens (`ViewChannel`)
   - ✅ Enviar Mensagens (`SendMessages`)
   - ✅ Gerenciar Mensagens (`ManageMessages`)
   - ✅ Timeout de Membros (`ModerateMembers`)

2. Use o comando `!mod diagnose` para verificar permissões
3. Reenvie o convite do bot com as permissões corretas

---

### 3. **Erro de conexão com a Perspective API**
**Causa:** Problemas com a chave da API ou limite de quota.

**Soluções:**
1. Verifique se a `PERSPECTIVE_API_KEY` está correta no `.env`
2. Confirme que a API está ativa no Google Cloud Console
3. Verifique sua quota no [Google Cloud Console](https://console.cloud.google.com/)

**Como identificar:**
```
Erro da Perspective API (400): API key not valid
Erro de conexão com a Perspective API: timeout
```

---

### 4. **Bot não responde a comandos**
**Causa:** Várias possibilidades.

**Soluções:**
1. Verifique se você é o proprietário configurado (`OWNER_ID`)
2. Confirme que está usando o prefixo correto (`!mod`)
3. Verifique se o bot está online e conectado
4. Use `!mod diagnose` para verificar o status

---

### 5. **Mensagens não são detectadas como tóxicas**
**Causa:** Configuração de threshold ou problemas com a API.

**Soluções:**
1. Ajuste o `TOXICITY_THRESHOLD` no `.env` (padrão: 0.7)
2. Teste com mensagens claramente tóxicas
3. Verifique os logs para ver se a API está respondendo
4. Use `!mod status` para ver as configurações atuais

---

### 6. **Bot muta usuários incorretamente**
**Causa:** Configuração de avisos ou threshold muito baixo.

**Soluções:**
1. Ajuste `MAX_WARNINGS` no `.env` (padrão: 3)
2. Aumente `TOXICITY_THRESHOLD` se necessário
3. Use `!mod clearwarnings <user>` para limpar avisos
4. Monitore os logs para entender os scores de toxicidade

---

## 🛠️ Comandos de Diagnóstico

### Verificar Status Geral
```
!mod status
```

### Diagnóstico Completo
```
!mod diagnose
```

### Verificar Avisos de Usuário
```
!mod warnings @usuario
```

### Listar Canais Monitorados
```
!mod listchannels
```

---

## 📊 Interpretando os Logs

### Log de Mensagem Deletada
```
💀 Mensagem deletada de Usuario#1234: "exemplo de mensagem" (Toxicidade: 85.2%)
```
- **Usuario#1234:** Autor da mensagem
- **"exemplo...":** Prévia da mensagem (limitada a 50 chars)
- **85.2%:** Score de toxicidade da Perspective API

### Log de Erro de Permissão
```
❌ Sem permissão para deletar mensagem de Usuario#1234
```
- Indica que o bot não tem permissão `ManageMessages`

### Log de Mensagem Não Encontrada
```
⚠️ Mensagem não encontrada ou já deletada de Usuario#1234
```
- Mensagem foi deletada por outro moderador ou pelo próprio usuário

---

## 🔍 Verificações Manuais

### 1. Configuração do .env
```env
PERSPECTIVE_API_KEY=sua_chave_aqui          # ✅ Deve estar preenchida
DISCORD_TOKEN=seu_token_aqui                # ✅ Deve estar preenchida
OWNER_ID=seu_id_aqui                        # ✅ Deve ser seu ID do Discord
MONITORED_CHANNELS=canal1,canal2            # ✅ IDs dos canais (opcional no início)
TOXICITY_THRESHOLD=0.7                      # ✅ Entre 0.0 e 1.0
```

### 2. Permissões do Bot no Discord
1. Acesse as configurações do servidor
2. Vá em "Funções" ou "Roles"
3. Encontre a função do bot
4. Verifique as permissões mencionadas acima

### 3. Status da Perspective API
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Vá em "APIs e Serviços" > "Credenciais"
3. Verifique se sua chave está ativa
4. Vá em "Quotas" para verificar o uso

---

## 🚨 Em Caso de Emergência

### Parar o Bot
```bash
Ctrl + C (no terminal onde o bot está rodando)
```

### Remover Canal do Monitoramento Rapidamente
```
!mod removechannel ID_DO_CANAL
```

### Limpar Todos os Avisos de um Usuário
```
!mod clearwarnings @usuario
```

### Verificar se o Bot Está Funcionando
```
!mod help
```

---

## 📞 Quando Pedir Ajuda

Se você encontrar um erro que não está listado aqui:

1. ✅ Copie a mensagem de erro completa
2. ✅ Informe o que você estava fazendo quando o erro ocorreu
3. ✅ Execute `!mod diagnose` e inclua o resultado
4. ✅ Verifique os logs no console
5. ✅ Inclua as configurações relevantes do `.env` (sem expor chaves secretas)

---

## 🔄 Atualizações e Melhorias

Este arquivo será atualizado conforme novos problemas forem identificados e resolvidos. 

**Última atualização:** Versão 1.0 - Julho 2025
