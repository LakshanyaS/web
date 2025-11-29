const express = require('express');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const FormData = require('form-data');

const app = express();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

const FOOD_API_URL = 'https://food-scanner-server-f486.onrender.com/analyze-food';

// NEW ENDPOINT: Handle file upload from Zoho Cliq
app.post('/zoho-webhook-file', upload.single('foodImage'), async (req, res) => {
  try {
    console.log('=== FILE UPLOAD RECEIVED FROM ZOHO ===');
    console.log('File:', req.file);
    console.log('Body:', req.body);
    
    if (!req.file) {
      return res.json({
        text: "❌ No image file received. Please upload a food image."
      });
    }

    const userName = req.body.userName || 'User';
    const userEmail = req.body.userEmail || 'user@example.com';
    
    console.log('User:', userName, userEmail);
    console.log('Processing uploaded image...');

    // Read the uploaded file
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');
    
    console.log('Image converted to base64, size:', base64Image.length);

    // Call your food scanner API with base64 image
    console.log('Calling food API...');
    
    const foodApiResponse = await axios.post(FOOD_API_URL, {
      imageBase64: base64Image,
      userName: userName,
      userEmail: userEmail
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    console.log('✅ Food API Success');

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    const { foods, total_calories, total_protein, total_carbs, total_fat } = foodApiResponse.data;

    // Build response
    let resultText = "🍽️ **Food Analysis Complete!**\n\n";
    
    if (foods && foods.length > 0) {
      foods.forEach((food, index) => {
        resultText += `**${index + 1}. ${food.name}**\n`;
        resultText += `Portion: ${food.portion}\n`;
        resultText += `Calories: ${food.calories} kcal | Protein: ${food.protein}g | Carbs: ${food.carbs}g | Fat: ${food.fat}g\n\n`;
      });
    }
    
    resultText += "━━━━━━━━━━━━━━━\n";
    resultText += "**📊 TOTAL NUTRITION**\n";
    resultText += `🔥 Calories: **${total_calories} kcal**\n`;
    resultText += `💪 Protein: ${total_protein}g\n`;
    resultText += `🌾 Carbs: ${total_carbs}g\n`;
    resultText += `🥑 Fat: ${total_fat}g`;

    res.json({
      text: resultText
    });

  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Error:', error.message);
    console.error('Response:', error.response?.data);
    
    // Clean up file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      text: `❌ Error analyzing image: ${error.message}\n\nPlease try:\n• Uploading a clearer image\n• Taking photo in better lighting\n• Waiting 30 seconds (servers waking up)`
    });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send(`
    <h1>🍽️ Zoho Cliq Food Scanner Bot</h1>
    <p>Status: ✅ Running</p>
    <h3>Endpoints:</h3>
    <ul>
      <li>POST /zoho-webhook-file - Handles file uploads from Zoho Cliq</li>
    </ul>
    <p>Food API: ${FOOD_API_URL}</p>
  `);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 File upload endpoint: http://localhost:${PORT}/zoho-webhook-file`);
});
