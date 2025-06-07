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

// Add this at the top of the file with other global variables
let allHeadshotImages = [
  'headshots/duke.png',
  'headshots/juju.png',
  'headshots/Arumi.png',
  'headshots/retep.png',
  'headshots/yunah.png',
  'headshots/KAISER.png',
  'headshots/SHAZAM.png',
  'headshots/Xprofi.png',
  'headshots/exobrox.png'
  // Add more headshots as needed
];

function getRandomHeadshot() {
  return allHeadshotImages[Math.floor(Math.random() * allHeadshotImages.length)];
}

input.addEventListener('focus', () => {
  handPoint.classList.add('hidden');
});

input.addEventListener('input', () => {
  clearTimeout(typingStoppedTimer);
  const partialUsername = input.value.trim();

  if (partialUsername.length < 4) {
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.classList.remove('show');
    suggestionsDiv.classList.remove('slot-machine-active');
    suggestionsDiv.style.display = 'none';
    console.log('Input less than 4 chars: suggestionsDiv hidden.');
    return;
  }

  // Start spinning animation immediately
  if (!suggestionsDiv.querySelector('.carousel-container')) {
    const grayItems = Array(40).fill(null).map(() => {
      const img = document.createElement('img');
      img.src = getRandomHeadshot();
      img.alt = 'blurry headshot';
      img.className = 'blurry-headshot';
      return `<div class="item gray">${img.outerHTML}</div>`;
    }).join('');

    suggestionsDiv.innerHTML = `
      <div class="carousel-container">
        <div class="carousel-window">
          <div class="carousel-track">
            ${grayItems}
          </div>
          <div class="center-highlight"></div>
          <div class="fade-left"></div>
          <div class="fade-right"></div>
        </div>
      </div>
    `;
  }
  
  // Ensure the slot machine stays visible
  suggestionsDiv.classList.add('show');
  suggestionsDiv.classList.add('slot-machine-active');
  suggestionsDiv.style.display = 'flex';

  // Move the form down when fourth character is entered
  if (!hasMovedDown) {
    form.classList.add('suggestions-active');
    hasMovedDown = true;
    console.log('Form moved down due to suggestions-active class.');
  }

  // Start continuous spinning animation
  const carouselTrack = suggestionsDiv.querySelector('.carousel-track');
  if (carouselTrack) {
    carouselTrack.classList.add('spinning-continuous');
  }

  // Clear any existing timeout
  if (window.landingTimeout) {
    clearTimeout(window.landingTimeout);
  }

  // Set new timeout for landing
  typingStoppedTimer = setTimeout(() => {
    fetchSuggestions(partialUsername);
  }, 1000);
});

input.removeEventListener('blur', () => {
  setTimeout(() => {
    suggestionsDiv.classList.remove('show');
    suggestionsDiv.classList.remove('slot-machine-active');
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.style.display = 'none';
    console.log('Input blurred: suggestionsDiv hidden after timeout.');
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
  try {
    const response = await fetch(`/.netlify/functions/searchUsers?keyword=${encodeURIComponent(keyword)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const users = await response.json();
    if (users.length > 0) {
      const userIds = users.map(user => user.userId).join(',');
      const thumbnailResponse = await fetch(`/.netlify/functions/getThumbnails?userIds=${userIds}&size=150x150`);
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
      renderSlotMachine(suggestions);
    } else {
      // Instead of showing "no suggestions found", keep spinning
      const carouselTrack = suggestionsDiv.querySelector('.carousel-track');
      if (carouselTrack) {
        carouselTrack.classList.add('spinning-continuous');
      }
    }
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    // On error, keep spinning
    const carouselTrack = suggestionsDiv.querySelector('.carousel-track');
    if (carouselTrack) {
      carouselTrack.classList.add('spinning-continuous');
    }
  }
}

function renderSlotMachine(suggestions) {
  const carouselTrack = suggestionsDiv.querySelector('.carousel-track');
  if (!carouselTrack) return;

  // Clear existing items
  carouselTrack.innerHTML = '';

  // Add pre-roll items (blurry headshots)
  for (let i = 0; i < 20; i++) {
    const item = document.createElement('div');
    item.className = 'item gray';
    const img = document.createElement('img');
    img.src = getRandomHeadshot();
    img.alt = 'blurry headshot';
    img.className = 'blurry-headshot';
    item.appendChild(img);
    carouselTrack.appendChild(item);
  }

  // Add the target suggestion
  const targetSuggestion = suggestions[0];
  const targetItem = document.createElement('div');
  targetItem.className = 'item winner';
  const img = document.createElement('img');
  img.src = targetSuggestion.thumbnail;
  img.alt = targetSuggestion.username;
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.style.borderRadius = '10px';
  targetItem.appendChild(img);
  carouselTrack.appendChild(targetItem);

  // Add post-roll items (blurry headshots)
  for (let i = 0; i < 20; i++) {
    const item = document.createElement('div');
    item.className = 'item gray';
    const img = document.createElement('img');
    img.src = getRandomHeadshot();
    img.alt = 'blurry headshot';
    img.className = 'blurry-headshot';
    item.appendChild(img);
    carouselTrack.appendChild(item);
  }

  // Remove continuous spinning and start landing animation
  carouselTrack.classList.remove('spinning-continuous');
  void carouselTrack.offsetWidth; // Trigger reflow
  carouselTrack.classList.add('spinning-land');
  
  // After landing animation completes, show the winner
  window.landingTimeout = setTimeout(() => {
    carouselTrack.classList.add('winner-glow');
    // Add click handler to select the suggestion
    targetItem.addEventListener('click', () => selectSuggestion(targetSuggestion));
  }, 3000);
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