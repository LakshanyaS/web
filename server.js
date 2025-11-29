const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const FOOD_API_URL = 'https://food-scanner-server-f486.onrender.com/analyze-food';

// Main webhook endpoint for Zoho Cliq
app.post('/zoho-webhook', async (req, res) => {
  try {
    console.log('=== ZOHO CLIQ REQUEST RECEIVED ===');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    
    const { message, attachments, user } = req.body;
    
    // Extract user info
    const userName = user?.name || 'User';
    const userEmail = user?.email || 'user@example.com';
    
    console.log('User:', userName, userEmail);
    
    // Check for attachments - try ALL possible structures
    let imageUrl = null;
    
    console.log('Checking attachments...');
    console.log('Attachments object:', JSON.stringify(attachments, null, 2));
    
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      const attachment = attachments[0];
      console.log('First attachment:', JSON.stringify(attachment, null, 2));
      
      // Try all possible URL fields
      imageUrl = attachment.url || 
                 attachment.file_url || 
                 attachment.download_url || 
                 attachment.link ||
                 attachment.preview_url ||
                 attachment.thumbnail_url;
                 
      console.log('Extracted imageUrl:', imageUrl);
    } else {
      console.log('No attachments found or attachments is not an array');
    }
    
    // If no attachment found, ask user to upload
    if (!imageUrl) {
      console.log('❌ No image URL found - asking user to upload');
      return res.json({
        text: "📸 Please upload an image of your food!\n\nClick the 📎 attachment icon and upload a food photo.\n\nDEBUG: No image URL found in request"
      });
    }

    console.log('✅ Image URL found:', imageUrl);

    // Prepare the request for food API
    const requestData = {
      imageUrl: imageUrl,
      userName: userName,
      userEmail: userEmail
    };
    
    console.log('=== CALLING FOOD API ===');
    console.log('URL:', FOOD_API_URL);
    console.log('Request data:', JSON.stringify(requestData, null, 2));
    
    // Call your food scanner API
    const foodApiResponse = await axios.post(FOOD_API_URL, requestData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    console.log('=== FOOD API SUCCESS ===');
    console.log('Response:', JSON.stringify(foodApiResponse.data, null, 2));

    const { foods, total_calories, total_protein, total_carbs, total_fat } = foodApiResponse.data;

    // Build response text
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
    console.error('Error message:', error.message);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    console.error('Error headers:', error.response?.headers);
    
    // Build detailed error message
    let errorText = `❌ Sorry, I couldn't analyze the image.\n\n`;
    errorText += `Error: ${error.message}\n`;
    errorText += `Status: ${error.response?.status || 'N/A'}\n`;
    
    if (error.response?.data) {
      errorText += `\nAPI Response: ${JSON.stringify(error.response.data)}\n`;
    }
    
    errorText += `\nPlease try:\n`;
    errorText += `• Uploading a clearer image\n`;
    errorText += `• Taking a photo in better lighting\n`;
    errorText += `• Waiting 30 seconds and trying again`;
    
    res.json({
      text: errorText
    });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send(`
    <h1>🍽️ Zoho Cliq Food Scanner Bot</h1>
    <p>Status: ✅ Running</p>
    <p>Webhook endpoint: POST /zoho-webhook</p>
    <p>Food API: ${FOOD_API_URL}</p>
    <p>Check logs for detailed debugging information</p>
  `);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    food_api: FOOD_API_URL
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 Zoho webhook: http://localhost:${PORT}/zoho-webhook`);
  console.log(`🍽️ Food API: ${FOOD_API_URL}`);
});
