// Configurações avançadas do ModBot
// Este arquivo permite ajustes finos do comportamento do bot

module.exports = {
    // Configurações da Perspective API
    perspective: {
        // Atributos a serem analisados
        attributes: [
            'TOXICITY',
            'SEVERE_TOXICITY', 
            'IDENTITY_ATTACK',
            'INSULT',
            'PROFANITY',
            'THREAT'
        ],
        
        // Idiomas suportados
        languages: ['pt', 'en'],
        
        // Configuração de cache (em minutos)
        cacheTimeout: 5
    },

    // Configurações de moderação
    moderation: {
        // Mensagens que são sempre ignoradas (regex)
        ignoredPatterns: [
            /^!mod/i,  // Comandos do bot
            /^\/\w+/   // Comandos slash
        ],
        
        // Usuarios que são imunes à moderação (além do OWNER_ID)
        immuneUsers: [
            // 'user_id_aqui'
        ],
        
        // Roles que são imunes à moderação
        immuneRoles: [
            // 'role_id_aqui'
        ],
        
        // Configurações de avisos
        warningSystem: {
            // Resetar avisos após X horas sem infrações
            resetWarningsAfter: 24, // horas
            
            // Escalação de punições
            punishments: {
                1: 'warning',      // Primeiro aviso
                2: 'warning',      // Segundo aviso  
                3: 'timeout'       // Terceiro aviso = mute
            }
        }
    },

    // Configurações de logs
    logging: {
        // Tempo para deletar logs automáticos (em segundos)
        autoDeleteLogs: 10,
        
        // Canal específico para logs (opcional)
        logChannel: null, // 'channel_id_aqui'
        
        // Tipos de log a serem registrados
        logTypes: {
            deletions: true,
            warnings: true,
            mutes: true,
            unmutes: true,
            errors: true
        }
    },

    // Configurações de embeds
    embeds: {
        colors: {
            warning: '#feca57',
            deletion: '#ff6b6b',
            mute: '#ff4757',
            info: '#74c0fc',
            success: '#95e1d3',
            error: '#ff6348'
        },
        
        // Incluir scores detalhados nos logs
        includeScores: true,
        
        // Mostrar conteúdo da mensagem deletada nos logs (cuidado com privacidade)
        showDeletedContent: false
    },

    // Configurações de performance
    performance: {
        // Máximo de mensagens para analisar por minuto
        rateLimitPerMinute: 100,
        
        // Timeout para chamadas da API (em ms)
        apiTimeout: 5000,
        
        // Número máximo de tentativas em caso de falha
        maxRetries: 3
    }
};
