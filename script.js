const input = document.getElementById('username-input');
const form = document.getElementById('username-form');
const suggestionsDiv = document.getElementById('suggestions');
const avatarDisplay = document.getElementById('avatar-display');
let typingStoppedTimer;

input.addEventListener('input', () => {
  clearTimeout(typingStoppedTimer);
  const partialUsername = input.value.trim();

  if (partialUsername.length < 4) {
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.classList.remove('show');
    return;
  }

  // Show suggestions only after 500ms of inactivity
  typingStoppedTimer = setTimeout(() => {
    fetchSuggestions(partialUsername);
  }, 500);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = input.value.trim();
  if (username) {
    // Hide suggestions when "Show Avatar" button is clicked
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.classList.remove('show');
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
    div.className = 'suggestion show';
    const img = document.createElement('img');
    img.src = thumbnailMap[user.userId] || 'https://via.placeholder.com/48';
    img.alt = user.username;
    const username = document.createElement('div');
    username.className = 'username';
    username.textContent = user.username;
    div.appendChild(img);
    div.appendChild(username);
    div.onclick = () => {
      suggestionsDiv.innerHTML = '';
      suggestionsDiv.classList.remove('show');
      showAvatar(user.username);
    };
    suggestionsDiv.appendChild(div);
  });
}

async function showAvatar(username) {
  // Clear previous content and prepare for loading
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

    // Create the image element with the same fade-in animation
    const img = document.createElement('img');
    img.src = thumbnailUrl;
    img.alt = `${username}'s avatar`;
    img.style.opacity = '0'; // Start with opacity 0 for animation
    avatarDisplay.innerHTML = ''; // Clear the loading message
    avatarDisplay.appendChild(img);

    // Trigger the fade-in animation
    setTimeout(() => {
      img.style.opacity = '1';
      img.style.transition = 'opacity 0.5s ease-in-out'; // Match the CSS @keyframes fadeIn
    }, 0);
  } catch (error) {
    console.error('Error showing avatar:', error);
    avatarDisplay.innerHTML = '<p class="error">Error loading avatar 😔</p>';
  }
}

function renderSuggestions(suggestions) {
  const suggestionsDiv = document.getElementById('suggestions');
  suggestionsDiv.innerHTML = '';
  if (!suggestions || suggestions.length === 0) {
    suggestionsDiv.style.display = 'none';
    return;
  }
  suggestionsDiv.style.display = 'flex';
  suggestions.forEach((suggestion, i) => {
    const div = document.createElement('div');
    div.className = 'suggestion show';
    div.style.setProperty('--fade-delay', `${i * 0.08}s`);
    const img = document.createElement('img');
    img.src = suggestion.thumbnail || suggestion.image || 'https://www.roblox.com/headshot-thumbnail/image?userId=' + suggestion.userId + '&width=150&height=150&format=png';
    img.alt = suggestion.username;
    const username = document.createElement('div');
    username.className = 'username';
    username.textContent = suggestion.username;
    div.appendChild(img);
    div.appendChild(username);
    div.onclick = () => selectSuggestion(suggestion);
    suggestionsDiv.appendChild(div);
  });
}