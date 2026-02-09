const axios = require('axios');
require('dotenv').config();

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

function createPromptFromTraits(traits) {
  const traitMap = {};
  traits.forEach(t => {
    traitMap[t.trait_type] = t.value;
  });

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
    console.log('Generating image with prompt:', prompt);

    // Using Stable Diffusion XL on Hugging Face
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
      {
        inputs: prompt,
        parameters: {
          num_inference_steps: 25,
          guidance_scale: 7.5
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    // Convert image to base64
    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    const imageUrl = `data:image/png;base64,${base64Image}`;

    console.log('✅ Image generated');

    return {
      success: true,
      image_url: imageUrl,
      prompt: prompt
    };

  } catch (error) {
    console.error('Image generation error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { generateImage, createPromptFromTraits };