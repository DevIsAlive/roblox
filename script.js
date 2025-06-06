const input = document.getElementById('username-input');
const form = document.getElementById('username-form');
const suggestionsDiv = document.getElementById('suggestions');
const avatarDisplay = document.getElementById('avatar-display');
let debounceTimer;

input.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const partialUsername = input.value.trim();
  
  if (partialUsername.length >= 4) {
    debounceTimer = setTimeout(() => {
      fetchSuggestions(partialUsername);
    }, 300);
  } else {
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.classList.remove('show');
  }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = input.value.trim();
  if (username) {
    showAvatar(username);
  }
});

async function fetchSuggestions(keyword) {
  suggestionsDiv.innerHTML = '<p class="loading">Loading suggestions...</p>';
  suggestionsDiv.classList.add('show');
  try {
    const response = await fetch(`/.netlify/functions/searchUsers?keyword=${encodeURIComponent(keyword)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
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
      suggestionsDiv.innerHTML = '<p>No suggestions found 😞</p>';
      setTimeout(() => suggestionsDiv.classList.remove('show'), 1000);
    }
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    suggestionsDiv.innerHTML = '<p class="error">Error loading suggestions 😔</p>';
    setTimeout(() => suggestionsDiv.classList.remove('show'), 2000);
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
      suggestionsDiv.classList.remove('show');
      showAvatar(user.username);
    });
    suggestionsDiv.appendChild(div);
  });
}

async function showAvatar(username) {
  avatarDisplay.innerHTML = '';
  const tempDiv = document.createElement('div');
  tempDiv.style.opacity = '0';
  tempDiv.innerHTML = '<p>Loading your avatar...</p>';
  avatarDisplay.appendChild(tempDiv);

  try {
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