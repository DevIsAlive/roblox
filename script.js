const input = document.getElementById('username-input');
const form = document.getElementById('username-form');
const suggestionsDiv = document.getElementById('suggestions');
const avatarDisplay = document.getElementById('avatar-display');
const handPoint = document.querySelector('.hand-point');
let typingStoppedTimer;
let hasMovedDown = false;

// Profile Counter Logic
const profileValueSpan = document.querySelector('.profile-value');
let currentProfileValue = 400000; // Initial value 400,000
let lastTopUpValue = 400000; // Track value at last top-up

function updateProfileValue(amount) {
  currentProfileValue = Math.max(0, currentProfileValue - amount); // Ensure value doesn't go below 0
  profileValueSpan.textContent = currentProfileValue.toLocaleString(); // Format with commas
  profileValueSpan.setAttribute('data-text', currentProfileValue.toLocaleString()); // Update data-text for shadow

  // Check for top-up condition: if current value drops below 250,000
  if (currentProfileValue < 250000) {
    topUpProfileValue();
    // No need to reset lastTopUpValue here, as the condition is based on absolute value
  }
}

function topUpProfileValue() {
  const topUpAmount = 200000;
  currentProfileValue += topUpAmount;
  profileValueSpan.textContent = currentProfileValue.toLocaleString();
  profileValueSpan.setAttribute('data-text', currentProfileValue.toLocaleString());

  // Trigger glowing animation
  profileValueSpan.classList.add('glowing');
  // Remove class after animation to allow it to re-trigger after 3 seconds
  setTimeout(() => {
    profileValueSpan.classList.remove('glowing');
  }, 3000); // 3 seconds

  // Removed the animationend listener as setTimeout is now used for controlled removal
}

// Notification logic
const notificationsContainer = document.querySelector('.notifications-container');
const MAX_NOTIFICATIONS = 4;
let usernames = [];
let usernameIndex = 0; // New: To keep track of the current username for sequential display
let consecutivePremiumCount = 0; // New: To track consecutive premium notifications

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

form.addEventListener('transitionend', (event) => {
  // Only trigger if the transform property finished transitioning
  if (event.propertyName === 'transform') {
    positionNotificationsContainer();
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
  usernameSpan.setAttribute('data-text', username);
  notification.appendChild(usernameSpan);

  const valueSpan = document.createElement('span');
  valueSpan.className = 'value';
  valueSpan.textContent = ''; // Explicitly clear any previous content

  const robloxIcon = document.createElement('img');
  robloxIcon.src = 'robloxiocn.png';
  robloxIcon.alt = 'Robux'; // Alt text for accessibility
  robloxIcon.classList.add('roblox-currency-icon'); // Add a class for styling
  valueSpan.appendChild(robloxIcon);
  
  const valueTextNode = document.createTextNode(value); // Create a text node for the value
  valueSpan.appendChild(valueTextNode); // Append the text node
  valueSpan.setAttribute('data-text', value);
  notification.appendChild(valueSpan);

  return notification;
}

function addNotification() {
  if (usernames.length === 0) {
    console.warn('Usernames not loaded yet.');
    return;
  }

  // Flash red on profile value
  profileValueSpan.classList.remove('flash-red'); // Ensure it can re-trigger
  void profileValueSpan.offsetWidth; // Trigger reflow to restart animation
  profileValueSpan.classList.add('flash-red');
  setTimeout(() => {
    profileValueSpan.classList.remove('flash-red');
  }, 1000); // Flash for 1 second

  let selectedUsername;
  if (usernameIndex < usernames.length) {
    selectedUsername = usernames[usernameIndex];
    usernameIndex++;
  } else {
    // Once all names are shown, switch to random order
    selectedUsername = usernames[getRandomInt(0, usernames.length - 1)];
  }

  let randomValue;
  let isPremium = false;

  // Check if we've reached the limit for consecutive premium notifications
  if (consecutivePremiumCount >= 2) {
    isPremium = false; // Force non-premium
  } else if (Math.random() < 0.4) { // 40% chance for a premium notification
    isPremium = true;
  }

  if (isPremium) {
    randomValue = getRandomInt(100, 500) * 100; // Higher range for premium: 10,000 to 50,000
    consecutivePremiumCount++;
  } else {
    randomValue = getRandomInt(5, 50) * 100;
    consecutivePremiumCount = 0; // Reset count if not premium
  }

  const newNotification = createNotificationElement(selectedUsername, randomValue);
  if (isPremium) {
    newNotification.classList.add('premium');
  }
  notificationsContainer.appendChild(newNotification);

  // DEDUCT FROM PROFILE VALUE
  updateProfileValue(randomValue);

  // Manage the number of notifications
  const currentNotifications = notificationsContainer.children;
  if (currentNotifications.length >= MAX_NOTIFICATIONS + 1) { // +1 because premium might be added first
    const oldestNotification = currentNotifications[0];
    oldestNotification.classList.add('fade-out');
    // Add a listener to remove the element after the animation completes
    oldestNotification.addEventListener('animationend', () => {
      oldestNotification.remove();
      // After removal, reposition existing notifications smoothly
      updateNotificationPositions();
    }, { once: true });
  }

  // Ensure new notification is positioned correctly from the start
  updateNotificationPositions();
  // Reposition container after a new notification is added
  positionNotificationsContainer();
}

function updateNotificationPositions() {
  const currentNotifications = notificationsContainer.children;
  for (let i = 0; i < currentNotifications.length; i++) {
    const notification = currentNotifications[i];
    // Calculate desired translateY based on index and pill height/gap
    // Pill height is approximately 30px (image) + 8px (top padding) + 8px (bottom padding) = 46px
    // Gap is 10px
    const translateY = i * (46 + 10); 
    notification.style.transform = `translateY(${translateY}px)`;
    notification.style.transition = 'transform 0.3s ease-out';
  }
}

function positionNotificationsContainer() {
  const formRect = form.getBoundingClientRect();
  const margin = 30; // Desired margin below the input box
  notificationsContainer.style.top = `${formRect.bottom + margin}px`;
}

// Initialize and start notifications
loadUsernames().then(() => {
  // Add initial notifications (e.g., 2-3 to start)
  for (let i = 0; i < 2; i++) {
    addNotification();
  }
  // Set initial position after first notifications are added
  positionNotificationsContainer();
  // Start adding new notifications every few seconds
  setInterval(addNotification, 1500); // Add a new notification every 1.5 seconds (was 3 seconds)
});