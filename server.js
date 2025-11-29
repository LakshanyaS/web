const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const FOOD_API_URL = 'https://food-scanner-server-f486.onrender.com/analyze';

// Main webhook endpoint for Zoho Cliq
app.post('/zoho-webhook', async (req, res) => {
  try {
    console.log('📩 Received from Zoho Cliq:', JSON.stringify(req.body, null, 2));
    
    const message = req.body;
    
    // Extract user info
    const userName = message.user?.name || 'User';
    const userEmail = message.user?.email || 'user@example.com';
    
    // Check for attachments
    let imageUrl = null;
    
    // Try different possible attachment structures
    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0];
      imageUrl = attachment.url || attachment.file_url || attachment.download_url || attachment.link;
    }
    
    // If no attachment found, ask user to upload
    if (!imageUrl) {
      return res.json({
        text: "📸 Please upload an image of your food!\n\nI'll analyze it and tell you the calories and nutrition information.\n\nJust click the 📎 attachment icon and upload a food photo.",
        bot: {
          name: "Food Scanner"
        }
      });
    }

    console.log('🖼️ Image URL found:', imageUrl);

    // Send immediate response
    res.json({
      text: "🔍 Analyzing your food image... Please wait 10-15 seconds.",
      bot: {
        name: "Food Scanner"
      }
    });

    // Call your food scanner API
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

    // Send result back to Zoho Cliq using the bot API
    await sendMessageToCliq(message, resultText);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error details:', error.response?.data || error);
    
    // Try to send error message to user
    try {
      await sendMessageToCliq(req.body, `❌ Sorry, I couldn't analyze the image.\n\nError: ${error.message}\n\nPlease try:\n• Uploading a clearer image\n• Taking a photo in better lighting\n• Waiting 30 seconds and trying again`);
    } catch (sendError) {
      console.error('Failed to send error message:', sendError.message);
    }
  }
});

// Function to send message back to Zoho Cliq
async function sendMessageToCliq(originalMessage, text) {
  try {
    // Option 1: Using chat webhook (if available)
    if (originalMessage.chat?.id) {
      const chatWebhook = `https://cliq.zoho.com/api/v2/chats/${originalMessage.chat.id}/message`;
      
      await axios.post(chatWebhook, {
        text: text
      }, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${originalMessage.bot?.token || ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Message sent to chat');
      return;
    }
    
    // Option 2: Using bot API (if available)
    if (originalMessage.bot?.unique_name) {
      const botWebhook = `https://cliq.zoho.com/api/v2/bots/${originalMessage.bot.unique_name}/message`;
      
      await axios.post(botWebhook, {
        text: text,
        broadcast: false
      }, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${originalMessage.bot?.token || ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Message sent via bot API');
      return;
    }
    
    console.log('⚠️ Could not send message - no chat/bot info available');
    
  } catch (error) {
    console.error('Error sending message to Cliq:', error.message);
    throw error;
  }
}

// Simple Deluge-compatible endpoint
app.post('/deluge-webhook', async (req, res) => {
  try {
    console.log('📩 Deluge webhook received:', JSON.stringify(req.body, null, 2));
    
    const { imageUrl, userName, userEmail } = req.body;
    
    if (!imageUrl) {
      return res.json({
        text: "❌ No image URL provided. Please upload an image."
      });
    }

    // Call food scanner API
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
    console.error('Error in deluge webhook:', error.message);
    res.json({
      text: `❌ Error: ${error.message}\n\nPlease try again.`
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
      <li>POST /zoho-webhook - Main webhook for Zoho Cliq</li>
      <li>POST /deluge-webhook - Simplified endpoint for Deluge scripts</li>
    </ul>
  `);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    endpoints: {
      zoho_webhook: '/zoho-webhook',
      deluge_webhook: '/deluge-webhook'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 Zoho webhook: http://localhost:${PORT}/zoho-webhook`);
  console.log(`📡 Deluge webhook: http://localhost:${PORT}/deluge-webhook`);
});
