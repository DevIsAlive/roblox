const fetch = require('node-fetch');

exports.handler = async (event) => {
  const userIds = event.queryStringParameters.userIds;
  const size = event.queryStringParameters.size || '48x48';
  try {
    const response = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds}&size=${size}&format=png`);
    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error fetching thumbnails' })
    };
  }
};