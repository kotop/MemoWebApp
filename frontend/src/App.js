import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, CssBaseline, Button } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { 
  fetchTreeData, fetchGraphData, createFolderInParent, updateFolder, 
  deleteFolder, deleteNote, fetchNote, updateNote, moveFolder 
} from './services/api';
import { 
  initTelegramApp, getThemeParams, isRunningInTelegram, 
  getUserId, showNotification, hideMainButton 
} from './services/telegramService';
import NotesExplorer from './components/NotesExplorer';
import NoteEditor from './components/NoteEditor';
import GraphView from './components/GraphView';
import AppHeader from './components/AppHeader';
import './App.css';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';

function App() {
  const [activeTab, setActiveTab] = useState('explorer'); // Начальная вкладка - explorer
  const [prevTab, setPrevTab] = useState('explorer'); // Для запоминания предыдущей вкладки
  const [activeNote, setActiveNote] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [treeData, setTreeData] = useState({ folders: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [folderParentId, setFolderParentId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState(null);
  const [telegramTheme, setTelegramTheme] = useState(null);
  const [inTelegram, setInTelegram] = useState(false);
  
  // Инициализация Telegram WebApp и загрузка данных
  useEffect(() => {
    // Попытка инициализации Telegram WebApp
    const telegramInitialized = initTelegramApp();
    setInTelegram(telegramInitialized);
    
    // Если приложение запущено в Telegram, получаем параметры темы
    if (telegramInitialized) {
      const themeParams = getThemeParams();
      setTelegramTheme(themeParams);
      
      // Скрываем главную кнопку при запуске приложения
      hideMainButton();
    }
    
    // Загружаем данные дерева
    fetchTreeData()
      .then(data => {
        setTreeData(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching tree data:", error);
        setLoading(false);
        if (inTelegram) {
          showNotification("Ошибка загрузки данных");
        }
      });
  }, []);
  
  // Загрузка данных графа при изменении активной папки
  useEffect(() => {
    if (loading) return;
    
    fetchGraphData(activeFolder)
      .then(data => setGraphData(data))
      .catch(error => {
        console.error("Error fetching graph data:", error);
        if (inTelegram) {
          showNotification("Ошибка загрузки графа");
        }
      });
  }, [activeFolder, loading, inTelegram]);
  
  // Создаем тему на основе параметров Telegram или используем стандартную
  const theme = React.useMemo(() => {
    if (telegramTheme) {
      // Используем цвета из Telegram
      return createTheme({
        palette: {
          primary: {
            main: telegramTheme.button_color || '#85d1ac',
          },
          background: {
            default: telegramTheme.bg_color || '#ffffff',
            paper: telegramTheme.secondary_bg_color || '#f5f5f5',
          },
          text: {
            primary: telegramTheme.text_color || '#000000',
            secondary: telegramTheme.hint_color || '#777777',
          },
        },
      });
    }
    
    // Стандартная тема приложения
    return createTheme({
      palette: {
        primary: {
          main: '#85d1ac',
        },
      },
    });
  }, [telegramTheme]);
  
  // Обработчик выбора заметки - сохраняем предыдущую вкладку перед переключением на редактор
  const handleNoteSelect = (noteId) => {
    setPrevTab(activeTab); // Сохраняем текущую вкладку (explorer или graph)
    setActiveNote(noteId);
    setActiveTab('editor');
  };
  
  // Обработчик выбора папки
  const handleFolderSelect = (folderId) => {
    setActiveFolder(folderId);
  };
  
  // Обработчик клика по узлу графа
  const handleGraphNodeClick = (nodeId) => {
    setPrevTab('graph'); // Запоминаем, что мы пришли из графа
    setActiveNote(nodeId);
    setActiveTab('editor');
  };
  
  // Обработчик создания новой заметки
  const handleCreateNote = (folderId = null) => {
    setPrevTab(activeTab); // Сохраняем текущую вкладку
    setActiveNote('new');
    setActiveTab('editor');
    if (folderId) {
      setActiveFolder(folderId);
    }
  };

  // Функция для обработки возврата из редактора
  const handleBackFromEditor = () => {
    setActiveTab(prevTab); // Возвращаемся к предыдущей вкладке (explorer или graph)
  };
  
  // Обработчик создания новой папки
  const handleCreateFolder = (parentFolderId = null) => {
    setFolderParentId(parentFolderId);
    setEditMode(false);
    setFolderToEdit(null);
    setShowFolderDialog(true);
  };

  // Функция для сохранения новой папки или обновления существующей
  const handleSaveFolder = async (folderData) => {
    try {
      if (editMode && folderData.id) {
        // Обновление существующей папки
        await updateFolder(folderData.id, folderData);
      } else {
        // Создание новой папки
        await createFolderInParent(folderData.name, folderData.parent_id, folderData.color);
      }
      // Обновляем данные после успешного создания/обновления
      handleUpdateData();
      
      if (inTelegram) {
        showNotification(editMode ? "Папка обновлена" : "Папка создана");
      }
    } catch (error) {
      console.error("Error saving folder:", error);
      if (inTelegram) {
        showNotification("Ошибка при сохранении папки");
      } else {
        alert('Не удалось сохранить папку');
      }
    }
    setShowFolderDialog(false);
    setEditMode(false);
    setFolderToEdit(null);
  };
  
  // Обработчик удаления папки
  const handleDeleteFolder = async (folderId) => {
    try {
      await deleteFolder(folderId);
      handleUpdateData();
      
      if (inTelegram) {
        showNotification("Папка удалена");
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
      if (inTelegram) {
        showNotification("Ошибка при удалении папки");
      } else {
        alert('Не удалось удалить папку');
      }
    }
  };

  // Обработчик удаления заметки
  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(noteId);
      // Обновляем дерево и граф после удаления
      handleUpdateData();
      // Если удаленная заметка была активной, сбрасываем активную заметку и возвращаемся к предыдущей вкладке
      if (activeNote === noteId) {
        setActiveNote(null);
        setActiveTab(prevTab);
      }
      
      if (inTelegram) {
        showNotification("Заметка удалена");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      if (inTelegram) {
        showNotification("Ошибка при удалении заметки");
      } else {
        alert('Не удалось удалить заметку');
      }
    }
  };

  // Обработчик перемещения заметки в другую папку
  const handleMoveNote = async (noteId, targetFolderId) => {
    try {
      // Сначала получаем текущие данные заметки
      const noteData = await fetchNote(noteId);
      
      // Обновляем folder_id
      // targetFolderId может быть null для корневого каталога
      noteData.folder_id = targetFolderId;
      
      // Отправляем обновленные данные на сервер
      await updateNote(noteId, noteData);
      
      // Обновляем UI
      handleUpdateData();
      
      if (inTelegram) {
        showNotification("Заметка перемещена");
      }
    } catch (error) {
      console.error("Error moving note:", error);
      if (inTelegram) {
        showNotification("Ошибка при перемещении заметки");
      } else {
        alert('Не удалось переместить заметку');
      }
    }
  };
  
  // Обработчик перемещения папки в другую папку
  const handleMoveFolder = async (folderId, targetFolderId) => {
    try {
      await moveFolder(folderId, targetFolderId);
      // Обновляем UI
      handleUpdateData();
      
      if (inTelegram) {
        showNotification("Папка перемещена");
      }
    } catch (error) {
      console.error("Error moving folder:", error);
      if (inTelegram) {
        showNotification("Ошибка при перемещении папки");
      } else {
        alert('Не удалось переместить папку');
      }
    }
  };

  // Обработчик обновления дерева и графа
  const handleUpdateData = () => {
    // Загружаем обновленные данные
    fetchTreeData()
      .then(data => setTreeData(data))
      .catch(error => console.error("Error fetching tree data:", error));
      
    fetchGraphData(activeFolder)
      .then(data => setGraphData(data))
      .catch(error => console.error("Error fetching graph data:", error));
  };

  // Обработчик сброса отображения графа - показываем все заметки
  const handleResetGraphView = () => {
    setActiveFolder(null); // Сбрасываем активную папку
    
    // Загружаем полный граф (без фильтрации по папке)
    fetchGraphData(null)
      .then(data => setGraphData(data))
      .catch(error => console.error("Error fetching complete graph data:", error));
  };
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Показываем заголовок только когда не в режиме редактора */}
        {activeTab !== 'editor' && (
          <AppHeader 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            onCreateNote={() => handleCreateNote()}
            inTelegram={inTelegram}
          />
        )}
        
        <Box sx={{ flex: 1, display: 'flex', overflow: 'auto' }}>
          {activeTab === 'explorer' && (
            <NotesExplorer
              treeData={treeData}
              activeNote={activeNote}
              onSelectNote={handleNoteSelect}
              onSelectFolder={handleFolderSelect}
              onCreateNote={handleCreateNote}
              onCreateFolder={handleCreateFolder}
              showFolderDialog={showFolderDialog}
              setShowFolderDialog={setShowFolderDialog}
              folderParentId={folderParentId}
              onSaveFolder={handleSaveFolder}
              onDeleteFolder={handleDeleteFolder}
              onDeleteNote={handleDeleteNote}
              onMoveNote={handleMoveNote}
              onMoveFolder={handleMoveFolder}
              editMode={editMode}
              setEditMode={setEditMode}
              folderToEdit={folderToEdit}
              setFolderToEdit={setFolderToEdit}
              inTelegram={inTelegram}
            />
          )}
          {activeTab === 'graph' && (
            <GraphView
              graphData={graphData}
              loading={loading}
              onNodeClick={handleGraphNodeClick}
              onResetView={handleResetGraphView}
            />
          )}
          
          {activeTab === 'editor' && (
            <NoteEditor
              noteId={activeNote}
              folderId={activeFolder}
              onSave={handleUpdateData}
              onDelete={handleDeleteNote}
              treeData={treeData}
              inTelegram={inTelegram}
              telegramTheme={telegramTheme}
              onBack={handleBackFromEditor} // Добавлен обработчик возврата
            />
          )}
        </Box>
        
        {/* Добавляем кнопки внизу экрана для Telegram */}
        {inTelegram && activeTab !== 'editor' && (
          <Box sx={{ 
            p: 1, 
            display: 'flex', 
            borderTop: '1px solid #ddd',
            backgroundColor: theme.palette.background.paper
          }}>
            <Button 
              startIcon={<AddIcon />} 
              variant="contained" 
              onClick={() => handleCreateNote()}
              sx={{ flex: 1, mr: 1 }}
            >
              Новая заметка
            </Button>
            <Button 
              startIcon={<FolderIcon />} 
              variant="outlined" 
              onClick={() => handleCreateFolder()}
              sx={{ flex: 1 }}
            >
              Новая папка
            </Button>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}

export default App;