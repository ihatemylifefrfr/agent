const axios = require('axios');
require('dotenv').config();

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

function createPromptFromTraits(traits) {
  const traitMap = {};
  
  if (Array.isArray(traits)) {
    traits.forEach(t => {
      traitMap[t.trait_type] = t.value;
    });
  }

  let prompt = 'digital art, highly detailed, ';

  if (traitMap.Background) {
    prompt += `${traitMap.Background} background, `;
  }
  if (traitMap.Type) {
    prompt += `${traitMap.Type}, `;
  }
  if (traitMap.Rarity) {
    prompt += `${traitMap.Rarity} quality, `;
  }

  prompt += 'vibrant colors, fantasy art, masterpiece, 4k';
  return prompt;
}

async function generateImage(traits) {
  try {
    const prompt = createPromptFromTraits(traits);
    console.log('Generating image with Hugging Face...');
    console.log('Prompt:', prompt);
    console.log('API Key present:', HF_API_KEY ? 'Yes' : 'No');

    if (!HF_API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY not found in environment variables');
    }

    // UPDATED: Using new Hugging Face router endpoint
    const response = await axios.post(
      'https://router.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
      {
        inputs: prompt,
        parameters: {
          num_inference_steps: 30,
          guidance_scale: 7.5
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 60000
      }
    );

    console.log('Response status:', response.status);

    // Convert image to base64
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    const imageUrl = `data:image/png;base64,${base64Image}`;

    console.log('✅ Image generated successfully');

    return {
      success: true,
      image_url: imageUrl,
      prompt: prompt
    };

  } catch (error) {
    console.error('❌ Image generation error:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.message);
    if (error.response?.data) {
      console.error('Data:', error.response.data.toString());
    }
    
    return {
      success: false,
      error: `Hugging Face error: ${error.message}`
    };
  }
}

module.exports = { generateImage, createPromptFromTraits };