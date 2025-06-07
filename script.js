const input = document.getElementById('username-input');
const form = document.getElementById('username-form');
const suggestionsDiv = document.getElementById('suggestions');
const avatarDisplay = document.getElementById('avatar-display');
const handPoint = document.querySelector('.hand-point');
let typingStoppedTimer;
let hasMovedDown = false;

// Notification logic
const notificationsContainer = document.querySelector('.notifications-container');
const MAX_NOTIFICATIONS = 4;
let usernames = [];
let usernameIndex = 0; // New: To keep track of the current username for sequential display

input.addEventListener('focus', () => {
  handPoint.classList.add('hidden');
});

input.addEventListener('input', () => {
  clearTimeout(typingStoppedTimer);
  const partialUsername = input.value.trim();

  if (partialUsername.length < 2) {
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.classList.remove('show');
    return;
  }

  // Move the form down when second character is entered
  if (!hasMovedDown) {
    form.classList.add('suggestions-active');
    hasMovedDown = true;
  }

  typingStoppedTimer = setTimeout(() => {
    fetchSuggestions(partialUsername);
  }, 500);
});

input.addEventListener('blur', () => {
  // Don't remove suggestions-active class on blur
  setTimeout(() => {
    suggestionsDiv.classList.remove('show');
  }, 200);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = input.value.trim();
  if (username) {
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
      const suggestions = users.map(user => ({
        username: user.username || user.name,
        userId: user.userId || user.id,
        thumbnail: thumbnailMap[user.userId || user.id]
      }));
      renderSuggestions(suggestions);
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

function renderSuggestions(suggestions) {
  const suggestionsDiv = document.getElementById('suggestions');
  suggestionsDiv.innerHTML = '';
  if (!suggestions || suggestions.length === 0) {
    suggestionsDiv.style.display = 'none';
    form.classList.remove('suggestions-active');
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
    div.appendChild(img);
    div.onclick = () => selectSuggestion(suggestion);
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

async function loadUsernames() {
  try {
    const response = await fetch('headshots/names.txt');
    const text = await response.text();
    usernames = text.split('\n').map(name => name.trim()).filter(name => name.length > 0);
    // Shuffle the usernames if you want a different random order each session after sequential
    // usernames.sort(() => Math.random() - 0.5);
  } catch (error) {
    console.error('Error loading usernames:', error);
  }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createNotificationElement(username, value) {
  const notification = document.createElement('div');
  notification.className = 'notification-pill';

  const img = document.createElement('img');
  // Assuming image filenames match usernames exactly, including case, and are .png
  img.src = `headshots/${username}.png`; 
  img.alt = username;
  notification.appendChild(img);

  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'username';
  usernameSpan.textContent = username;
  notification.appendChild(usernameSpan);

  const valueSpan = document.createElement('span');
  valueSpan.className = 'value';
  valueSpan.textContent = `$${value}`;
  notification.appendChild(valueSpan);

  return notification;
}

function addNotification() {
  if (usernames.length === 0) {
    console.warn('Usernames not loaded yet.');
    return;
  }

  let selectedUsername;
  if (usernameIndex < usernames.length) {
    selectedUsername = usernames[usernameIndex];
    usernameIndex++;
  } else {
    // Once all names are shown, switch to random order
    selectedUsername = usernames[getRandomInt(0, usernames.length - 1)];
  }

  // Generate a random value between 5 and 50, then multiply by 100 to ensure it ends in '00'
  const randomValue = getRandomInt(5, 50) * 100;
  const newNotification = createNotificationElement(selectedUsername, randomValue);

  // Manage the number of notifications
  const currentNotifications = notificationsContainer.children;
  if (currentNotifications.length >= MAX_NOTIFICATIONS) {
    const oldestNotification = currentNotifications[0];
    oldestNotification.classList.add('fade-out');
    // Add a listener to remove the element after the animation completes
    oldestNotification.addEventListener('animationend', () => {
      oldestNotification.remove();
      // After removal, reposition existing notifications smoothly
      updateNotificationPositions();
    }, { once: true });
  }

  notificationsContainer.appendChild(newNotification);
  // Ensure new notification is positioned correctly from the start
  updateNotificationPositions();
}

function updateNotificationPositions() {
  const currentNotifications = notificationsContainer.children;
  for (let i = 0; i < currentNotifications.length; i++) {
    const notification = currentNotifications[i];
    // Calculate desired translateY based on index and pill height/gap
    // Assuming a pill height (including padding) of approx 50px + 10px gap = 60px
    const translateY = i * (50 + 10); // Adjust 50 based on actual pill height
    notification.style.transform = `translateY(${translateY}px)`;
    notification.style.transition = 'transform 0.3s ease-out';
  }
}

// Initialize and start notifications
loadUsernames().then(() => {
  // Add initial notifications (e.g., 2-3 to start)
  for (let i = 0; i < 2; i++) {
    addNotification();
  }
  // Start adding new notifications every few seconds
  setInterval(addNotification, 3000); // Add a new notification every 3 seconds
});