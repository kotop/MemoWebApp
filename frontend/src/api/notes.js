import { API_URL } from './config';

// Получение всех заметок
export const getNotes = async () => {
  const response = await fetch(`${API_URL}/notes`);
  if (!response.ok) {
    throw new Error(`Failed to fetch notes: ${response.statusText}`);
  }
  return await response.json();
};

// Создание новой заметки
export const createNote = async (note) => {
  const response = await fetch(`${API_URL}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(note),
  });
  if (!response.ok) {
    throw new Error(`Failed to create note: ${response.statusText}`);
  }
  return await response.json();
};

// Обновление заметки
export const updateNote = async (noteId, note) => {
  const response = await fetch(`${API_URL}/notes/${noteId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(note),
  });
  if (!response.ok) {
    throw new Error(`Failed to update note: ${response.statusText}`);
  }
  return await response.json();
};

// Удаление заметки
export const deleteNote = async (noteId) => {
  const response = await fetch(`${API_URL}/notes/${noteId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete note: ${response.statusText}`);
  }
  
  return await response.json();
};