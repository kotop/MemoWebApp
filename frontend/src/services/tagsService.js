// Tag-related utilities

// Extract tags from text content
export const extractTags = (content) => {
    if (!content) return [];
    
    const tagRegex = /#[a-zA-Zа-яА-ЯёЁ0-9]\w*(?:[-_][a-zA-Zа-яА-ЯёЁ0-9]\w*)*/g;
    const foundTags = content.match(tagRegex) || [];
    
    // Remove # prefix and make unique
    const uniqueTags = [...new Set(foundTags.map(tag => tag.substring(1)))];
    
    return uniqueTags;
  };
  
  /**
   * Генерирует случайный цвет для тега или папки
   * @returns {string} Hex-код цвета в формате #RRGGBB
   */
  export const generateTagColor = () => {
    // Генерируем светлый цвет (ближе к пастельным)
    const r = Math.floor(Math.random() * 128 + 127); // от 127 до 255
    const g = Math.floor(Math.random() * 128 + 127);
    const b = Math.floor(Math.random() * 128 + 127);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };
  
  /**
   * Проверяет, является ли цвет тёмным
   * @param {string} color - Hex-код цвета
   * @returns {boolean} true, если цвет тёмный
   */
  export const isDarkColor = (color) => {
    // Преобразуем цвет из hex в RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Вычисляем относительную яркость (по формуле YIQ)
    // Если яркость < 128, то цвет считается тёмным
    return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
  };
  
  /**
   * Возвращает подходящий цвет текста для заданного фона
   * @param {string} backgroundColor - Hex-код цвета фона
   * @returns {string} Цвет текста: #fff для тёмного фона, #000 для светлого
   */
  export const getTextColorForBackground = (backgroundColor) => {
    return isDarkColor(backgroundColor) ? '#ffffff' : '#000000';
  };
  
  // Convert color to hex format
  export const toHex = (color) => {
    // Check if already hex
    if (color.startsWith('#')) {
      return color;
    }
    
    // Handle rgb/rgba
    if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = parseInt(matches[0]);
        const g = parseInt(matches[1]);
        const b = parseInt(matches[2]);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }
    
    // Handle hsl/hsla - simplified conversion
    if (color.startsWith('hsl')) {
      // Create a temporary element to use browser's color conversion
      const temp = document.createElement('div');
      temp.style.color = color;
      document.body.appendChild(temp);
      const computed = getComputedStyle(temp).color;
      document.body.removeChild(temp);
      
      // Convert the computed rgb to hex
      return toHex(computed);
    }
    
    // Default fallback
    return '#cccccc';
  };
  
  // Get or create tag color
  export const getTagColor = (tagName, existingTags = []) => {
    // Check if tag already exists
    const existingTag = existingTags.find(tag => 
      tag.name.toLowerCase() === tagName.toLowerCase()
    );
    
    if (existingTag && existingTag.color) {
      return existingTag.color;
    }
    
    // Generate a new color
    return generateTagColor();
  };