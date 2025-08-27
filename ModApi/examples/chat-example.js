// Exemplo de integração com chat em tempo real usando Socket.IO
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 3002;
const MODBOT_API_URL = 'http://localhost:3000';

// Configurações de moderação para chat
const CHAT_THRESHOLDS = {
    toxicity: 0.6,        // Mais restritivo para chat
    severeToxicity: 0.7,
    insult: 0.5,
    profanity: 0.4,
    threat: 0.6
};

// Sistema de usuários e salas
const users = new Map();
const rooms = new Map();
const bannedUsers = new Set();
const userWarnings = new Map();

// Classe para gerenciar moderação do chat
class ChatModerator {
    constructor() {
        this.msgCache = new Map(); // Cache para evitar análises duplicadas
        this.cacheTimeout = 300000; // 5 minutos
    }

    async moderateMessage(message, userId, roomId) {
        try {
            // Verificar cache primeiro
            const cacheKey = this.createCacheKey(message);
            if (this.msgCache.has(cacheKey)) {
                const cached = this.msgCache.get(cacheKey);
                console.log(`[CACHE] Resultado cacheado para mensagem de ${userId}`);
                return cached;
            }

            const response = await axios.post(`${MODBOT_API_URL}/moderate`, {
                text: message,
                thresholds: CHAT_THRESHOLDS
            });

            if (response.data.success) {
                const result = {
                    approved: !response.data.data.isToxic,
                    confidence: response.data.data.confidence,
                    violations: response.data.data.violations,
                    reason: response.data.data.reason,
                    action: this.determineAction(response.data.data, userId)
                };

                // Adicionar ao cache
                this.msgCache.set(cacheKey, result);
                setTimeout(() => this.msgCache.delete(cacheKey), this.cacheTimeout);

                return result;
            }

            throw new Error('Moderation API failed');

        } catch (error) {
            console.error('[CHAT MODERATION ERROR]', error.message);
            
            // Em caso de erro, permitir mensagem mas logar
            return {
                approved: true,
                confidence: 0,
                violations: [],
                reason: 'Moderation service unavailable',
                action: 'allow_with_warning',
                error: error.message
            };
        }
    }

    createCacheKey(message) {
        return Buffer.from(message.toLowerCase().trim()).toString('base64');
    }

    determineAction(moderationData, userId) {
        if (!moderationData.isToxic) {
            return 'allow';
        }

        const warnings = userWarnings.get(userId) || 0;
        
        if (moderationData.confidence >= 85) {
            return 'block_and_warn';
        } else if (moderationData.confidence >= 70) {
            return warnings >= 2 ? 'block_and_timeout' : 'block_and_warn';
        } else {
            return 'allow_with_flag';
        }
    }

    addWarning(userId) {
        const current = userWarnings.get(userId) || 0;
        userWarnings.set(userId, current + 1);
        return current + 1;
    }

    clearWarnings(userId) {
        userWarnings.delete(userId);
    }
}

const moderator = new ChatModerator();

// Servir página HTML do chat
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Moderado - ModBot</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f0f0f0; }
        .chat-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .chat-header { background: #007bff; color: white; padding: 15px; text-align: center; }
        .chat-messages { height: 400px; overflow-y: auto; padding: 15px; border-bottom: 1px solid #eee; }
        .message { margin: 10px 0; padding: 8px 12px; border-radius: 8px; max-width: 70%; }
        .message.own { background: #007bff; color: white; margin-left: auto; text-align: right; }
        .message.other { background: #e9ecef; }
        .message.system { background: #ffc107; color: #212529; text-align: center; font-style: italic; margin: 5px auto; max-width: 90%; }
        .message.blocked { background: #dc3545; color: white; text-align: center; margin: 5px auto; max-width: 90%; }
        .message-info { font-size: 0.8em; opacity: 0.7; margin-bottom: 5px; }
        .chat-input { display: flex; padding: 15px; background: #f8f9fa; }
        .chat-input input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-right: 10px; }
        .chat-input button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .chat-input button:hover { background: #0056b3; }
        .user-info { padding: 10px 15px; background: #e9ecef; font-size: 0.9em; }
        .status { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; }
        .status.connected { background: #28a745; }
        .status.disconnected { background: #dc3545; }
        .moderation-info { background: #fff3cd; padding: 10px; margin: 5px 0; border-radius: 4px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h2>🤖 Chat com Moderação IA</h2>
            <div class="user-info">
                <span class="status connected"></span>
                <span id="userInfo">Conectando...</span>
            </div>
        </div>
        
        <div class="chat-messages" id="messages"></div>
        
        <div class="chat-input">
            <input type="text" id="messageInput" placeholder="Digite sua mensagem..." maxlength="500">
            <button onclick="sendMessage()">Enviar</button>
        </div>
    </div>

    <script>
        const socket = io();
        let username = '';
        let userId = '';

        // Gerar ID de usuário único
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        username = prompt('Digite seu nome:') || 'Anônimo';

        // Conectar ao chat
        socket.emit('join_chat', { username, userId });

        // Eventos do socket
        socket.on('user_joined', (data) => {
            addSystemMessage(\`👋 \${data.username} entrou no chat\`);
            updateUserInfo(data.userCount);
        });

        socket.on('user_left', (data) => {
            addSystemMessage(\`👋 \${data.username} saiu do chat\`);
            updateUserInfo(data.userCount);
        });

        socket.on('message', (data) => {
            addMessage(data.username, data.message, false);
        });

        socket.on('message_blocked', (data) => {
            addBlockedMessage(\`Sua mensagem foi bloqueada: \${data.reason} (Confiança: \${data.confidence}%)\`);
            if (data.warnings) {
                addModerationInfo(\`Avisos: \${data.warnings}/3. Cuidado com o conteúdo de suas mensagens!\`);
            }
        });

        socket.on('user_warned', (data) => {
            addSystemMessage(\`⚠️ \${data.username} recebeu um aviso por conteúdo inadequado\`);
        });

        socket.on('user_timeout', (data) => {
            addSystemMessage(\`🔇 \${data.username} foi temporariamente silenciado por \${data.duration}s\`);
        });

        socket.on('moderation_error', (data) => {
            addModerationInfo('⚠️ Sistema de moderação temporariamente indisponível');
        });

        // Funções da interface
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (message) {
                socket.emit('send_message', {
                    username,
                    userId,
                    message
                });
                
                addMessage(username, message, true);
                input.value = '';
            }
        }

        function addMessage(username, message, isOwnMessage) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${isOwnMessage ? 'own' : 'other'}\`;
            
            if (!isOwnMessage) {
                messageDiv.innerHTML = \`
                    <div class="message-info">\${username}</div>
                    <div>\${escapeHtml(message)}</div>
                \`;
            } else {
                messageDiv.innerHTML = \`
                    <div>\${escapeHtml(message)}</div>
                \`;
            }
            
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function addSystemMessage(message) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message system';
            messageDiv.textContent = message;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function addBlockedMessage(message) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message blocked';
            messageDiv.textContent = '🚫 ' + message;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function addModerationInfo(message) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'moderation-info';
            messageDiv.textContent = 'ℹ️ ' + message;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function updateUserInfo(userCount) {
            document.getElementById('userInfo').textContent = \`\${username} • \${userCount} usuários online\`;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Enter para enviar mensagem
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    </script>
</body>
</html>
    `);
});

// Eventos do Socket.IO
io.on('connection', (socket) => {
    console.log('[CHAT] Novo usuário conectado:', socket.id);

    socket.on('join_chat', (data) => {
        const { username, userId } = data;
        
        // Verificar se usuário está banido
        if (bannedUsers.has(userId)) {
            socket.emit('banned', { reason: 'Você foi banido do chat' });
            socket.disconnect();
            return;
        }

        users.set(socket.id, { username, userId });
        socket.join('main_room');
        
        // Notificar outros usuários
        socket.to('main_room').emit('user_joined', {
            username,
            userCount: io.sockets.adapter.rooms.get('main_room')?.size || 0
        });

        console.log(`[CHAT] ${username} (${userId}) entrou no chat`);
    });

    socket.on('send_message', async (data) => {
        const { username, userId, message } = data;
        const user = users.get(socket.id);

        if (!user || user.userId !== userId) {
            socket.emit('error', { message: 'Usuário não autorizado' });
            return;
        }

        console.log(`[CHAT] Moderando mensagem de ${username}: "${message}"`);

        try {
            // Moderar a mensagem
            const moderation = await moderator.moderateMessage(message, userId, 'main_room');

            switch (moderation.action) {
                case 'allow':
                    // Permitir mensagem
                    socket.to('main_room').emit('message', {
                        username,
                        message,
                        timestamp: new Date()
                    });
                    break;

                case 'allow_with_flag':
                    // Permitir mas flaggar para monitoramento
                    socket.to('main_room').emit('message', {
                        username,
                        message,
                        timestamp: new Date(),
                        flagged: true
                    });
                    console.log(`[CHAT] Mensagem flagrada de ${username}`);
                    break;

                case 'block_and_warn':
                    // Bloquear e avisar usuário
                    const warnings = moderator.addWarning(userId);
                    socket.emit('message_blocked', {
                        reason: moderation.reason,
                        confidence: moderation.confidence,
                        warnings,
                        violations: moderation.violations
                    });
                    
                    socket.to('main_room').emit('user_warned', { username });
                    console.log(`[CHAT] Mensagem bloqueada de ${username} - Avisos: ${warnings}`);

                    // Banir se muitos avisos
                    if (warnings >= 3) {
                        bannedUsers.add(userId);
                        socket.emit('banned', { reason: 'Muitos avisos por conteúdo inadequado' });
                        socket.disconnect();
                        console.log(`[CHAT] ${username} foi banido por excesso de avisos`);
                    }
                    break;

                case 'block_and_timeout':
                    // Bloquear e dar timeout
                    const timeoutDuration = 30; // 30 segundos
                    socket.emit('message_blocked', {
                        reason: moderation.reason,
                        confidence: moderation.confidence
                    });
                    
                    socket.to('main_room').emit('user_timeout', {
                        username,
                        duration: timeoutDuration
                    });

                    // Timeout temporário (simplificado - em produção usar sistema mais robusto)
                    setTimeout(() => {
                        moderator.clearWarnings(userId);
                    }, timeoutDuration * 1000);

                    console.log(`[CHAT] ${username} recebeu timeout de ${timeoutDuration}s`);
                    break;

                default:
                    socket.emit('message_blocked', {
                        reason: 'Mensagem não pôde ser processada',
                        confidence: 0
                    });
            }

        } catch (error) {
            console.error('[CHAT ERROR]', error);
            socket.emit('moderation_error', {
                message: 'Erro no sistema de moderação'
            });
            
            // Em caso de erro, permitir mensagem com aviso
            socket.to('main_room').emit('message', {
                username,
                message,
                timestamp: new Date(),
                warning: 'Moderação indisponível'
            });
        }
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            users.delete(socket.id);
            socket.to('main_room').emit('user_left', {
                username: user.username,
                userCount: Math.max(0, (io.sockets.adapter.rooms.get('main_room')?.size || 1) - 1)
            });
            console.log(`[CHAT] ${user.username} desconectou`);
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Chat moderado rodando em http://localhost:${PORT}`);
    console.log(`📝 Certifique-se de que a ModBot API está rodando em ${MODBOT_API_URL}`);
    console.log(`🤖 Moderação ativa com thresholds rigorosos para chat`);
});

module.exports = { ChatModerator };
