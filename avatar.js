// avatar.js - User avatar component with fallback to initials
(function() {
  // Function to create and insert avatar element
  function createAvatar(container, username, imageSrc, size = "md") {
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create avatar element
    const avatar = document.createElement('div');
    
    // Add size classes
    const sizeClasses = {
      sm: "w-6 h-6 text-xs",
      md: "w-8 h-8 text-sm",
      lg: "w-10 h-10 text-base",
      xl: "w-12 h-12 text-lg"
    };
    
    const avatarSize = sizeClasses[size] || sizeClasses.md;
    avatar.className = `relative rounded-full overflow-hidden flex items-center justify-center ${avatarSize}`;
    
    // Try to load image if provided
    if (imageSrc) {
      const img = document.createElement('img');
      img.src = imageSrc;
      img.alt = username || 'User';
      img.className = 'w-full h-full object-cover';
      
      // Handle image loading error
      img.onerror = () => {
        img.remove();
        createInitialsAvatar(avatar, username);
      };
      
      avatar.appendChild(img);
    } else {
      createInitialsAvatar(avatar, username);
    }
    
    // Add avatar to container
    container.appendChild(avatar);
    return avatar;
  }
  
  // Create initials-based avatar
  function createInitialsAvatar(container, username) {
    // Generate background color based on username
    const bgColor = generateColor(username || 'User');
    
    // Create initials element
    const initialsEl = document.createElement('div');
    initialsEl.className = `flex items-center justify-center w-full h-full ${bgColor} text-white font-medium`;
    initialsEl.textContent = getInitials(username || 'User');
    
    container.appendChild(initialsEl);
  }
  
  // Generate initials from username
  function getInitials(name) {
    if (!name) return "U";
    const parts = name.split(' ');
    if (parts.length === 1) return name.charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  
  // Generate a consistent color based on username
  function generateColor(name) {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 
      'bg-yellow-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-teal-500'
    ];
    
    // Simple hash function to get a consistent index
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
  
  // Add to window object
  window.avatarSystem = {
    createAvatar: createAvatar
  };
  
  // Initialize existing avatars when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    // Look for user-avatar element
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl && avatarEl.parentElement) {
      const container = avatarEl.parentElement;
      const username = document.getElementById('user-name')?.textContent || 'User';
      
      // Replace img with our avatar component
      avatarEl.style.display = 'none';
      createAvatar(container, username, avatarEl.src, 'sm');
    }
  });
})();