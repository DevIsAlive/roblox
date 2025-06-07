const fetch = require('node-fetch');

// In-memory cache: { keyword: { users: [], timestamp: Date.now() } }
const cache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Utility to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

exports.handler = async (event) => {
  const keyword = event.queryStringParameters.keyword;
  if (!keyword) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Keyword parameter is required' })
    };
  }

  try {
    const now = Date.now();
    const cachedResult = cache[keyword];

    // Check if we have a valid cached result
    if (cachedResult && (now - cachedResult.timestamp) < CACHE_DURATION) {
      return {
        statusCode: 200,
        body: JSON.stringify(cachedResult.users)
      };
    }

    let users = [];
    const minSuggestions = 5;
    const maxRetries = 3;
    let retryCount = 0;

    // Helper function to fetch with retries on 429
    const fetchWithRetry = async (url, options) => {
      while (retryCount < maxRetries) {
        const response = await fetch(url, options);
        if (response.status === 429) {
          retryCount++;
          const backoff = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`Rate limit hit (429), retrying after ${backoff}ms...`);
          await delay(backoff);
          continue;
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      }
      throw new Error('Max retries reached for 429 error');
    };

    // Step 1: Search for similar usernames
    const searchOptions = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };

    const searchData = await fetchWithRetry(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(keyword)}&limit=${minSuggestions}`, searchOptions);
    users = searchData.data.map(user => ({
      username: user.name,
      userId: user.id
    }));

    // Step 2: If fewer than 5 results, add popular users as fallback
    if (users.length < minSuggestions) {
      const popularOptions = {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      };

      const popularData = await fetchWithRetry('https://users.roblox.com/v1/users/search?keyword=roblox&limit=10', popularOptions);
      const popularUsers = popularData.data.map(user => ({
        username: user.name,
        userId: user.id
      }));

      popularUsers.forEach(user => {
        if (!users.some(u => u.userId === user.userId) && users.length < minSuggestions) {
          users.push(user);
        }
      });
    }

    // Ensure exactly 5 suggestions
    users = users.slice(0, minSuggestions);

    // Cache the result
    cache[keyword] = { users, timestamp: now };

    return {
      statusCode: 200,
      body: JSON.stringify(users)
    };
  } catch (error) {
    console.error('Search error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error searching users: ' + error.message })
    };
  }
};