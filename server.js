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
    
    const { message, attachments, user, bot } = req.body;
    
    // Extract user info
    const userName = (user?.first_name || '') + ' ' + (user?.last_name || '');
    const userEmail = user?.email || 'user@example.com';
    
    console.log('User:', userName, userEmail);
    
    // Check if attachments exist
    if (!attachments || attachments.length === 0) {
      console.log('❌ No attachments found');
      return res.json({
        text: "📸 Please upload an image of your food!\n\nClick the 📎 attachment icon and upload a food photo."
      });
    }

    console.log('Attachments received:', attachments);
    
    // Zoho Cliq sends attachments as just filenames
    // We need to construct the full URL to download the image
    // The image is typically available at a Zoho CDN URL
    
    // For now, tell the user we need them to upload the image to a public URL
    // Or we need Zoho OAuth to download the file
    
    return res.json({
      text: `❌ Image upload detected but Zoho Cliq doesn't provide direct image URLs.\n\n` +
            `**Two options to fix this:**\n\n` +
            `**Option 1 (Easiest):** Upload your food image to a free image hosting service like:\n` +
            `• imgbb.com\n` +
            `• imgur.com\n` +
            `• postimages.org\n\n` +
            `Then send me the image URL and I'll analyze it!\n\n` +
            `**Option 2:** I need additional Zoho Cliq API permissions to download attachments directly. This requires OAuth setup.`
    });

  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Error:', error.message);
    
    res.json({
      text: `❌ Error: ${error.message}`
    });
  }
});

// NEW: Direct URL analysis endpoint
app.post('/analyze-url', async (req, res) => {
  try {
    console.log('=== DIRECT URL ANALYSIS ===');
    const { imageUrl, userName, userEmail } = req.body;
    
    if (!imageUrl) {
      return res.json({
        text: "❌ No image URL provided. Please provide an image URL."
      });
    }

    console.log('Analyzing image URL:', imageUrl);

    // Call your food scanner API
    const foodApiResponse = await axios.post(FOOD_API_URL, {
      imageUrl: imageUrl,
      userName: userName || 'User',
      userEmail: userEmail || 'user@example.com'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    console.log('✅ Food API response:', foodApiResponse.data);

    const { foods, total_calories, total_protein, total_carbs, total_fat } = foodApiResponse.data;

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
    console.error('Error in analyze-url:', error.message);
    res.json({
      text: `❌ Error: ${error.message}`
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
      <li>POST /zoho-webhook - Zoho Cliq webhook (file uploads not working)</li>
      <li>POST /analyze-url - Direct image URL analysis</li>
    </ul>
    <p>Food API: ${FOOD_API_URL}</p>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 Zoho webhook: http://localhost:${PORT}/zoho-webhook`);
  console.log(`📡 Analyze URL: http://localhost:${PORT}/analyze-url`);
});
