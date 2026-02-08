const Replicate = require('replicate');
require('dotenv').config();

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY,
});

// Generate art prompt from NFT traits
function createPromptFromTraits(traits) {
  // Extract trait values
  const traitMap = {};
  traits.forEach(t => {
    traitMap[t.trait_type] = t.value;
  });

  // Build creative prompt
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

// Generate image using Replicate
// Generate image using Google Imagen 4
async function generateImage(traits) {
  try {
    const prompt = createPromptFromTraits(traits);
    console.log('Generating image with Imagen 4...');
    console.log('Prompt:', prompt);

    const output = await replicate.run(
      "google/imagen-4",
      {
        input: {
          prompt: prompt,
          aspect_ratio: "1:1",  // Square format for gallery
          safety_filter_level: "block_medium_and_above"
        }
      }
    );

    // Replicate returns array of image URLs
    const imageUrl = output[0];
    console.log('✅ Image generated:', imageUrl);

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