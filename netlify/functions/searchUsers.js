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

  // Validate keyword: 3-20 characters, alphanumeric only
  const sanitizedKeyword = keyword.trim();
  if (sanitizedKeyword.length < 3 || sanitizedKeyword.length > 20 || !/^[a-zA-Z0-9]+$/.test(sanitizedKeyword)) {
    console.log(`Invalid keyword: "${keyword}" - must be 3-20 alphanumeric characters`);
    return await fetchPopularUsers();
  }

  try {
    const now = Date.now();
    const cachedResult = cache[sanitizedKeyword];

    // Check if we have a valid cached result
    if (cachedResult && (now - cachedResult.timestamp) < CACHE_DURATION) {
      return {
        statusCode: 200,
        body: JSON.stringify(cachedResult.users)
      };
    }

    let users = [];
    const minSuggestions = 3;
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
          console.log(`API error for ${url}: status ${response.status}, body ${await response.text()}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      }
      throw new Error('Max retries reached for 429 error');
    };

    // Step 1: Generate username variations and search using /v1/usernames/users
    let usernameVariations = [
      sanitizedKeyword,
      `${sanitizedKeyword}1`,
      `${sanitizedKeyword}2`
    ];

    const searchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: JSON.stringify({
        usernames: usernameVariations,
        excludeBannedUsers: true
      })
    };

    const searchData = await fetchWithRetry('https://users.roblox.com/v1/usernames/users', searchOptions);
    users = searchData.data.map(user => ({
      username: user.name,
      userId: user.id
    }));

    // No fallback to popular users. Only return up to 3 suggestions.
    users = users.slice(0, minSuggestions);

    // Cache the result
    cache[sanitizedKeyword] = { users, timestamp: now };

    return {
      statusCode: 200,
      body: JSON.stringify(users)
    };
  } catch (error) {
    console.error('Search error:', error.message);
    return await fetchPopularUsers();
  }
};

// Fetch popular users as a fallback
async function fetchPopularUsers() {
  try {
    const popularOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: JSON.stringify({
        usernames: ['Roblox', 'Builderman', 'Admin', 'Brighteyes', 'Sharkblox'],
        excludeBannedUsers: true
      })
    };

    const popularData = await fetch('https://users.roblox.com/v1/usernames/users', popularOptions);
    if (!popularData.ok) {
      console.log(`Fallback API error: status ${popularData.status}, body ${await popularData.text()}`);
      throw new Error(`Fallback HTTP error! status: ${popularData.status}`);
    }
    const popularResponse = await popularData.json();
    const users = popularResponse.data.map(user => ({
      username: user.name,
      userId: user.id
    }));
    return users;
  } catch (error) {
    console.error('Fallback error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error loading suggestions: Unable to fetch data' })
    };
  }
}