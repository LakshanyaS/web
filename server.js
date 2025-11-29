const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Your food scanner API endpoint
const FOOD_API_URL = 'https://food-scanner-server-f486.onrender.com/analyze-food';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.send(`
    <h1>🍽️ Zoho Cliq Food Scanner Bot</h1>
    <p><strong>Status:</strong> ✅ Running</p>
    <p><strong>Webhook endpoint:</strong> POST /zoho-webhook-file</p>
    <p><strong>Food API:</strong> ${FOOD_API_URL}</p>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: '/zoho-webhook-file',
      foodApi: FOOD_API_URL
    }
  });
});

// Zoho Cliq webhook endpoint - receives file uploads
app.post('/zoho-webhook-file', upload.single('foodImage'), async (req, res) => {
  console.log('=== ZOHO CLIQ FILE UPLOAD RECEIVED ===');
  
  try {
    // Get user info from form data
    const userName = req.body.userName || 'User';
    const userEmail = req.body.userEmail || 'user@example.com';
    
    console.log('User:', userName, userEmail);
    
    // Check if file was uploaded
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.json({
        text: '❌ No image received. Please upload a food image.'
      });
    }
    
    console.log('File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    // Convert file buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    console.log('Image converted to base64, length:', base64Image.length);
    
    // Call your food scanner API
    console.log('Calling food scanner API...');
    console.log('API URL:', FOOD_API_URL);
    
    const foodApiResponse = await axios.post(FOOD_API_URL, {
      imageBase64: base64Image,
      userName: userName,
      userEmail: userEmail
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 second timeout
    });
    
    console.log('Food API response received');
    console.log('Response data:', JSON.stringify(foodApiResponse.data, null, 2));
    
    // Parse the response from YOUR food scanner API
    const foodData = foodApiResponse.data;
    
    // Check if the response has the expected structure
    if (!foodData || !foodData.foods || !Array.isArray(foodData.foods)) {
      console.log('❌ Unexpected API response format');
      return res.json({
        text: '❌ Could not analyze the image. Please try with a clearer food photo.'
      });
    }
    
    // Format the response for Zoho Cliq
    let formattedResponse = '🍽️ *Food Analysis Complete!*\n\n';
    
    // Add each food item
    foodData.foods.forEach((food, index) => {
      formattedResponse += `*${index + 1}. ${food.name}*\n`;
      formattedResponse += `Portion: ${food.portion}\n`;
      formattedResponse += `Calories: ${food.calories} kcal | `;
      formattedResponse += `Protein: ${food.protein}g | `;
      formattedResponse += `Carbs: ${food.carbs}g | `;
      formattedResponse += `Fat: ${food.fat}g\n\n`;
    });
    
    // Add total nutrition
    formattedResponse += '━━━━━━━━━━━━━━━\n';
    formattedResponse += '📊 *TOTAL NUTRITION*\n';
    formattedResponse += `🔥 Calories: ${foodData.total_calories} kcal\n`;
    formattedResponse += `💪 Protein: ${foodData.total_protein}g\n`;
    formattedResponse += `🌾 Carbs: ${foodData.total_carbs}g\n`;
    formattedResponse += `🥑 Fat: ${foodData.total_fat}g`;
    
    console.log('Formatted response created');
    
    // Return to Zoho Cliq
    res.json({
      text: formattedResponse
    });
    
  } catch (error) {
    console.log('=== ERROR ===');
    console.log('Error message:', error.message);
    
    if (error.response) {
      console.log('Error response status:', error.response.status);
      console.log('Error response data:', error.response.data);
    }
    
    let errorMessage = '❌ Sorry, I couldn\'t analyze the image.\n\n';
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage += 'Error: Request timeout\n\n';
      errorMessage += 'The food scanner API took too long to respond.\n';
      errorMessage += 'Please try again - it might be waking up.';
    } else if (error.response) {
      errorMessage += `Error: ${error.response.data?.error || error.message}\n\n`;
      errorMessage += 'Please try:\n';
      errorMessage += '• Uploading a clearer image\n';
      errorMessage += '• Taking a photo in better lighting\n';
      errorMessage += '• Ensuring the food is clearly visible';
    } else {
      errorMessage += `Error: ${error.message}\n\n`;
      errorMessage += 'Please wait 30 seconds (servers might be waking up) and try again.';
    }
    
    res.json({
      text: errorMessage
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 Zoho webhook: http://localhost:${PORT}/zoho-webhook-file`);
  console.log(`🍽️ Food API: ${FOOD_API_URL}`);
});
