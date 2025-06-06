const fetch = require('node-fetch');

exports.handler = async (event) => {
  const keyword = event.queryStringParameters.keyword;
  if (!keyword) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Keyword parameter is required' })
    };
  }

  try {
    let users = [];
    const minSuggestions = 3;

    // Step 1: Try exact match
    const exactResponse = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: JSON.stringify({
        usernames: [keyword],
        excludeBannedUsers: true
      })
    });

    if (!exactResponse.ok) {
      throw new Error(`Exact match HTTP error! status: ${exactResponse.status}`);
    }

    const exactData = await exactResponse.json();
    users = exactData.data.map(user => ({
      username: user.name,
      userId: user.id
    }));

    // Step 2: If fewer than 3 results, try a prefix search
    if (users.length < minSuggestions) {
      const searchResponse = await fetch('https://users.roblox.com/v1/users/search?keyword=' + encodeURIComponent(keyword) + '&limit=10', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!searchResponse.ok) {
        throw new Error(`Search HTTP error! status: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const searchUsers = searchData.data.map(user => ({
        username: user.name,
        userId: user.id
      }));

      // Add unique users from search results
      searchUsers.forEach(user => {
        if (!users.some(u => u.userId === user.userId) && users.length < minSuggestions) {
          users.push(user);
        }
      });
    }

    // Step 3: If still fewer than 3, try a broader search by shortening the keyword
    if (users.length < minSuggestions && keyword.length > 4) {
      const shortKeyword = keyword.slice(0, -1); // e.g., "builderman" -> "builderma"
      const broaderResponse = await fetch('https://users.roblox.com/v1/users/search?keyword=' + encodeURIComponent(shortKeyword) + '&limit=10', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (broaderResponse.ok) {
        const broaderData = await broaderResponse.json();
        const broaderUsers = broaderData.data.map(user => ({
          username: user.name,
          userId: user.id
        }));

        broaderUsers.forEach(user => {
          if (!users.some(u => u.userId === user.userId) && users.length < minSuggestions) {
            users.push(user);
          }
        });
      }
    }

    // Step 4: If still fewer than 3, fetch popular users as a fallback
    if (users.length < minSuggestions) {
      const popularResponse = await fetch('https://users.roblox.com/v1/users/search?keyword=roblox&limit=10', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (popularResponse.ok) {
        const popularData = await popularResponse.json();
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
    }

    // Ensure exactly 3 suggestions by slicing (though the above steps should guarantee this)
    users = users.slice(0, minSuggestions);

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