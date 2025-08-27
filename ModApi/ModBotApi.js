const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.API_PORT || 3000;
const API_KEY = process.env.API_SECRET_KEY || 'modbot-api-key-change-me';

// Configurações da Perspective API
const PERSPECTIVE_API_KEY = process.env.PERSPECTIVE_API_KEY;
const PERSPECTIVE_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

// Configurações de moderação
const TOXICITY_THRESHOLD = parseFloat(process.env.TOXICITY_THRESHOLD) || 0.7;
const SEVERE_TOXICITY_THRESHOLD = parseFloat(process.env.SEVERE_TOXICITY_THRESHOLD) || 0.8;

// Rate limiting
const rateLimiter = new RateLimiterMemory({
    keyResolverFunction: (req) => req.ip + ':' + (req.headers['x-api-key'] || 'anonymous'),
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
});

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting middleware
app.use(async (req, res, next) => {
    try {
        await rateLimiter.consume(req.ip + ':' + (req.headers['x-api-key'] || 'anonymous'));
        next();
    } catch (rejRes) {
        res.status(429).json({
            success: false,
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Try again later.',
            retryAfter: Math.round(rejRes.msBeforeNext / 1000)
        });
    }
});

// API Key middleware (for protected endpoints)
const requireApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Valid API key required'
        });
    }
    
    next();
};

// Logging middleware
app.use((req, res, next) => {
    const requestId = uuidv4();
    req.requestId = requestId;
    
    console.log(`[${new Date().toISOString()}] ${requestId} - ${req.method} ${req.path} - IP: ${req.ip}`);
    
    next();
});

// Função para analisar toxicidade
async function analyzeText(text, options = {}) {
    try {
        const cleanText = text.trim().substring(0, 3000);
        
        if (cleanText.length === 0) {
            return null;
        }

        const requestData = {
            requestedAttributes: {
                TOXICITY: {},
                SEVERE_TOXICITY: {},
                IDENTITY_ATTACK: {},
                INSULT: {},
                PROFANITY: {},
                THREAT: {}
            },
            languages: options.languages || ['pt', 'en'],
            comment: {
                text: cleanText
            }
        };

        const response = await axios.post(`${PERSPECTIVE_API_URL}?key=${PERSPECTIVE_API_KEY}`, requestData, {
            timeout: 10000
        });

        return response.data.attributeScores;
    } catch (error) {
        console.error('Erro na Perspective API:', error.message);
        throw new Error('Falha ao analisar texto');
    }
}

// Função para determinar se o texto é tóxico
function analyzeScores(scores, customThresholds = {}) {
    if (!scores) return { isToxic: false, reason: 'No scores available' };

    const thresholds = {
        toxicity: customThresholds.toxicity || TOXICITY_THRESHOLD,
        severeToxicity: customThresholds.severeToxicity || SEVERE_TOXICITY_THRESHOLD,
        identityAttack: customThresholds.identityAttack || TOXICITY_THRESHOLD,
        insult: customThresholds.insult || TOXICITY_THRESHOLD,
        profanity: customThresholds.profanity || TOXICITY_THRESHOLD,
        threat: customThresholds.threat || TOXICITY_THRESHOLD
    };

    const values = {
        toxicity: scores.TOXICITY?.summaryScore?.value || 0,
        severeToxicity: scores.SEVERE_TOXICITY?.summaryScore?.value || 0,
        identityAttack: scores.IDENTITY_ATTACK?.summaryScore?.value || 0,
        insult: scores.INSULT?.summaryScore?.value || 0,
        profanity: scores.PROFANITY?.summaryScore?.value || 0,
        threat: scores.THREAT?.summaryScore?.value || 0
    };

    // Verificar qual threshold foi ultrapassado
    const violations = [];
    
    if (values.toxicity > thresholds.toxicity) violations.push('toxicity');
    if (values.severeToxicity > thresholds.severeToxicity) violations.push('severe_toxicity');
    if (values.identityAttack > thresholds.identityAttack) violations.push('identity_attack');
    if (values.insult > thresholds.insult) violations.push('insult');
    if (values.profanity > thresholds.profanity) violations.push('profanity');
    if (values.threat > thresholds.threat) violations.push('threat');

    return {
        isToxic: violations.length > 0,
        violations,
        scores: values,
        thresholds,
        maxScore: Math.max(...Object.values(values)),
        reason: violations.length > 0 ? `Violated: ${violations.join(', ')}` : 'Content is safe'
    };
}

// ROTAS DA API

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'ModBot API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Informações da API
app.get('/info', (req, res) => {
    res.json({
        success: true,
        data: {
            name: 'ModBot API',
            version: '1.0.0',
            description: 'API de moderação automática usando Google Perspective API',
            endpoints: [
                'GET /health - Status da API',
                'GET /info - Informações da API',
                'POST /moderate - Análise de moderação de texto',
                'POST /analyze - Análise detalhada de texto',
                'POST /batch - Análise em lote',
                'GET /stats - Estatísticas (requer API key)'
            ],
            rateLimit: '100 requests per minute per IP/API key',
            authentication: 'API key required for protected endpoints'
        }
    });
});

// Análise de moderação básica
app.post('/moderate', async (req, res) => {
    try {
        const { text, thresholds, languages } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'Text field is required and must be a string'
            });
        }

        if (text.length > 3000) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'Text too long. Maximum 3000 characters allowed'
            });
        }

        const scores = await analyzeText(text, { languages });
        const analysis = analyzeScores(scores, thresholds);

        res.json({
            success: true,
            requestId: req.requestId,
            data: {
                text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                isToxic: analysis.isToxic,
                action: analysis.isToxic ? 'block' : 'allow',
                reason: analysis.reason,
                confidence: Math.round(analysis.maxScore * 100),
                violations: analysis.violations,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error(`[${req.requestId}] Erro na moderação:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to analyze text',
            requestId: req.requestId
        });
    }
});

// Análise detalhada
app.post('/analyze', async (req, res) => {
    try {
        const { text, thresholds, languages, includeScores = false } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'Text field is required and must be a string'
            });
        }

        const scores = await analyzeText(text, { languages });
        const analysis = analyzeScores(scores, thresholds);

        const response = {
            success: true,
            requestId: req.requestId,
            data: {
                text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
                analysis: {
                    isToxic: analysis.isToxic,
                    confidence: Math.round(analysis.maxScore * 100),
                    maxScore: analysis.maxScore,
                    violations: analysis.violations,
                    reason: analysis.reason
                },
                recommendation: {
                    action: analysis.isToxic ? 'block' : 'allow',
                    severity: analysis.maxScore > 0.9 ? 'high' : analysis.maxScore > 0.7 ? 'medium' : 'low'
                },
                metadata: {
                    textLength: text.length,
                    timestamp: new Date().toISOString(),
                    thresholds: analysis.thresholds
                }
            }
        };

        if (includeScores) {
            response.data.scores = analysis.scores;
        }

        res.json(response);

    } catch (error) {
        console.error(`[${req.requestId}] Erro na análise:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to analyze text',
            requestId: req.requestId
        });
    }
});

// Análise em lote
app.post('/batch', requireApiKey, async (req, res) => {
    try {
        const { texts, thresholds, languages, maxConcurrent = 5 } = req.body;

        if (!Array.isArray(texts) || texts.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'texts field is required and must be a non-empty array'
            });
        }

        if (texts.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'Maximum 50 texts allowed per batch'
            });
        }

        // Processar em lotes para evitar sobrecarga
        const results = [];
        const chunks = [];
        
        for (let i = 0; i < texts.length; i += maxConcurrent) {
            chunks.push(texts.slice(i, i + maxConcurrent));
        }

        for (const chunk of chunks) {
            const promises = chunk.map(async (text, index) => {
                try {
                    const scores = await analyzeText(text, { languages });
                    const analysis = analyzeScores(scores, thresholds);
                    
                    return {
                        index: results.length + index,
                        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                        isToxic: analysis.isToxic,
                        confidence: Math.round(analysis.maxScore * 100),
                        violations: analysis.violations,
                        action: analysis.isToxic ? 'block' : 'allow'
                    };
                } catch (error) {
                    return {
                        index: results.length + index,
                        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                        error: 'Failed to analyze',
                        isToxic: null
                    };
                }
            });

            const chunkResults = await Promise.all(promises);
            results.push(...chunkResults);
        }

        const summary = {
            total: results.length,
            toxic: results.filter(r => r.isToxic === true).length,
            safe: results.filter(r => r.isToxic === false).length,
            errors: results.filter(r => r.error).length
        };

        res.json({
            success: true,
            requestId: req.requestId,
            data: {
                results,
                summary,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error(`[${req.requestId}] Erro na análise em lote:`, error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to process batch',
            requestId: req.requestId
        });
    }
});

// Estatísticas (protegido)
app.get('/stats', requireApiKey, (req, res) => {
    const stats = {
        success: true,
        data: {
            api: {
                version: '1.0.0',
                uptime: Math.floor(process.uptime()),
                memoryUsage: process.memoryUsage(),
                platform: process.platform,
                nodeVersion: process.version
            },
            configuration: {
                toxicityThreshold: TOXICITY_THRESHOLD,
                severeToxicityThreshold: SEVERE_TOXICITY_THRESHOLD,
                rateLimitPerMinute: 100,
                maxTextLength: 3000,
                maxBatchSize: 50
            },
            perspectiveApi: {
                configured: !!PERSPECTIVE_API_KEY,
                attributes: ['TOXICITY', 'SEVERE_TOXICITY', 'IDENTITY_ATTACK', 'INSULT', 'PROFANITY', 'THREAT']
            },
            timestamp: new Date().toISOString()
        }
    };

    res.json(stats);
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
    console.error(`[${req.requestId || 'unknown'}] Erro não tratado:`, error);
    
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        requestId: req.requestId
    });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        availableEndpoints: ['/health', '/info', '/moderate', '/analyze', '/batch', '/stats']
    });
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`🚀 ModBot API rodando na porta ${PORT}`);
    console.log(`📊 Rate limit: 100 requests/minute`);
    console.log(`🔑 API key configurada: ${API_KEY !== 'modbot-api-key-change-me' ? '✅' : '❌ Use uma chave personalizada!'}`);
    console.log(`🌐 Perspective API: ${PERSPECTIVE_API_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
    console.log(`\n📖 Documentação disponível em: http://localhost:${PORT}/info`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Servidor sendo finalizado...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Servidor sendo finalizado...');
    process.exit(0);
});