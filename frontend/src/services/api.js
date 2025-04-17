import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: '/api',  // Using the proxy in development
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Error handler
const handleError = (error) => {
  console.error('API Error:', error);
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('Response data:', error.response.data);
    console.error('Response status:', error.response.status);
    return Promise.reject(error.response.data || 'Error processing request');
  } else if (error.request) {
    // The request was made but no response was received
    console.error('No response received:', error.request);
    return Promise.reject('No response from server. Please try again.');
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('Request error:', error.message);
    return Promise.reject('Error processing request. Please try again.');
  }
};

// Notes API
export const fetchNote = async (noteId) => {
  try {
    const response = await api.get(`/notes/${noteId}`);
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

export const createNote = async (note) => {
  try {
    const response = await api.post('/notes', note);
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

export const updateNote = async (noteId, note) => {
  try {
    const response = await api.put(`/notes/${noteId}`, note);
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

export const deleteNote = async (noteId) => {
  try {
    const response = await api.delete(`/notes/${noteId}`);
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

export const searchNotes = async (query) => {
  try {
    console.log(`Searching for: "${query}"`);
    
    // Проверяем, не начинается ли запрос с #
    let params = {};
    
    if (query.startsWith('#')) {
      // Отправляем запрос как тег (без символа #)
      params.tag = query.substring(1);
    } else {
      // Отправляем как обычный запрос
      params.query = query;
    }
    
    console.log('Search params:', params);
    const response = await api.get('/notes/search', { params });
    
    // Для отладки
    console.log(`Received ${response.data?.length || 0} results:`, response.data);
    
    return response.data;
  } catch (error) {
    console.error('Search error:', error);
    return handleError(error);
  }
};

// Folders API
export const fetchFolders = async () => {
  try {
    const response = await api.get('/folders');
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

export const createFolder = async (folder) => {
  try {
    const response = await api.post('/folders', folder);
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

export const createFolderInParent = async (folderName, parentId = null, color = null) => {
  try {
    const folderData = {
      name: folderName,
      parent_id: parentId,
      color: color || null, // Используем предоставленный цвет или null
    };
    const response = await api.post('/folders', folderData);
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

export const updateFolder = async (folderId, folderData) => {
  try {
    const response = await api.put(`/folders/${folderId}`, folderData);
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

export const deleteFolder = async (folderId) => {
  try {
    const response = await api.delete(`/folders/${folderId}`);
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

// Перемещение папки
export const moveFolder = async (folderId, targetFolderId) => {
  try {
    // Сначала получим данные папки
    const response = await api.get(`/folders/${folderId}`);
    const folderData = response.data;
    
    // Обновляем parent_id 
    // Важно: targetFolderId может быть null (корневой каталог)
    folderData.parent_id = targetFolderId;
    
    // Отправляем обновленные данные на сервер
    const updateResponse = await api.put(`/folders/${folderId}`, folderData);
    return updateResponse.data;
  } catch (error) {
    return handleError(error);
  }
};

// Graph API
export const fetchGraphData = async (folderId = null, tag = null) => {
  try {
    let url = '/graph';
    const params = {};
    
    if (folderId) {
      params.folder_id = folderId;
    }
    
    if (tag) {
      params.tag = tag;
    }
    
    const response = await api.get(url, { params });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

// Tree API
export const fetchTreeData = async () => {
  try {
    const response = await api.get('/tree');
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};