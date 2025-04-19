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
    
    // Настраиваем цвета и элементы интерфейса
    window.tg.expand();
    window.tg.ready();
    return true;
  }
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

// Получение начальных данных (если переданы через бота)
export const getInitData = () => {
  if (!telegram) return null;
  
  return telegram.initData;
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