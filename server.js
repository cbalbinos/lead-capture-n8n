const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para captura de leads
app.post('/submit-lead', async (req, res) => {
  try {
    const { name, email, whatsapp } = req.body;
    
    // Validação básica
    if (!name || !email || !whatsapp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Todos os campos são obrigatórios' 
      });
    }
    
    // Dados para enviar ao webhook
    const webhookData = {
      name,
      email,
      whatsapp,
      timestamp: new Date().toISOString(),
      source: req.get('origin') || 'railway-app'
    };
    
    console.log('Enviando para webhook:', process.env.WEBHOOK_URL);
    
    // Enviar para webhook
    if (process.env.WEBHOOK_URL) {
      try {
        const response = await fetch(process.env.WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData)
        });
        
        console.log('Webhook response status:', response.status);
        
        if (response.ok) {
          console.log('Dados enviados com sucesso para o webhook');
        } else {
          console.error('Erro no webhook:', await response.text());
        }
      } catch (error) {
        console.error('Erro ao conectar com webhook:', error);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Cadastro realizado com sucesso!' 
    });
    
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
