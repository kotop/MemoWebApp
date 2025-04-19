// src/services/telegramService.js

/**
 * Сервис для взаимодействия с Telegram Web App API
 */

// Создаем прокси к Telegram Web App API
const telegram = window.Telegram?.WebApp;

// Инициализация WebApp
export const initTelegramApp = () => {
  if (window.Telegram && window.Telegram.WebApp) {
    window.tg = window.Telegram.WebApp;
    
    // Добавляем токен аутентификации в localStorage
    localStorage.setItem('tg_init_data', window.tg.initData);
    
    // Устанавливаем тему для CSS
    document.body.classList.add('telegram-app');
    
    // Настраиваем цвета и элементы интерфейса
    window.tg.expand();
    window.tg.ready();
    
    console.log("Telegram WebApp initialized successfully");
    return true;
  }
  console.warn("Telegram WebApp not available, running in standalone mode");
  return false;
};

// Получение информации о пользователе
export const getUserInfo = () => {
  if (!telegram) return null;
  
  return telegram.initDataUnsafe?.user || null;
};

// Получение ID пользователя Telegram
export const getUserId = () => {
  const user = getUserInfo();
  return user?.id || null;
};

// Получение имени пользователя Telegram
export const getUserName = () => {
  const user = getUserInfo();
  if (!user) return null;
  
  return user.username || `${user.first_name || ''} ${user.last_name || ''}`.trim();
};

// Показать всплывающее уведомление в Telegram
export const showNotification = (message) => {
  if (!telegram) return;
  
  telegram.showPopup({
    title: 'Notes Manager',
    message,
    buttons: [{ type: 'close' }]
  });
};

// Показать индикатор загрузки
export const showLoader = (show = true) => {
  if (!telegram) return;
  
  if (show) {
    telegram.MainButton.showProgress();
  } else {
    telegram.MainButton.hideProgress();
  }
};

// Настройка главной кнопки
export const setupMainButton = (text, onClick) => {
  if (!telegram) return;
  
  telegram.MainButton.text = text;
  telegram.MainButton.onClick(onClick);
  telegram.MainButton.show();
};

// Скрытие главной кнопки
export const hideMainButton = () => {
  if (!telegram || !telegram.MainButton) return;
  
  telegram.MainButton.hide();
};

// Закрытие приложения
export const closeApp = () => {
  if (!telegram) return;
  
  telegram.close();
};

// Получение темы Telegram для стилизации приложения
export const getThemeParams = () => {
  if (!telegram) return null;
  
  return telegram.themeParams;
};

// Проверка, запущено ли приложение в Telegram
export const isRunningInTelegram = () => {
  return !!telegram;
};

// Получение начальных данных (initData) для авторизации на API
export const getInitData = () => {
  if (telegram) {
    return telegram.initData;
  }
  
  // Пытаемся получить из localStorage, если телеграм недоступен
  return localStorage.getItem('tg_init_data') || null;
};

// Обработка кнопки "назад" (если поддерживается)
export const handleBackButton = (callback) => {
  if (!telegram || !telegram.BackButton) return;
  
  telegram.BackButton.onClick(callback);
  telegram.BackButton.show();
};

// Скрыть кнопку "назад"
export const hideBackButton = () => {
  if (!telegram || !telegram.BackButton) return;
  
  telegram.BackButton.hide();
};

// Отправляет данные в Telegram бота (например, о созданной заметке)
export const sendDataToBot = async (action, data = {}) => {
  if (!telegram) return false;
  
  try {
    // Формируем данные для отправки
    const payload = {
      user_id: getUserId(),
      action: action,
      data: data
    };
    
    // Отправляем данные боту через WebView
    telegram.sendData(JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error("Error sending data to Telegram bot:", error);
    return false;
  }
};

// Функция для валидации данных initData
export const validateInitData = async () => {
  const initData = getInitData();
  if (!initData) return false;
  
  try {
    const response = await fetch('/api/telegram/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: initData })
    });
    
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error("Error validating Telegram data:", error);
    return false;
  }
};