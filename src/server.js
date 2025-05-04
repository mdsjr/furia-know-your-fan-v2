require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); // Serve arquivos estáticos

const openai = new OpenAI({ apiKey: process.env.API_KEY });
const cacheFile = path.join(__dirname, '../cache/profiles.json');

if (!process.env.X_API_KEY || !process.env.BEARER_TOKEN) {
  throw new Error('X_API_KEY ou BEARER_TOKEN não configurados.');
}

// Serve profile.html para a rota raiz
app.get('/', (req, res) => {
  console.log('Tentando servir profile.html');
  const filePath = path.join(__dirname, '../public/profile.html');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Erro ao servir profile.html:', err);
      res.status(404).send('Arquivo não encontrado');
    }
  });
});

// Middleware para logar requisições estáticas
app.use((req, res, next) => {
  console.log(`Requisição para: ${req.url}`);
  next();
});

app.get('/api/profile/validate/:handle', async (req, res) => {
  const { handle } = req.params;
  try {
    const cache = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
    if (cache[handle]) {
      console.log('Cache hit para', handle);
      return res.json(cache[handle]);
    }
    console.log('Buscando dados da API X para', handle);
    const response = await axios.get(`https://api.x.com/2/users/by/username/${handle}`, {
      headers: { Authorization: `Bearer ${process.env.BEARER_TOKEN}` }
    });
    const data = {
      handle,
      userId: response.data.data.id,
      dates: ['2025-05-01', '2025-05-02', '2025-05-03'],
      postCounts: [5, 3, 8]
    };
    cache[handle] = data;
    await fs.writeFile(cacheFile, JSON.stringify(cache));
    res.json(data);
  } catch (error) {
    console.error('Erro ao validar handle:', error.message);
    res.status(500).json({ error: 'Erro ao validar handle' });
  }
});

app.get('/api/profile/mock/:handle', async (req, res) => {
  const { handle } = req.params;
  try {
    console.log('Gerando dados mock para', handle);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: `Crie dados fictícios de engajamento para o usuário ${handle}` }]
    });
    const data = {
      handle,
      dates: ['2025-05-01', '2025-05-02', '2025-05-03'],
      postCounts: [10, 7, 12]
    };
    res.json(data);
  } catch (error) {
    console.error('Erro ao gerar dados mock:', error.message);
    res.status(500).json({ error: 'Erro ao gerar dados mock' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));