import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());
app.use(express.static('public'));

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para captura de leads
app.post('/submit', async (req, res) => {
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
    console.log('Dados:', JSON.stringify(webhookData, null, 2));
    
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
        
        console.log('Webhook response:', response.status);
      } catch (error) {
        console.error('Erro no webhook:', error);
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
