import 'dotenv/config';
import fs from 'fs';
import { verifyBookSubmission } from './services/aiVerifier.js';

const IMAGE_PATH = './test-book.jpg';

// Minimal valid 1x1 JPEG placeholder
const MINIMAL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
  'base64'
);

async function main() {
  try {
    if (!fs.existsSync(IMAGE_PATH)) {
      fs.writeFileSync(IMAGE_PATH, MINIMAL_JPEG);
      console.log(`Created placeholder image at ${IMAGE_PATH}`);
    }

    const result = await verifyBookSubmission({
      bookName: 'Atomic Habits',
      author: 'James Clear',
      genre: 'Self-Help',
      userReview: 'An incredible book on building small daily habits!',
      username: 'sandesh_user',
      imagePath: IMAGE_PATH,
      imageMimeType: 'image/jpeg',
    });

    console.log('Verification result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error running verifyBookSubmission:');
    console.error(error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  }
}

main();
