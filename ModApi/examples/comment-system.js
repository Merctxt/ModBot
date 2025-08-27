// Exemplo de integração com sistema de comentários
const axios = require('axios');

class CommentModerator {
    constructor(apiUrl = 'http://localhost:3000', apiKey = null) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.defaultThresholds = {
            toxicity: 0.7,
            severeToxicity: 0.8,
            insult: 0.6,
            profanity: 0.5,
            threat: 0.8
        };
    }

    async moderateComment(comment, userId, postId) {
        try {
            const response = await axios.post(`${this.apiUrl}/analyze`, {
                text: comment,
                thresholds: this.defaultThresholds,
                includeScores: true
            });

            const result = response.data;
            
            if (result.success) {
                const analysis = result.data.analysis;
                
                // Log da moderação
                console.log(`[MODERATION] User: ${userId}, Post: ${postId}`);
                console.log(`[MODERATION] Toxic: ${analysis.isToxic}, Confidence: ${analysis.confidence}%`);
                
                return {
                    approved: !analysis.isToxic,
                    confidence: analysis.confidence,
                    violations: analysis.violations,
                    action: this.determineAction(analysis),
                    reason: analysis.reason,
                    scores: result.data.scores
                };
            }
            
            throw new Error('API returned unsuccessful response');
            
        } catch (error) {
            console.error('[MODERATION ERROR]', error.message);
            
            // Em caso de erro, permitir por segurança (ou implementar fallback)
            return {
                approved: true,
                confidence: 0,
                violations: [],
                action: 'approve_with_warning',
                reason: 'Moderation service unavailable',
                error: error.message
            };
        }
    }

    determineAction(analysis) {
        if (!analysis.isToxic) {
            return 'approve';
        }
        
        if (analysis.confidence >= 90) {
            return 'block'; // Bloquear imediatamente
        } else if (analysis.confidence >= 70) {
            return 'hold_for_review'; // Segurar para revisão manual
        } else {
            return 'approve_with_flag'; // Aprovar mas marcar para monitoramento
        }
    }

    async batchModerateComments(comments) {
        if (!this.apiKey) {
            throw new Error('API key required for batch operations');
        }

        try {
            const texts = comments.map(c => c.text);
            
            const response = await axios.post(`${this.apiUrl}/batch`, {
                texts: texts,
                thresholds: this.defaultThresholds,
                maxConcurrent: 5
            }, {
                headers: {
                    'X-API-Key': this.apiKey
                }
            });

            const result = response.data;
            
            if (result.success) {
                return result.data.results.map((modResult, index) => ({
                    ...comments[index],
                    moderation: {
                        approved: !modResult.isToxic,
                        confidence: modResult.confidence,
                        violations: modResult.violations,
                        action: modResult.isToxic ? 'block' : 'approve'
                    }
                }));
            }
            
            throw new Error('Batch moderation failed');
            
        } catch (error) {
            console.error('[BATCH MODERATION ERROR]', error.message);
            throw error;
        }
    }
}

// Exemplo de uso em um sistema de blog/fórum
class BlogCommentSystem {
    constructor() {
        this.moderator = new CommentModerator();
        this.pendingComments = [];
        this.approvedComments = [];
        this.blockedComments = [];
    }

    async submitComment(commentData) {
        const { userId, postId, text, userEmail } = commentData;
        
        console.log(`[COMMENT] Novo comentário de ${userEmail} no post ${postId}`);
        
        try {
            // Moderar o comentário
            const moderation = await this.moderator.moderateComment(text, userId, postId);
            
            const comment = {
                id: this.generateCommentId(),
                userId,
                postId,
                text,
                userEmail,
                timestamp: new Date(),
                moderation
            };

            // Decidir o que fazer com base na moderação
            switch (moderation.action) {
                case 'approve':
                    this.approvedComments.push(comment);
                    console.log(`[COMMENT] Comentário aprovado automaticamente`);
                    return { status: 'approved', commentId: comment.id };

                case 'block':
                    this.blockedComments.push(comment);
                    console.log(`[COMMENT] Comentário bloqueado - ${moderation.reason}`);
                    return { 
                        status: 'blocked', 
                        reason: 'Seu comentário contém conteúdo inadequado e não pode ser publicado.' 
                    };

                case 'hold_for_review':
                    this.pendingComments.push(comment);
                    console.log(`[COMMENT] Comentário em análise manual`);
                    return { 
                        status: 'pending', 
                        message: 'Seu comentário está sendo analisado e será publicado em breve.' 
                    };

                case 'approve_with_flag':
                    comment.flagged = true;
                    this.approvedComments.push(comment);
                    console.log(`[COMMENT] Comentário aprovado mas marcado para monitoramento`);
                    return { status: 'approved', commentId: comment.id };

                default:
                    // Fallback
                    this.pendingComments.push(comment);
                    return { 
                        status: 'pending', 
                        message: 'Seu comentário está sendo processado.' 
                    };
            }
            
        } catch (error) {
            console.error('[COMMENT ERROR]', error);
            return { 
                status: 'error', 
                message: 'Erro ao processar comentário. Tente novamente.' 
            };
        }
    }

    async moderateExistingComments() {
        console.log(`[BATCH] Moderando ${this.approvedComments.length} comentários existentes`);
        
        try {
            const commentsToCheck = this.approvedComments
                .filter(c => !c.moderation || !c.moderation.reviewed)
                .map(c => ({ id: c.id, text: c.text }));

            if (commentsToCheck.length === 0) {
                console.log('[BATCH] Nenhum comentário para moderar');
                return;
            }

            const results = await this.moderator.batchModerateComments(commentsToCheck);
            
            results.forEach(result => {
                const comment = this.approvedComments.find(c => c.id === result.id);
                if (comment && result.moderation.confidence > 80 && !result.moderation.approved) {
                    // Mover comentário tóxico para revisão
                    this.approvedComments = this.approvedComments.filter(c => c.id !== result.id);
                    comment.moderation = result.moderation;
                    this.pendingComments.push(comment);
                    console.log(`[BATCH] Comentário ${result.id} movido para revisão`);
                }
            });
            
        } catch (error) {
            console.error('[BATCH ERROR]', error);
        }
    }

    generateCommentId() {
        return 'comment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getStats() {
        return {
            approved: this.approvedComments.length,
            pending: this.pendingComments.length,
            blocked: this.blockedComments.length,
            flagged: this.approvedComments.filter(c => c.flagged).length
        };
    }
}

// Exemplo de uso
async function exemploUso() {
    const blog = new BlogCommentSystem();

    // Simular comentários
    const comentarios = [
        {
            userId: 'user1',
            postId: 'post123',
            text: 'Ótimo artigo! Muito informativo.',
            userEmail: 'user1@example.com'
        },
        {
            userId: 'user2',
            postId: 'post123',
            text: 'Discordo completamente, isso é ridículo!',
            userEmail: 'user2@example.com'
        },
        {
            userId: 'user3',
            postId: 'post123',
            text: 'Você é um idiota, que merda de artigo!',
            userEmail: 'user3@example.com'
        }
    ];

    console.log('=== TESTE DO SISTEMA DE COMENTÁRIOS ===\n');

    for (const comentario of comentarios) {
        console.log(`Processando: "${comentario.text}"`);
        const result = await blog.submitComment(comentario);
        console.log(`Resultado: ${JSON.stringify(result, null, 2)}\n`);
        
        // Pequena pausa entre comentários
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('=== ESTATÍSTICAS FINAIS ===');
    console.log(blog.getStats());
}

// Executar exemplo se este arquivo for executado diretamente
if (require.main === module) {
    exemploUso().catch(console.error);
}

module.exports = { CommentModerator, BlogCommentSystem };
