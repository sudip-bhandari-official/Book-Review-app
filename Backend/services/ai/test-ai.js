import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { validateContribution } from './aiValidation.js';

// Resolve .env path from current folder or root directory
const envPath = fs.existsSync('.env') ? '.env' : path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });

const IMAGE_PATH = path.resolve(process.cwd(), './test-book.jpg');

// Minimal valid 1x1 JPEG placeholder image if test image is missing
const MINIMAL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
  'base64'
);

async function main() {
  try {
    // Create test image if it doesn't exist
    if (!fs.existsSync(IMAGE_PATH)) {
      fs.writeFileSync(IMAGE_PATH, MINIMAL_JPEG);
      console.log(`Created test placeholder image at ${IMAGE_PATH}`);
    }

    console.log('Running AI validation test...');

    // Call validateContribution(imagePath, metadata)
    const result = await validateContribution(IMAGE_PATH, {
      title: 'Atomic Habits',
      author: 'James Clear',
      genre: 'Self-Help',
      userReview: 'An incredible book on building small daily habits!',
      username: 'sandesh_user'
    });

    console.log('\n✅ AI Validation Output:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Error running AI validation test:');
    console.error(error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  }
}

main();