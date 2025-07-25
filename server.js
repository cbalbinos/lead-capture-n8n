const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
// Usar a porta fornecida pela Railway ou 3000 como fallback
const PORT = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting para proteger contra abusos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  message: 'Muitas requisições deste IP, tente novamente mais tarde.'
});
app.use('/api/', limiter);

// Servir arquivos estáticos
app.use(express.static('public'));

// Rota principal - servir o HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para captura de leads (segura)
app.post('/api/leads', async (req, res) => {
  try {
    const { name, email, whatsapp, timestamp, source } = req.body;
    
    // Validação básica
    if (!name || !email || !whatsapp) {
      return res.status(400).json({ 
        error: 'Dados incompletos', 
        message: 'Nome, email e WhatsApp são obrigatórios' 
      });
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Email inválido', 
        message: 'Por favor, informe um email válido' 
      });
    }
    
    // Validar WhatsApp (apenas números)
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanWhatsapp.length < 10) {
      return res.status(400).json({ 
        error: 'WhatsApp inválido', 
        message: 'Número de WhatsApp incompleto' 
      });
    }
    
    // Dados para enviar ao webhook
    const webhookData = {
      name,
      email,
      whatsapp,
      timestamp: timestamp || new Date().toISOString(),
      source: source || req.get('origin') || 'unknown',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    // Enviar para webhook real (se configurado)
    if (process.env.WEBHOOK_URL) {
      try {
        const webhookResponse = await fetch(process.env.WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.WEBHOOK_TOKEN && {
              'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN}`
            })
          },
          body: JSON.stringify(webhookData)
        });
        
        if (!webhookResponse.ok) {
          console.error('Webhook error:', await webhookResponse.text());
        }
      } catch (webhookError) {
        console.error('Webhook connection error:', webhookError);
        // Não falhamos a requisição mesmo se o webhook falhar
      }
    }
    
    // Log para monitoramento (opcional)
    console.log('Lead capturado:', {
      name: webhookData.name,
      email: webhookData.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mascara email
      timestamp: webhookData.timestamp
    });
    
    // Resposta de sucesso
    res.json({ 
      success: true, 
      message: 'Lead capturado com sucesso!' 
    });
    
  } catch (error) {
    console.error('Erro no processamento:', error);
    res.status(500).json({ 
      error: 'Erro interno', 
      message: 'Ocorreu um erro ao processar sua solicitação' 
    });
  }
});

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: 'Algo deu errado em nosso servidor' 
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    message: 'A rota solicitada não existe' 
  });
});

// Iniciar servidor com tratamento de erros
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Tratamento gracioso de encerramento
process.on('SIGTERM', () => {
  console.log('Recebido SIGTERM. Encerrando servidor...');
  server.close(() => {
    console.log('Servidor encerrado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Recebido SIGINT. Encerrando servidor...');
  server.close(() => {
    console.log('Servidor encerrado.');
    process.exit(0);
  });
});
