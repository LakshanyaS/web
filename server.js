const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const FOOD_API_URL = 'https://food-scanner-server-f486.onrender.com/analyze';

// Main webhook endpoint for Zoho Cliq
app.post('/zoho-webhook', async (req, res) => {
  try {
    console.log('📩 Received from Zoho Cliq:', JSON.stringify(req.body, null, 2));
    
    const { message, attachments, user } = req.body;
    
    // Extract user info
    const userName = user?.name || 'User';
    const userEmail = user?.email || 'user@example.com';
    
    // Check for attachments
    let imageUrl = null;
    
    if (attachments && attachments.length > 0) {
      const attachment = attachments[0];
      imageUrl = attachment.url || attachment.file_url || attachment.download_url || attachment.link;
    }
    
    // If no attachment found, ask user to upload
    if (!imageUrl) {
      return res.json({
        text: "📸 Please upload an image of your food!\n\nClick the 📎 attachment icon and upload a food photo."
      });
    }

    console.log('🖼️ Image URL found:', imageUrl);

    // Call your food scanner API and wait for result
    console.log('📡 Calling food scanner API...');
    
    const foodApiResponse = await axios.post(FOOD_API_URL, {
      imageUrl: imageUrl,
      userName: userName,
      userEmail: userEmail
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 seconds timeout
    });

    console.log('✅ Food API response:', JSON.stringify(foodApiResponse.data, null, 2));

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

    // Return result immediately
    res.json({
      text: resultText
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error details:', error.response?.data || error);
    
    res.json({
      text: `❌ Sorry, I couldn't analyze the image.\n\nError: ${error.message}\n\nPlease try:\n• Uploading a clearer image\n• Taking a photo in better lighting\n• Waiting 30 seconds and trying again (servers might be waking up)`
    });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send(`
    <h1>🍽️ Zoho Cliq Food Scanner Bot</h1>
    <p>Status: ✅ Running</p>
    <p>Webhook endpoint: POST /zoho-webhook</p>
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
  console.log(`📡 Zoho webhook: http://localhost:${PORT}/zoho-webhook`);
});
