// Base64 encoded icon for guaranteed display
export const ICON_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Alternative: Create a simple SVG icon as fallback
export const ICON_SVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiByeD0iMTYiIGZpbGw9InVybCgjZ3JhZGllbnQwX2xpbmVhcl8xXzApIi8+CjxwYXRoIGQ9Ik0yNTYgMTIwQzE3Ny4zIDEyMCAxMTIgMTg1LjMgMTEyIDI2NEMxMTIgMzQyLjcgMTc3LjMgNDA4IDI1NiA0MDhDMzM0LjcgNDA4IDQwMCAzNDIuNyA0MDAgMjY0QzQwMCAxODUuMyAzMzQuNyAxMjAgMjU2IDEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yMDAgMjQwSDMxMlYyODlIMjAwVjI0MFoiIGZpbGw9IiMwMDc5NjUiLz4KPHBhdGggZD0iTTIwMCAzMDRIMzEyVjMzMkgyMDBWMzA0WiIgZmlsbD0iIzAwNzk2NSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudDBfbGluZWFyXzFfMCIgeDE9IjAiIHkxPSIwIiB4Mj0iNTEyIiB5Mj0iNTEyIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiMwMDc5NjUiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDBhMDgwIi8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+';

// Function to get the best icon source
export function getIconSource() {
  return ICON_SVG; // Use SVG as primary fallback
}

// Function to create icon element with multiple fallbacks
export function createIconElement() {
  const img = document.createElement('img');
  
  // Try the actual icon first
  img.src = '/manifest/icon-512x512.png';
  
  img.onerror = function() {
    console.log('🔄 Trying SVG fallback');
    img.src = ICON_SVG;
    
    img.onerror = function() {
      console.log('🔄 Using emoji fallback');
      // Final fallback - use styled emoji
      img.style.display = 'none';
      const parent = img.parentElement;
      if (parent) {
        const emoji = document.createElement('div');
        emoji.innerHTML = '📱';
        emoji.style.cssText = `
          width: 30px;
          height: 30px;
          background: linear-gradient(135deg, #007965 0%, #00a080 100%);
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: white;
          font-weight: bold;
          vertical-align: middle;
          box-shadow: 0 4px 12px rgba(0, 121, 101, 0.3);
          animation: iconPulse 2s infinite ease-in-out;
        `;
        parent.appendChild(emoji);
      }
    };
  };
  
  return img;
}
