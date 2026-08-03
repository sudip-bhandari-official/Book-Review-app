const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Book = require('./models/Book');
const User = require('./models/User');

dotenv.config();

const INITIAL_MOCK_BOOKS = [
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    coverImageUrl: 'assets/images/books/atomic-habits.jpg',
    summary: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones.',
    duplicateCheckPass: true
  },
  {
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    coverImageUrl: 'assets/images/books/alchemist.jpg',
    summary: 'A magical story about following your dreams and listening to your heart.',
    duplicateCheckPass: true
  },
  {
    title: "Harry Potter and the Philosopher's Stone",
    author: 'J.K. Rowling',
    coverImageUrl: 'assets/images/books/harry-potter.jpg',
    summary: 'The journey of a young wizard discovering his magical destiny.',
    duplicateCheckPass: true
  },
  {
    title: 'Rich Dad Poor Dad',
    author: 'Robert Kiyosaki',
    coverImageUrl: 'assets/images/books/richdad.jpg',
    summary: 'What the rich teach their kids about money that the poor and middle class do not!',
    duplicateCheckPass: true
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB for seeding');

    // Get the admin user or a default user
    let user = await User.findOne({ role: 'admin' });
    if (!user) {
      user = await User.findOne(); // grab any user
    }
    const addedBy = user ? user._id : null;

    for (const b of INITIAL_MOCK_BOOKS) {
      const exists = await Book.findOne({ title: b.title });
      if (!exists) {
        await Book.create({ ...b, addedBy });
        console.log(`Added sample book: ${b.title}`);
      } else {
        console.log(`Book already exists: ${b.title}`);
      }
    }

    console.log('Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
