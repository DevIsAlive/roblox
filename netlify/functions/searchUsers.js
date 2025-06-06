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
    const response = await fetch('https://users.roblox.com/v1/usernames/users', {
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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    let users = data.data.map(user => ({
      username: user.name,
      userId: user.id
    }));

    if (users.length === 0) {
      const searchResponse = await fetch('https://users.roblox.com/v1/users/search?keyword=' + encodeURIComponent(keyword) + '&limit=10', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!searchResponse.ok) {
        throw new Error(`HTTP error! status: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      users = searchData.data.map(user => ({
        username: user.name,
        userId: user.id
      }));
    }

    // Limit to 3 suggestions
    users = users.slice(0, 3);

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