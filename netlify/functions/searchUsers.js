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
    const response = await fetch(`https://www.roblox.com/search/users/results?keyword=${encodeURIComponent(keyword)}&maxRows=10&startIndex=0`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' // Mimic a browser
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text(); // Get raw response to debug
    let data;
    try {
      data = JSON.parse(text); // Attempt to parse as JSON
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', text);
      throw new Error('Invalid response format from Roblox API');
    }

    const users = data.UserSearchResults ? data.UserSearchResults.map(user => ({
      username: user.Name,
      userId: user.UserId
    })) : [];

    return {
      statusCode: 200,
      body: JSON.stringify(users)
    };
  } catch (error) {
    console.error('Search error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error searching users' })
    };
  }
};