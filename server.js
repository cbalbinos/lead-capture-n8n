const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas requisições deste IP, tente novamente mais tarde.'
});
app.use('/api/', limiter);

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para leads
app.post('/api/leads', async (req, res) => {
  try {
    const { name, email, whatsapp } = req.body;
    
    if (!name || !email || !whatsapp) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    // Enviar para webhook
    if (process.env.WEBHOOK_URL) {
      try {
        const webhookData = {
          name,
          email,
          whatsapp,
          timestamp: new Date().toISOString()
        };
        
        const response = await fetch(process.env.WEBHOOK_URL.trim(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.WEBHOOK_TOKEN && {
              'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN}`
            })
          },
          body: JSON.stringify(webhookData)
        });
        
        console.log('Webhook response:', response.status);
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
