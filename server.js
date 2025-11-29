const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const app = express();

app.use(express.json());

const FOOD_API_URL = 'https://food-scanner-server-f486.onrender.com/analyze';

// Main webhook endpoint for Zoho Cliq
app.post('/zoho-webhook', async (req, res) => {
  try {
    console.log('Received webhook from Zoho Cliq:', JSON.stringify(req.body, null, 2));
    
    const { message, user } = req.body;
    
    // Check if message has an attachment (image)
    if (!message?.attachments || message.attachments.length === 0) {
      return res.json({
        text: "📸 Please upload an image of your food to analyze its calories!",
        bot: {
          name: "Calorie Scanner"
        }
      });
    }

    // Get the first image attachment
    const attachment = message.attachments[0];
    const imageUrl = attachment.url || attachment.file_url;

    if (!imageUrl) {
      return res.json({
        text: "❌ Could not get image URL. Please try uploading again."
      });
    }

    // Send initial response
    res.json({
      text: "🔍 Analyzing your food image... Please wait a moment.",
      bot: {
        name: "Calorie Scanner"
      }
    });

    // Call your food analysis API
    const analysisResponse = await axios.post(FOOD_API_URL, {
      imageUrl: imageUrl,
      userName: user.name || 'User',
      userEmail: user.email || 'user@example.com'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });

    const data = analysisResponse.data;

    // Send the results back to Zoho Cliq using bot.execute
    if (req.body.bot?.token) {
      await sendResultsToCliq(req.body, data);
    }

  } catch (error) {
    console.error('Error processing request:', error.message);
    
    // Try to send error message to Cliq
    if (req.body.bot?.token) {
      await sendErrorToCliq(req.body, error.message);
    }
  }
});

// Function to send results back to Zoho Cliq
async function sendResultsToCliq(originalRequest, analysisData) {
  try {
    const { foods, total_calories, total_protein, total_carbs, total_fat } = analysisData;

    // Build food items list
    let foodsText = '';
    if (foods && foods.length > 0) {
      foods.forEach((food, index) => {
        foodsText += `\n\n**${index + 1}. ${food.name}**\n`;
        foodsText += `Portion: ${food.portion}\n`;
        foodsText += `Calories: ${food.calories} kcal | Protein: ${food.protein}g | Carbs: ${food.carbs}g | Fat: ${food.fat}g`;
      });
    }

    // Create card response
    const response = {
      text: `🍽️ **Food Analysis Complete!**${foodsText}\n\n---\n**📊 Total Nutrition:**\n🔥 Calories: ${total_calories} kcal\n💪 Protein: ${total_protein}g\n🌾 Carbs: ${total_carbs}g\n🥑 Fat: ${total_fat}g`,
      card: {
        title: "Nutritional Analysis Results",
        theme: "modern-inline",
        sections: [
          {
            id: 1,
            elements: foods.map((food, index) => ({
              type: "text",
              text: `**${food.name}** (${food.portion})\nCalories: ${food.calories} kcal | P: ${food.protein}g | C: ${food.carbs}g | F: ${food.fat}g`
            }))
          },
          {
            id: 2,
            title: "Total Nutrition",
            elements: [
              {
                type: "text",
                text: `🔥 **${total_calories} kcal** | 💪 ${total_protein}g protein | 🌾 ${total_carbs}g carbs | 🥑 ${total_fat}g fat`
              }
            ]
          }
        ]
      }
    };

    // Send message using Cliq API
    const cliqApiUrl = `https://cliq.zoho.com/api/v2/bots/${originalRequest.bot.unique_name}/message`;
    
    await axios.post(cliqApiUrl, response, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${originalRequest.bot.token}`,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error sending results to Cliq:', error.message);
  }
}

// Function to send error message to Zoho Cliq
async function sendErrorToCliq(originalRequest, errorMessage) {
  try {
    const response = {
      text: `❌ Sorry, I couldn't analyze the image. Error: ${errorMessage}\n\nPlease try again with a clearer image.`
    };

    const cliqApiUrl = `https://cliq.zoho.com/api/v2/bots/${originalRequest.bot.unique_name}/message`;
    
    await axios.post(cliqApiUrl, response, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${originalRequest.bot.token}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error sending error to Cliq:', error.message);
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Zoho Cliq Food Scanner Bot is running! 🍽️');
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Zoho Cliq Food Scanner Bot running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/zoho-webhook`);
});
