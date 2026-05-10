import sharp from 'sharp';

export async function convertToBase64WebP(base64String: string | undefined): Promise<string | undefined> {
  if (!base64String || !base64String.startsWith('data:image/')) {
    return base64String;
  }

  try {
    const base64Data = base64String.split(';base64,').pop();
    if (!base64Data) return base64String;

    const buffer = Buffer.from(base64Data, 'base64');

    // Optimization Pipeline
    const optimizedBuffer = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF data (prevents sideways images)
      .resize({
        width: 1200,            // Max width for blog posts
        withoutEnlargement: true // Don't upscale small images
      })
      .webp({ 
        quality: 60,            // Significant compression without visible loss
        effort: 6,              // High compression effort (takes slightly longer but smaller file)
        smartSubsample: true 
      })
      .toBuffer();

    const newBase64 = `data:image/webp;base64,${optimizedBuffer.toString('base64')}`;
    
    // LOG FOR DEBUGGING: Compare sizes in terminal
    console.log(`📸 Image Optimized: ${(base64String.length / 1024).toFixed(2)}KB -> ${(newBase64.length / 1024).toFixed(2)}KB`);

    return newBase64;
  } catch (error) {
    console.error("Image optimization failed:", error);
    return base64String;
  }
}