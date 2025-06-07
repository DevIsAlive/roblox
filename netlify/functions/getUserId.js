const fetch = require('node-fetch');

exports.handler = async (event) => {
  const username = event.queryStringParameters.username;
  try {
    const response = await fetch(`https://www.roblox.com/users/profile?username=${encodeURIComponent(username)}`, {
      method: 'HEAD',
      redirect: 'follow'
    });
    const url = response.url;
    if (url.includes('/users/') && url.includes('/profile')) {
      const userId = url.split('/')[4];
      return {
        statusCode: 200,
        body: JSON.stringify({ userId })
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error fetching user ID' })
    };
  }
};