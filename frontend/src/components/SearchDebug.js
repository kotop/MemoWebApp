// Создаем файл utils/searchDebug.js

/**
 * Утилита для отладки поиска в консоли браузера
 * Используйте: window.testSearch('ваш запрос') или window.testSearch('#тег')
 */
export function initSearchDebugger() {
  window.testSearch = async function(query) {
    try {
      console.group(`Testing search for: "${query}"`);
      
      // Определяем, начинается ли запрос с #
      let url;
      if (query.startsWith('#')) {
        url = `/api/notes/search?tag=${encodeURIComponent(query.substring(1))}`;
        console.log('Request URL (tag search):', url);
      } else {
        url = `/api/notes/search?query=${encodeURIComponent(query)}`;
        console.log('Request URL (text search):', url);
      }
      
      // Показываем полный URL запроса с учетом прокси
      const fullUrl = new URL(url, window.location.origin);
      console.log('Full URL:', fullUrl.toString());
      
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      console.log('Headers:', headers);
      
      const response = await fetch(url, { headers });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries([...response.headers]));
      
      if (response.ok) {
        const data = await response.json();
        console.log('Results:', data);
        console.log('Number of results:', data.length);
        
        if (data.length > 0) {
          console.log('First result:', data[0]);
          console.log('Match type:', data[0].match);
          console.log('Tags:', data[0].tags);
        }
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        try {
          // Проверяем, является ли ответ JSON
          const errorJson = JSON.parse(errorText);
          console.error('Error details:', errorJson);
        } catch (e) {
          // Если не JSON, выводим как текст
          console.error('Error text:', errorText);
        }
      }
    } catch (error) {
      console.error('Request failed:', error);
    } finally {
      console.groupEnd();
    }
  };
  
  // Добавляем функцию для проверки статуса API
  window.checkApiStatus = async function() {
    try {
      console.group('API Status Check');
      
      const endpoints = [
        '/api',
        '/api/notes',
        '/api/notes/search?query=test'
      ];
      
      for (const endpoint of endpoints) {
        console.log(`Checking endpoint: ${endpoint}`);
        try {
          const response = await fetch(endpoint);
          console.log(`  Status: ${response.status}`);
          console.log(`  OK: ${response.ok}`);
          
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              console.log(`  Data:`, data);
            } else {
              const text = await response.text();
              console.log(`  Text: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
            }
          } else {
            const text = await response.text();
            console.log(`  Error: ${text}`);
          }
        } catch (endpointError) {
          console.error(`  Error checking ${endpoint}:`, endpointError);
        }
      }
    } catch (error) {
      console.error('API status check failed:', error);
    } finally {
      console.groupEnd();
    }
  };
  
  console.log('Search debugger initialized. Use:');
  console.log('- window.testSearch("query") to test search');
  console.log('- window.testSearch("#tag") to test tag search');
  console.log('- window.checkApiStatus() to check API endpoints');
}