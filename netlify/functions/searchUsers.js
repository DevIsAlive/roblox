const fetch = require('node-fetch');

exports.handler = async (event) => {
  const keyword = event.queryStringParameters.keyword;
  try {
    const response = await fetch(`https://www.roblox.com/search/users/results?keyword=${encodeURIComponent(keyword)}&maxRows=10&startIndex=0`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    const users = data.UserSearchResults.map(user => ({ username: user.Name, userId: user.UserId }));
    return {
      statusCode: 200,
      body: JSON.stringify(users)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error searching users' })
    };
  }
};