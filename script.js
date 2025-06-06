const input = document.getElementById('username-input');
const form = document.getElementById('username-form');
const suggestionsDiv = document.getElementById('suggestions');
const avatarDisplay = document.getElementById('avatar-display');
let debounceTimer;

input.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const partialUsername = input.value.trim();
    if (partialUsername.length >= 3) {
      fetchSuggestions(partialUsername);
    } else {
      suggestionsDiv.innerHTML = '';
      suggestionsDiv.style.display = 'none';
    }
  }, 300);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = input.value.trim();
  if (username) {
    showAvatar(username);
  }
});

async function fetchSuggestions(keyword) {
  try {
    const response = await fetch(`/.netlify/functions/searchUsers?keyword=${encodeURIComponent(keyword)}`);
    const users = await response.json();
    if (users.length > 0) {
      const userIds = users.map(user => user.userId).join(',');
      const thumbnailResponse = await fetch(`/.netlify/functions/getThumbnails?userIds=${userIds}&size=48x48`);
      const thumbnails = await thumbnailResponse.json();
      const thumbnailMap = {};
      thumbnails.data.forEach(item => {
        thumbnailMap[item.targetId] = item.imageUrl;
      });
      displaySuggestions(users, thumbnailMap);
    } else {
      suggestionsDiv.innerHTML = '';
      suggestionsDiv.style.display = 'none';
    }
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    suggestionsDiv.innerHTML = '<p class="error">Error loading suggestions 😔</p>';
    suggestionsDiv.style.display = 'block';
  }
}

function displaySuggestions(users, thumbnailMap) {
  suggestionsDiv.innerHTML = '';
  users.forEach(user => {
    const div = document.createElement('div');
    div.className = 'suggestion';
    const img = document.createElement('img');
    img.src = thumbnailMap[user.userId] || 'https://via.placeholder.com/48';
    img.alt = user.username;
    const span = document.createElement('span');
    span.textContent = user.username;
    div.appendChild(img);
    div.appendChild(span);
    div.addEventListener('click', () => {
      input.value = user.username;
      suggestionsDiv.innerHTML = '';
      suggestionsDiv.style.display = 'none';
      showAvatar(user.username);
    });
    suggestionsDiv.appendChild(div);
  });
  suggestionsDiv.style.display = 'block';
}

async function showAvatar(username) {
  try {
    avatarDisplay.innerHTML = '<p class="loading">Loading your avatar...</p>';
    const response = await fetch(`/.netlify/functions/getUserId?username=${encodeURIComponent(username)}`);
    const data = await response.json();
    if (data.error) {
      avatarDisplay.innerHTML = '<p class="error">User not found 😞</p>';
      return;
    }
    const userId = data.userId;
    const thumbnailResponse = await fetch(`/.netlify/functions/getThumbnails?userIds=${userId}&size=150x150`);
    const thumbnailData = await thumbnailResponse.json();
    const thumbnailUrl = thumbnailData.data[0].imageUrl;
    avatarDisplay.innerHTML = `<img src="${thumbnailUrl}" alt="${username}'s avatar">`;
  } catch (error) {
    console.error('Error showing avatar:', error);
    avatarDisplay.innerHTML = '<p class="error">Error loading avatar 😔</p>';
  }
}