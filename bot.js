const { Client, GatewayIntentBits, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configurações do bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Configurações da Perspective API
const PERSPECTIVE_API_KEY = process.env.PERSPECTIVE_API_KEY;
const PERSPECTIVE_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

// Configurações do bot
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OWNER_ID = process.env.OWNER_ID;
let MONITORED_CHANNELS = process.env.MONITORED_CHANNELS ? process.env.MONITORED_CHANNELS.split(',') : [];
const TOXICITY_THRESHOLD = parseFloat(process.env.TOXICITY_THRESHOLD) || 0.7;
const SEVERE_TOXICITY_THRESHOLD = parseFloat(process.env.SEVERE_TOXICITY_THRESHOLD) || 0.8;
const MUTE_DURATION = parseInt(process.env.MUTE_DURATION) || 600000; // 10 minutos em ms
const MAX_WARNINGS = parseInt(process.env.MAX_WARNINGS) || 3;

// Sistema de armazenamento de avisos dos usuários
const userWarnings = new Map();
const dataFile = path.join(__dirname, 'userData.json');

// Carregar dados dos usuários
function loadUserData() {
    try {
        if (fs.existsSync(dataFile)) {
            const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
            for (const [userId, warnings] of Object.entries(data)) {
                userWarnings.set(userId, warnings);
            }
            console.log('Dados dos usuários carregados com sucesso.');
        }
    } catch (error) {
        console.error('Erro ao carregar dados dos usuários:', error);
    }
}

// Salvar dados dos usuários
function saveUserData() {
    try {
        const data = Object.fromEntries(userWarnings);
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erro ao salvar dados dos usuários:', error);
    }
}

// Função para analisar toxicidade com a Perspective API
async function analyzeMessage(text) {
    try {
        // Limitar o tamanho do texto (Perspective API tem limite)
        const cleanText = text.trim().substring(0, 3000);
        
        if (cleanText.length === 0) {
            return null;
        }

        const response = await axios.post(`${PERSPECTIVE_API_URL}?key=${PERSPECTIVE_API_KEY}`, {
            requestedAttributes: {
                TOXICITY: {},
                SEVERE_TOXICITY: {},
                IDENTITY_ATTACK: {},
                INSULT: {},
                PROFANITY: {},
                THREAT: {}
            },
            languages: ['pt', 'en'],
            comment: {
                text: cleanText
            }
        }, {
            timeout: 10000 // 10 segundos de timeout
        });

        return response.data.attributeScores;
    } catch (error) {
        if (error.response) {
            // Erro da API
            console.error(`Erro da Perspective API (${error.response.status}):`, error.response.data?.error?.message || 'Erro desconhecido');
        } else if (error.request) {
            // Erro de rede
            console.error('Erro de conexão com a Perspective API:', error.message);
        } else {
            // Outro tipo de erro
            console.error('Erro ao analisar mensagem:', error.message);
        }
        return null;
    }
}

// Função para determinar se a mensagem é tóxica
function isToxicMessage(scores) {
    if (!scores) return false;

    const toxicity = scores.TOXICITY?.summaryScore?.value || 0;
    const severeToxicity = scores.SEVERE_TOXICITY?.summaryScore?.value || 0;
    const identityAttack = scores.IDENTITY_ATTACK?.summaryScore?.value || 0;
    const insult = scores.INSULT?.summaryScore?.value || 0;
    const profanity = scores.PROFANITY?.summaryScore?.value || 0;
    const threat = scores.THREAT?.summaryScore?.value || 0;

    return toxicity > TOXICITY_THRESHOLD || 
           severeToxicity > SEVERE_TOXICITY_THRESHOLD ||
           identityAttack > TOXICITY_THRESHOLD ||
           insult > TOXICITY_THRESHOLD ||
           profanity > TOXICITY_THRESHOLD ||
           threat > TOXICITY_THRESHOLD;
}

// Função para adicionar aviso ao usuário
function addWarning(userId) {
    const currentWarnings = userWarnings.get(userId) || 0;
    const newWarnings = currentWarnings + 1;
    userWarnings.set(userId, newWarnings);
    saveUserData();
    return newWarnings;
}

// Função para mutar usuário
async function muteUser(guild, member, duration) {
    try {
        await member.timeout(duration, 'Comportamento tóxico detectado pela IA');
        return true;
    } catch (error) {
        console.error('Erro ao mutar usuário:', error);
        return false;
    }
}

// Função para criar embed de log
function createLogEmbed(action, user, reason, details = '') {
    let color, actionText, emoji;
    
    switch (action) {
        case 'delete':
            color = '#ff6b6b';
            actionText = 'Mensagem Deletada';
            emoji = '🗑️';
            break;
        case 'mute':
            color = '#ff4757';
            actionText = 'Usuário Mutado';
            emoji = '🔇';
            break;
        case 'warning':
            color = '#feca57';
            actionText = 'Aviso Emitido';
            emoji = '⚠️';
            break;
        default:
            color = '#74c0fc';
            actionText = 'Ação Executada';
            emoji = '🤖';
    }
    
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} Auto-Moderação`)
        .addFields(
            { name: '👤 Usuário', value: `${user.tag} (${user.id})`, inline: true },
            { name: '⚡ Ação', value: actionText, inline: true },
            { name: '📝 Motivo', value: reason, inline: false }
        )
        .addFields(details ? { name: '📊 Detalhes', value: details, inline: false } : { name: '\u200B', value: '\u200B' })
        .setTimestamp()
        .setFooter({ text: 'ModBot AI' });
}

// Evento quando o bot estiver pronto
client.once('ready', () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    console.log(`📝 Monitorando ${MONITORED_CHANNELS.length} canais`);
    console.log(`🎯 Limite de toxicidade: ${TOXICITY_THRESHOLD}`);
    loadUserData();
});

// Evento de mensagem
client.on('messageCreate', async (message) => {
    // Ignorar bots e o próprio bot
    if (message.author.bot) return;

    // Verificar se o canal está sendo monitorado
    if (!MONITORED_CHANNELS.includes(message.channel.id)) return;

    // Verificar se o usuário é o owner (imune à moderação)
    if (message.author.id === OWNER_ID) return;

    // Verificar se a mensagem tem conteúdo para analisar
    if (!message.content || message.content.trim().length < 3) return;

    // Ignorar comandos
    if (message.content.startsWith('!') || message.content.startsWith('/')) return;

    try {
        // Analisar a mensagem
        const scores = await analyzeMessage(message.content);
        
        if (isToxicMessage(scores)) {
            // Verificar se a mensagem ainda existe antes de tentar deletar
            let messageDeleted = false;
            try {
                // Verificar se a mensagem ainda está disponível
                if (message.deletable) {
                    await message.delete();
                    messageDeleted = true;
                } else {
                    console.log(`⚠️ Não foi possível deletar mensagem de ${message.author.tag}: sem permissão ou mensagem não existe`);
                }
            } catch (deleteError) {
                if (deleteError.code === 10008) {
                    console.log(`⚠️ Mensagem de ${message.author.tag} já foi deletada ou não existe mais`);
                } else {
                    console.error('Erro ao deletar mensagem:', deleteError.message);
                }
                // Continuar com o processo mesmo se não conseguir deletar
            }

            // Adicionar aviso ao usuário apenas se conseguiu deletar ou se a mensagem não existe mais
            const warnings = addWarning(message.author.id);
            
            // Obter scores para log
            const toxicityScore = scores.TOXICITY?.summaryScore?.value || 0;
            const details = `Toxicidade: ${(toxicityScore * 100).toFixed(1)}%\nAvisos: ${warnings}/${MAX_WARNINGS}${messageDeleted ? '' : '\n⚠️ Mensagem não pôde ser deletada'}`;

            // Criar log embed
            const logEmbed = createLogEmbed(messageDeleted ? 'delete' : 'warning', message.author, 'Conteúdo tóxico detectado pela IA', details);

            // Enviar mensagem privada ao usuário
            try {
                const warningEmbed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('⚠️ Aviso de Moderação')
                    .setDescription('Sua mensagem foi removida por conter conteúdo inadequado.')
                    .addFields(
                        { name: '🏠 Servidor', value: message.guild.name, inline: true },
                        { name: '📊 Avisos', value: `${warnings}/${MAX_WARNINGS}`, inline: true }
                    )
                    .setTimestamp();

                await message.author.send({ embeds: [warningEmbed] });
            } catch (error) {
                console.log('Não foi possível enviar DM para o usuário');
            }

            // Verificar se deve mutar o usuário
            if (warnings >= MAX_WARNINGS) {
                const member = message.guild.members.cache.get(message.author.id);
                if (member) {
                    const muteSuccess = await muteUser(message.guild, member, MUTE_DURATION);
                    if (muteSuccess) {
                        // Resetar avisos após mute
                        userWarnings.set(message.author.id, 0);
                        saveUserData();

                        // Criar log de mute
                        const muteEmbed = createLogEmbed('mute', message.author, `Limite de avisos atingido (${MAX_WARNINGS})`, `Duração: ${MUTE_DURATION / 60000} minutos`);
                        
                        // Enviar log no canal (se possível)
                        try {
                            await message.channel.send({ embeds: [muteEmbed] });
                        } catch (error) {
                            console.log('Erro ao enviar log no canal');
                        }
                    }
                }
            } else {
                // Enviar log da deleção/aviso no canal
                try {
                    const logMessage = await message.channel.send({ embeds: [logEmbed] });
                    // Deletar o log após 10 segundos para não poluir o chat
                    setTimeout(() => {
                        logMessage.delete().catch(() => {
                            // Silenciar erro se não conseguir deletar o log
                        });
                    }, 10000);
                } catch (error) {
                    console.log('Erro ao enviar log no canal:', error.message);
                }
            }

            const actionText = messageDeleted ? 'deletada' : 'analisada (não deletada)';
            console.log(`💀 Mensagem ${actionText} de ${message.author.tag}: "${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}" (Toxicidade: ${(toxicityScore * 100).toFixed(1)}%)`);
        }
    } catch (error) {
        // Tratamento específico para diferentes tipos de erro
        if (error.code === 10008) {
            console.log(`⚠️ Mensagem não encontrada ou já deletada de ${message.author?.tag || 'usuário desconhecido'}`);
        } else if (error.code === 50013) {
            console.log(`❌ Sem permissão para deletar mensagem de ${message.author?.tag || 'usuário desconhecido'}`);
        } else if (error.message?.includes('Request failed')) {
            console.log(`🌐 Erro de conexão com a API: ${error.message}`);
        } else {
            console.error('Erro inesperado ao processar mensagem:', {
                error: error.message,
                code: error.code,
                user: message.author?.tag,
                channel: message.channel?.id
            });
        }
    }
});

// Comandos básicos para o owner
client.on('messageCreate', async (message) => {
    if (message.author.id !== OWNER_ID) return;
    if (!message.content.startsWith('!mod')) return;

    const args = message.content.slice(4).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    switch (command) {
        case 'addchannel':
            if (args[0]) {
                const channelId = args[0];
                if (!MONITORED_CHANNELS.includes(channelId)) {
                    MONITORED_CHANNELS.push(channelId);
                    // Atualizar .env
                    updateEnvFile('MONITORED_CHANNELS', MONITORED_CHANNELS.join(','));
                    message.reply(`✅ Canal ${channelId} adicionado à lista de monitoramento.`);
                } else {
                    message.reply('❌ Este canal já está sendo monitorado.');
                }
            } else {
                message.reply('❌ Por favor, forneça um ID de canal válido.');
            }
            break;

        case 'removechannel':
            if (args[0]) {
                const channelId = args[0];
                const index = MONITORED_CHANNELS.indexOf(channelId);
                if (index > -1) {
                    MONITORED_CHANNELS.splice(index, 1);
                    updateEnvFile('MONITORED_CHANNELS', MONITORED_CHANNELS.join(','));
                    message.reply(`✅ Canal ${channelId} removido da lista de monitoramento.`);
                } else {
                    message.reply('❌ Este canal não está sendo monitorado.');
                }
            } else {
                message.reply('❌ Por favor, forneça um ID de canal válido.');
            }
            break;

        case 'listchannels':
            const channelList = MONITORED_CHANNELS.length > 0 ? 
                MONITORED_CHANNELS.map(id => `• ${id}`).join('\n') : 
                'Nenhum canal está sendo monitorado.';
            message.reply(`📋 **Canais monitorados:**\n${channelList}`);
            break;

        case 'warnings':
            if (args[0]) {
                const userId = args[0].replace(/[<@!>]/g, '');
                const warnings = userWarnings.get(userId) || 0;
                message.reply(`📊 O usuário <@${userId}> possui ${warnings} avisos.`);
            } else {
                message.reply('❌ Por favor, mencione um usuário ou forneça um ID.');
            }
            break;

        case 'clearwarnings':
            if (args[0]) {
                const userId = args[0].replace(/[<@!>]/g, '');
                userWarnings.set(userId, 0);
                saveUserData();
                message.reply(`✅ Avisos de <@${userId}> foram limpos.`);
            } else {
                message.reply('❌ Por favor, mencione um usuário ou forneça um ID.');
            }
            break;

        case 'status':
            const statusEmbed = new EmbedBuilder()
                .setColor('#74c0fc')
                .setTitle('📊 Status do ModBot')
                .addFields(
                    { name: '📺 Canais Monitorados', value: MONITORED_CHANNELS.length.toString(), inline: true },
                    { name: '👥 Usuários com Avisos', value: userWarnings.size.toString(), inline: true },
                    { name: '🎯 Limite de Toxicidade', value: `${(TOXICITY_THRESHOLD * 100).toFixed(1)}%`, inline: true },
                    { name: '⏱️ Duração do Mute', value: `${MUTE_DURATION / 60000} minutos`, inline: true },
                    { name: '⚠️ Máximo de Avisos', value: MAX_WARNINGS.toString(), inline: true },
                    { name: '🔥 Limite Severo', value: `${(SEVERE_TOXICITY_THRESHOLD * 100).toFixed(1)}%`, inline: true }
                )
                .setTimestamp();
            message.reply({ embeds: [statusEmbed] });
            break;

        case 'help':
            const helpEmbed = new EmbedBuilder()
                .setColor('#95e1d3')
                .setTitle('📚 Comandos do ModBot')
                .setDescription('Lista de comandos disponíveis para o proprietário:')
                .addFields(
                    { name: '!mod addchannel <id>', value: 'Adiciona um canal à lista de monitoramento', inline: false },
                    { name: '!mod removechannel <id>', value: 'Remove um canal da lista de monitoramento', inline: false },
                    { name: '!mod listchannels', value: 'Lista todos os canais monitorados', inline: false },
                    { name: '!mod warnings <user>', value: 'Mostra os avisos de um usuário', inline: false },
                    { name: '!mod clearwarnings <user>', value: 'Limpa os avisos de um usuário', inline: false },
                    { name: '!mod status', value: 'Mostra o status do bot', inline: false },
                    { name: '!mod diagnose', value: 'Executa diagnóstico do bot no canal atual', inline: false },
                    { name: '!mod help', value: 'Mostra esta mensagem de ajuda', inline: false }
                );
            message.reply({ embeds: [helpEmbed] });
            break;

        case 'diagnose':
        case 'diagnostic':
            try {
                const botMember = message.guild.members.me;
                const channelPerms = message.channel.permissionsFor(botMember);
                
                const diagnosticEmbed = new EmbedBuilder()
                    .setColor('#74c0fc')
                    .setTitle('🔍 Diagnóstico do ModBot')
                    .setDescription(`Diagnóstico realizado no canal: ${message.channel.name}`)
                    .addFields(
                        { name: '🤖 Bot Status', value: `Conectado como ${client.user.tag}\nPing: ${client.ws.ping}ms`, inline: true },
                        { name: '📡 Conexão', value: `Status: ✅ Online\nUptime: ${Math.floor(process.uptime() / 60)} minutos`, inline: true },
                        { name: '🛡️ Permissões no Canal', value: `
Ver Canal: ${channelPerms.has('ViewChannel') ? '✅' : '❌'}
Enviar Mensagens: ${channelPerms.has('SendMessages') ? '✅' : '❌'}
Gerenciar Mensagens: ${channelPerms.has('ManageMessages') ? '✅' : '❌'}
Timeout Membros: ${botMember.permissions.has('ModerateMembers') ? '✅' : '❌'}`, inline: false },
                        { name: '📊 Monitoramento', value: `
Canal Atual: ${MONITORED_CHANNELS.includes(message.channel.id) ? '✅ Monitorado' : '❌ Não Monitorado'}
Total de Canais: ${MONITORED_CHANNELS.length}
Usuários com Avisos: ${userWarnings.size}`, inline: false },
                        { name: '🌐 APIs', value: `
Perspective API: ${PERSPECTIVE_API_KEY ? '✅ Configurada' : '❌ Não Configurada'}
Discord API: ✅ Conectada`, inline: false }
                    )
                    .setTimestamp();
                
                // Testar permissões enviando e tentando deletar uma mensagem de teste
                try {
                    const testMessage = await message.channel.send('🧪 Mensagem de teste - será deletada em 3 segundos...');
                    setTimeout(async () => {
                        try {
                            await testMessage.delete();
                            diagnosticEmbed.addFields({ name: '🧪 Teste de Deleção', value: '✅ Sucesso - Bot pode deletar mensagens', inline: false });
                        } catch (error) {
                            diagnosticEmbed.addFields({ name: '🧪 Teste de Deleção', value: `❌ Falhou - ${error.message}`, inline: false });
                        }
                        
                        message.reply({ embeds: [diagnosticEmbed] });
                    }, 3000);
                } catch (error) {
                    diagnosticEmbed.addFields({ name: '🧪 Teste de Envio', value: `❌ Falhou - ${error.message}`, inline: false });
                    message.reply({ embeds: [diagnosticEmbed] });
                }
            } catch (error) {
                message.reply(`❌ Erro ao executar diagnóstico: ${error.message}`);
            }
            break;
    }
});

// Função para atualizar arquivo .env
function updateEnvFile(key, value) {
    try {
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
            envContent += `\n${key}=${value}`;
        }
        
        fs.writeFileSync(envPath, envContent);
    } catch (error) {
        console.error('Erro ao atualizar arquivo .env:', error);
    }
}

// Login do bot
client.login(DISCORD_TOKEN);
