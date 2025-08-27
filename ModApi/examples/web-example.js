// Exemplo de integração da ModBot API com uma aplicação web simples

const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3001;

// URL da ModBot API
const MODBOT_API_URL = 'http://localhost:3000';

app.use(express.json());
app.use(express.static('public'));

// Servir página HTML de exemplo
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teste ModBot API</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .result { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .safe { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .toxic { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .error { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        textarea { width: 100%; min-height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .threshold-group { margin: 10px 0; }
        .threshold-group label { display: inline-block; width: 150px; }
        .threshold-group input { width: 80px; }
    </style>
</head>
<body>
    <h1>🤖 ModBot API - Teste de Moderação</h1>
    
    <div class="container">
        <h2>Teste de Moderação de Texto</h2>
        <textarea id="textInput" placeholder="Digite o texto que deseja analisar..."></textarea>
        
        <h3>Configurações de Threshold</h3>
        <div class="threshold-group">
            <label>Toxicidade:</label>
            <input type="number" id="toxicity" value="0.7" min="0" max="1" step="0.1">
        </div>
        <div class="threshold-group">
            <label>Toxicidade Severa:</label>
            <input type="number" id="severeToxicity" value="0.8" min="0" max="1" step="0.1">
        </div>
        <div class="threshold-group">
            <label>Insultos:</label>
            <input type="number" id="insult" value="0.7" min="0" max="1" step="0.1">
        </div>
        <div class="threshold-group">
            <label>Profanidade:</label>
            <input type="number" id="profanity" value="0.7" min="0" max="1" step="0.1">
        </div>
        
        <br>
        <button onclick="moderateText()">🔍 Analisar Texto</button>
        <button onclick="analyzeDetailed()">📊 Análise Detalhada</button>
        
        <div id="result"></div>
    </div>

    <div class="container">
        <h2>Teste em Lote</h2>
        <textarea id="batchInput" placeholder="Digite vários textos, um por linha..."></textarea>
        <br><br>
        <input type="text" id="apiKey" placeholder="API Key (obrigatório para lote)" style="width: 300px;">
        <br><br>
        <button onclick="batchAnalyze()">📝 Analisar em Lote</button>
        
        <div id="batchResult"></div>
    </div>

    <script>
        async function moderateText() {
            const text = document.getElementById('textInput').value;
            const resultDiv = document.getElementById('result');
            
            if (!text.trim()) {
                resultDiv.innerHTML = '<div class="result error">Por favor, digite algum texto.</div>';
                return;
            }
            
            resultDiv.innerHTML = '<div class="result">🔄 Analisando...</div>';
            
            try {
                const response = await fetch('/api/moderate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: text,
                        thresholds: {
                            toxicity: parseFloat(document.getElementById('toxicity').value),
                            severeToxicity: parseFloat(document.getElementById('severeToxicity').value),
                            insult: parseFloat(document.getElementById('insult').value),
                            profanity: parseFloat(document.getElementById('profanity').value)
                        }
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const data = result.data;
                    const cssClass = data.isToxic ? 'toxic' : 'safe';
                    const icon = data.isToxic ? '🚫' : '✅';
                    
                    resultDiv.innerHTML = \`
                        <div class="result \${cssClass}">
                            <h3>\${icon} Resultado da Moderação</h3>
                            <p><strong>Ação:</strong> \${data.action === 'allow' ? 'Permitir' : 'Bloquear'}</p>
                            <p><strong>Confiança:</strong> \${data.confidence}%</p>
                            <p><strong>Motivo:</strong> \${data.reason}</p>
                            \${data.violations.length > 0 ? '<p><strong>Violações:</strong> ' + data.violations.join(', ') + '</p>' : ''}
                        </div>
                    \`;
                } else {
                    resultDiv.innerHTML = \`<div class="result error">❌ Erro: \${result.message}</div>\`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`<div class="result error">❌ Erro de conexão: \${error.message}</div>\`;
            }
        }
        
        async function analyzeDetailed() {
            const text = document.getElementById('textInput').value;
            const resultDiv = document.getElementById('result');
            
            if (!text.trim()) {
                resultDiv.innerHTML = '<div class="result error">Por favor, digite algum texto.</div>';
                return;
            }
            
            resultDiv.innerHTML = '<div class="result">🔄 Fazendo análise detalhada...</div>';
            
            try {
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: text,
                        includeScores: true,
                        thresholds: {
                            toxicity: parseFloat(document.getElementById('toxicity').value),
                            severeToxicity: parseFloat(document.getElementById('severeToxicity').value),
                            insult: parseFloat(document.getElementById('insult').value),
                            profanity: parseFloat(document.getElementById('profanity').value)
                        }
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const { analysis, recommendation, scores } = result.data;
                    const cssClass = analysis.isToxic ? 'toxic' : 'safe';
                    const icon = analysis.isToxic ? '🚫' : '✅';
                    
                    let scoresHtml = '';
                    if (scores) {
                        scoresHtml = \`
                            <h4>📊 Scores Detalhados:</h4>
                            <ul>
                                <li>Toxicidade: \${(scores.toxicity * 100).toFixed(1)}%</li>
                                <li>Toxicidade Severa: \${(scores.severeToxicity * 100).toFixed(1)}%</li>
                                <li>Ataque de Identidade: \${(scores.identityAttack * 100).toFixed(1)}%</li>
                                <li>Insulto: \${(scores.insult * 100).toFixed(1)}%</li>
                                <li>Profanidade: \${(scores.profanity * 100).toFixed(1)}%</li>
                                <li>Ameaça: \${(scores.threat * 100).toFixed(1)}%</li>
                            </ul>
                        \`;
                    }
                    
                    resultDiv.innerHTML = \`
                        <div class="result \${cssClass}">
                            <h3>\${icon} Análise Detalhada</h3>
                            <p><strong>Status:</strong> \${analysis.isToxic ? 'Tóxico' : 'Seguro'}</p>
                            <p><strong>Confiança:</strong> \${analysis.confidence}%</p>
                            <p><strong>Severidade:</strong> \${recommendation.severity}</p>
                            <p><strong>Ação Recomendada:</strong> \${recommendation.action === 'allow' ? 'Permitir' : 'Bloquear'}</p>
                            \${analysis.violations.length > 0 ? '<p><strong>Violações:</strong> ' + analysis.violations.join(', ') + '</p>' : ''}
                            \${scoresHtml}
                        </div>
                    \`;
                } else {
                    resultDiv.innerHTML = \`<div class="result error">❌ Erro: \${result.message}</div>\`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`<div class="result error">❌ Erro de conexão: \${error.message}</div>\`;
            }
        }
        
        async function batchAnalyze() {
            const text = document.getElementById('batchInput').value;
            const apiKey = document.getElementById('apiKey').value;
            const resultDiv = document.getElementById('batchResult');
            
            if (!text.trim()) {
                resultDiv.innerHTML = '<div class="result error">Por favor, digite alguns textos.</div>';
                return;
            }
            
            if (!apiKey.trim()) {
                resultDiv.innerHTML = '<div class="result error">API Key é obrigatória para análise em lote.</div>';
                return;
            }
            
            const texts = text.split('\\n').filter(line => line.trim());
            
            resultDiv.innerHTML = \`<div class="result">🔄 Analisando \${texts.length} textos...</div>\`;
            
            try {
                const response = await fetch('/api/batch', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey
                    },
                    body: JSON.stringify({
                        texts: texts,
                        thresholds: {
                            toxicity: 0.7
                        }
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const { results, summary } = result.data;
                    
                    let resultsHtml = results.map(r => {
                        const cssClass = r.isToxic ? 'toxic' : 'safe';
                        const icon = r.isToxic ? '🚫' : '✅';
                        return \`
                            <div class="result \${cssClass}">
                                \${icon} <strong>Texto \${r.index + 1}:</strong> \${r.text}<br>
                                <strong>Ação:</strong> \${r.action} | <strong>Confiança:</strong> \${r.confidence}%
                            </div>
                        \`;
                    }).join('');
                    
                    resultDiv.innerHTML = \`
                        <h3>📊 Resumo da Análise em Lote</h3>
                        <div class="result">
                            <p><strong>Total:</strong> \${summary.total} | <strong>Seguros:</strong> \${summary.safe} | <strong>Tóxicos:</strong> \${summary.toxic} | <strong>Erros:</strong> \${summary.errors}</p>
                        </div>
                        \${resultsHtml}
                    \`;
                } else {
                    resultDiv.innerHTML = \`<div class="result error">❌ Erro: \${result.message}</div>\`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`<div class="result error">❌ Erro de conexão: \${error.message}</div>\`;
            }
        }
    </script>
</body>
</html>
    `);
});

// Proxy para a ModBot API
app.post('/api/moderate', async (req, res) => {
    try {
        const response = await axios.post(`${MODBOT_API_URL}/moderate`, req.body);
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/analyze', async (req, res) => {
    try {
        const response = await axios.post(`${MODBOT_API_URL}/analyze`, req.body);
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/batch', async (req, res) => {
    try {
        const headers = {};
        if (req.headers['x-api-key']) {
            headers['x-api-key'] = req.headers['x-api-key'];
        }
        
        const response = await axios.post(`${MODBOT_API_URL}/batch`, req.body, { headers });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.response?.data?.message || error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🌐 Aplicação de exemplo rodando em http://localhost:${PORT}`);
    console.log(`📝 Certifique-se de que a ModBot API está rodando em ${MODBOT_API_URL}`);
});
