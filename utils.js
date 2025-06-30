// Utilidades para validación
class ValidationUtils {
  static isValidNumber(value) {
    return !isNaN(value) && value !== null && value !== undefined;
  }

  static isInRange(value, min, max) {
    return this.isValidNumber(value) && value >= min && value <= max;
  }

  static hasDuplicates(array) {
    return new Set(array).size !== array.length;
  }

  static isEmpty(value) {
    return value === null || value === undefined || value === '';
  }

  static isNotEmpty(value) {
    return !this.isEmpty(value);
  }
}

// Utilidades para DOM
class DOMUtils {
  static getElement(id) {
    return document.getElementById(id);
  }

  static getElements(selector) {
    return document.querySelectorAll(selector);
  }

  static createElement(tag, className = '', innerHTML = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
  }

  static addClass(element, className) {
    if (element && element.classList) {
      element.classList.add(className);
    }
  }

  static removeClass(element, className) {
    if (element && element.classList) {
      element.classList.remove(className);
    }
  }

  static toggleClass(element, className) {
    if (element && element.classList) {
      element.classList.toggle(className);
    }
  }

  static setStyle(element, property, value) {
    if (element && element.style) {
      element.style[property] = value;
    }
  }

  static showElement(element) {
    if (element) {
      element.style.display = 'block';
    }
  }

  static hideElement(element) {
    if (element) {
      element.style.display = 'none';
    }
  }
}

// Utilidades para fechas
class DateUtils {
  static formatDate(date, locale = 'es-ES') {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(date).toLocaleDateString(locale, options);
  }

  static getCurrentDate() {
    return new Date().toISOString();
  }

  static isToday(date) {
    const today = new Date();
    const checkDate = new Date(date);
    return today.toDateString() === checkDate.toDateString();
  }
}

// Utilidades para arrays
class ArrayUtils {
  static chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  static groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  static sortBy(array, key, order = 'asc') {
    return [...array].sort((a, b) => {
      if (order === 'asc') {
        return a[key] > b[key] ? 1 : -1;
      } else {
        return a[key] < b[key] ? 1 : -1;
      }
    });
  }

  static unique(array) {
    return [...new Set(array)];
  }
}

// Utilidades para strings
class StringUtils {
  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static truncate(str, length = 50) {
    return str.length > length ? str.substring(0, length) + '...' : str;
  }

  static slugify(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  static formatNumber(num) {
    return new Intl.NumberFormat('es-ES').format(num);
  }
}

// Utilidades para eventos
class EventUtils {
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Utilidades para localStorage
class StorageUtils {
  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }

  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }

  static clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
}

// Exportar utilidades
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ValidationUtils,
    DOMUtils,
    DateUtils,
    ArrayUtils,
    StringUtils,
    EventUtils,
    StorageUtils
  };
} 