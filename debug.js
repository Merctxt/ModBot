// Utilitários de debug e monitoramento para o ModBot
const fs = require('fs');
const path = require('path');

// Função para log detalhado
function debugLog(type, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        type,
        message,
        data
    };
    
    // Log no console
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    if (data) {
        console.log('Data:', data);
    }
    
    // Salvar em arquivo de log (opcional)
    try {
        const logFile = path.join(__dirname, 'debug.log');
        const logLine = `[${timestamp}] ${type.toUpperCase()}: ${message}${data ? ' | Data: ' + JSON.stringify(data) : ''}\n`;
        fs.appendFileSync(logFile, logLine);
    } catch (error) {
        // Silenciar erro de log
    }
}

// Função para verificar integridade da mensagem
function validateMessage(message) {
    const issues = [];
    
    if (!message) {
        issues.push('Mensagem é null/undefined');
        return issues;
    }
    
    if (!message.author) {
        issues.push('Autor da mensagem é null/undefined');
    }
    
    if (!message.channel) {
        issues.push('Canal da mensagem é null/undefined');
    }
    
    if (!message.guild) {
        issues.push('Guild da mensagem é null/undefined');
    }
    
    if (!message.content && (!message.embeds || message.embeds.length === 0)) {
        issues.push('Mensagem não tem conteúdo nem embeds');
    }
    
    if (message.partial) {
        issues.push('Mensagem é parcial (pode estar incompleta)');
    }
    
    return issues;
}

// Função para verificar permissões do bot
function checkBotPermissions(channel, member) {
    const permissions = {
        canReadMessages: channel.permissionsFor(member).has('ViewChannel'),
        canSendMessages: channel.permissionsFor(member).has('SendMessages'),
        canDeleteMessages: channel.permissionsFor(member).has('ManageMessages'),
        canTimeoutMembers: channel.guild.members.me.permissions.has('ModerateMembers')
    };
    
    const missingPermissions = Object.entries(permissions)
        .filter(([_, hasPermission]) => !hasPermission)
        .map(([permission]) => permission);
    
    return {
        permissions,
        hasAllPermissions: missingPermissions.length === 0,
        missingPermissions
    };
}

// Função para criar relatório de status
function generateStatusReport(client, userWarnings, monitoredChannels) {
    const guilds = client.guilds.cache.size;
    const users = client.users.cache.size;
    const channels = client.channels.cache.size;
    const usersWithWarnings = userWarnings.size;
    
    const report = {
        bot: {
            name: client.user.tag,
            id: client.user.id,
            guilds,
            users,
            channels,
            ping: client.ws.ping,
            uptime: process.uptime()
        },
        moderation: {
            monitoredChannels: monitoredChannels.length,
            usersWithWarnings,
            totalWarnings: Array.from(userWarnings.values()).reduce((sum, warnings) => sum + warnings, 0)
        },
        system: {
            nodeVersion: process.version,
            memoryUsage: process.memoryUsage(),
            platform: process.platform
        }
    };
    
    return report;
}

module.exports = {
    debugLog,
    validateMessage,
    checkBotPermissions,
    generateStatusReport
};
