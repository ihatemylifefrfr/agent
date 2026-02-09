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
    console.log('Generating image with Pollinations.ai...');
    console.log('Prompt:', prompt);

    // Pollinations.ai - completely free, no API key needed!
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Date.now(); // Random seed for variety
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true`;

    console.log('✅ Image URL generated:', imageUrl);

    return {
      success: true,
      image_url: imageUrl,
      prompt: prompt
    };

  } catch (error) {
    console.error('❌ Image generation error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { generateImage, createPromptFromTraits };