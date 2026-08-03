/* ============================================================
   BookNest — API Integration Service
   Communicates with Express Backend (http://localhost:5000)
   ============================================================ */

const BASE_URL = 'http://localhost:5000';

// Helper to retrieve token from localStorage
export const getToken = () => localStorage.getItem('bn_token');
export const setToken = (token) => localStorage.setItem('bn_token', token);
export const removeToken = () => localStorage.removeItem('bn_token');

// Helper for standard API headers
const getHeaders = (isJson = true) => {
  const token = getToken();
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Generic request wrapper with offline mock fallback
async function request(endpoint, options = {}, mockFallback = null) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getHeaders(options.isJson !== false),
        ...options.headers,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.msg || data.error || `Server error (${res.status})`);
    }
    return data;
  } catch (err) {
    // If backend is unreachable and mock data is provided, fall back gracefully
    if (err.message.includes('Failed to fetch') && mockFallback !== null) {
      console.warn(`[API] Server unreachable at ${BASE_URL}${endpoint}. Using local fallback data.`);
      return mockFallback;
    }
    throw err;
  }
}

/* ============================================================
   1. AUTHENTICATION ENDPOINTS (/auth)
   ============================================================ */

export const authAPI = {
  // POST /auth/signup
  signup: async (email, password, name) => {
    return request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  // POST /auth/login
  login: async (email, password) => {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // POST /auth/backdoor-admin
  backdoorAdmin: async (email, password, name, secretKey) => {
    return request('/auth/backdoor-admin', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, secretKey }),
    });
  },
};

/* ============================================================
   2. PROFILE ENDPOINTS (/profile)
   ============================================================ */

export const profileAPI = {
  // GET /profile/me
  getProfile: async () => {
    return request('/profile/me', { method: 'GET' }, {
      user: { name: 'Demo Reader', email: 'reader@booknest.com', likedBooks: [] },
      stats: { reviewsCount: 4, contributionsCount: 1 }
    });
  },

  // PUT /profile/update
  updateProfile: async (name, profilePic) => {
    return request('/profile/update', {
      method: 'PUT',
      body: JSON.stringify({ name, profilePic }),
    });
  },
};

/* ============================================================
   3. BOOKS ENDPOINTS (/books)
   ============================================================ */

// Mock books fallback in case backend is offline
const INITIAL_MOCK_BOOKS = [
  {
    _id: 'mock-1',
    title: 'Atomic Habits',
    author: 'James Clear',
    coverImageUrl: 'assets/images/books/atomic-habits.jpg',
    summary: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones.',
    rating: 4.8,
    reviewsCount: 1204,
    likesCount: 940,
    dislikesCount: 12
  },
  {
    _id: 'mock-2',
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    coverImageUrl: 'assets/images/books/alchemist.jpg',
    summary: 'A magical story about following your dreams and listening to your heart.',
    rating: 4.9,
    reviewsCount: 982,
    likesCount: 820,
    dislikesCount: 15
  },
  {
    _id: 'mock-3',
    title: "Harry Potter and the Philosopher's Stone",
    author: 'J.K. Rowling',
    coverImageUrl: 'assets/images/books/harry-potter.jpg',
    summary: 'The journey of a young wizard discovering his magical destiny.',
    rating: 4.7,
    reviewsCount: 754,
    likesCount: 650,
    dislikesCount: 8
  },
  {
    _id: 'mock-4',
    title: 'Rich Dad Poor Dad',
    author: 'Robert Kiyosaki',
    coverImageUrl: 'assets/images/books/richdad.jpg',
    summary: 'What the rich teach their kids about money that the poor and middle class do not!',
    rating: 4.6,
    reviewsCount: 1530,
    likesCount: 1100,
    dislikesCount: 45
  }
];

export const booksAPI = {
  // GET /books
  getAllBooks: async () => {
    return request('/books', { method: 'GET' }, INITIAL_MOCK_BOOKS);
  },

  // GET /books/search?q=...&author=...
  searchBooks: async (query, author = '') => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (author) params.append('author', author);
    return request(`/books/search?${params.toString()}`, { method: 'GET' }, 
      INITIAL_MOCK_BOOKS.filter(b => 
        (query ? b.title.toLowerCase().includes(query.toLowerCase()) || b.author.toLowerCase().includes(query.toLowerCase()) : true) &&
        (author ? b.author.toLowerCase().includes(author.toLowerCase()) : true)
      )
    );
  },

  // GET /books/recommend
  getRecommendations: async () => {
    return request('/books/recommend', { method: 'GET' }, INITIAL_MOCK_BOOKS.slice(0, 2));
  },

  // POST /books (Admin Only)
  addBookAdmin: async (bookData) => {
    return request('/books', {
      method: 'POST',
      body: JSON.stringify(bookData),
    });
  },

  // GET /books/:id/reviews
  getReviews: async (bookId) => {
    return request(`/books/${bookId}/reviews`, { method: 'GET' }, [
      {
        _id: 'rev-1',
        rating: 5,
        comment: 'Life changing book! Everyone should read it.',
        userId: { _id: 'u1', name: 'Amara K.', profilePic: '' },
        createdAt: new Date().toISOString()
      },
      {
        _id: 'rev-2',
        rating: 4,
        comment: 'Practical tips that are easy to implement daily.',
        userId: { _id: 'u2', name: 'Daniel R.', profilePic: '' },
        createdAt: new Date().toISOString()
      }
    ]);
  },

  // POST /books/:id/reviews
  addReview: async (bookId, rating, comment) => {
    return request(`/books/${bookId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
  },

  // DELETE /books/:id/reviews/:reviewId (Admin Only)
  deleteReview: async (bookId, reviewId) => {
    return request(`/books/${bookId}/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  },

  // GET /books/:id/likes
  getLikes: async (bookId) => {
    return request(`/books/${bookId}/likes`, { method: 'GET' }, { likes: 42, dislikes: 2 });
  },

  // POST /books/:id/like
  likeBook: async (bookId) => {
    return request(`/books/${bookId}/like`, { method: 'POST' });
  },

  // POST /books/:id/dislike
  dislikeBook: async (bookId) => {
    return request(`/books/${bookId}/dislike`, { method: 'POST' });
  },
};

/* ============================================================
   4. CONTRIBUTIONS ENDPOINTS (/contribute)
   ============================================================ */

export const contributeAPI = {
  // POST /contribute/upload (multipart/form-data)
  uploadContribution: async (file, title = '', author = '') => {
    const formData = new FormData();
    formData.append('image', file);
    if (title) formData.append('title', title);
    if (author) formData.append('author', author);

    const token = getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${BASE_URL}/contribute/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      
      if (res.status === 409) {
        // Duplicate book conflict
        return { isDuplicate: true, existingBookId: data.existingBookId, msg: data.msg };
      }
      if (!res.ok) {
        throw new Error(data.msg || 'Image rejected by AI validation');
      }

      return data;
    } catch (err) {
      if (err.message.includes('Failed to fetch')) {
        // Fallback for demonstration when backend server is off
        return {
          msg: 'Contribution approved (Demo Mode)',
          book: {
            _id: `contrib-${Date.now()}`,
            title: title || 'Uploaded Book',
            author: author || 'Community Author',
            coverImageUrl: URL.createObjectURL(file),
            summary: 'Added via community contribution.'
          }
        };
      }
      throw err;
    }
  },
};
