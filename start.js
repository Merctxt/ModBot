const fs = require('fs');
const path = require('path');

console.log('🚀 Configuração inicial do Discord ModBot\n');

// Verificar se o .env existe
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('❌ Arquivo .env não encontrado!');
    console.log('📝 Copie o arquivo .env.example para .env e configure suas credenciais.\n');
    
    console.log('Passos para configuração:');
    console.log('1. Copie .env.example para .env');
    console.log('2. Configure PERSPECTIVE_API_KEY com sua chave da Google');
    console.log('3. Configure DISCORD_TOKEN com o token do seu bot');
    console.log('4. Configure OWNER_ID com seu ID do Discord');
    console.log('5. Configure MONITORED_CHANNELS com os IDs dos canais (opcional)');
    console.log('\n📚 Consulte o README.md para instruções detalhadas.');
    process.exit(1);
}

// Carregar configurações
require('dotenv').config();

const requiredVars = ['PERSPECTIVE_API_KEY', 'DISCORD_TOKEN', 'OWNER_ID'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.log('❌ Variáveis obrigatórias não configuradas no .env:');
    missingVars.forEach(varName => {
        console.log(`   - ${varName}`);
    });
    console.log('\n📚 Consulte o README.md para instruções de configuração.');
    process.exit(1);
}

console.log('✅ Configuração válida encontrada!');
console.log('🔑 API Key configurada');
console.log('🤖 Token do bot configurado');
console.log('👤 Owner ID configurado');

const monitoredChannels = process.env.MONITORED_CHANNELS ? 
    process.env.MONITORED_CHANNELS.split(',').length : 0;
console.log(`📺 ${monitoredChannels} canais configurados para monitoramento`);

console.log('\n🎯 Configurações de moderação:');
console.log(`   - Limite de toxicidade: ${(parseFloat(process.env.TOXICITY_THRESHOLD || 0.7) * 100).toFixed(1)}%`);
console.log(`   - Limite severo: ${(parseFloat(process.env.SEVERE_TOXICITY_THRESHOLD || 0.8) * 100).toFixed(1)}%`);
console.log(`   - Duração do mute: ${(parseInt(process.env.MUTE_DURATION || 600000) / 60000)} minutos`);
console.log(`   - Avisos máximos: ${process.env.MAX_WARNINGS || 3}`);

console.log('\n🚀 Iniciando o bot...\n');

// Iniciar o bot
require('./bot.js');
