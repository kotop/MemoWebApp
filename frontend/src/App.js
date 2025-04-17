import React, { useState, useEffect } from 'react';
import { Container, Box, Paper, CircularProgress, CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fetchTreeData, fetchGraphData, createFolderInParent, updateFolder, deleteFolder, deleteNote, fetchNote, updateNote, moveFolder } from './services/api';
import NotesExplorer from './components/NotesExplorer';
import NoteEditor from './components/NoteEditor';
import TagsPanel from './components/TagsPanel';
import GraphView from './components/GraphView';
import AppHeader from './components/AppHeader';
import './App.css';

// Создаем тему для приложения
const theme = createTheme({
  palette: {
    primary: {
      main: '#85d1ac',
    },
  },
});

function App() {
  const [activeTab, setActiveTab] = useState('graph'); // 'graph' или 'editor'
  const [activeNote, setActiveNote] = useState(null);
  const [activeFolder, setActiveFolder] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [treeData, setTreeData] = useState({ folders: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [folderParentId, setFolderParentId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState(null);
  
  // Загрузка данных дерева при первом рендере
  useEffect(() => {
    fetchTreeData()
      .then(data => {
        setTreeData(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching tree data:", error);
        setLoading(false);
      });
  }, []);
  
  // Загрузка данных графа при изменении активной папки
  useEffect(() => {
    if (loading) return;
    
    fetchGraphData(activeFolder)
      .then(data => setGraphData(data))
      .catch(error => console.error("Error fetching graph data:", error));
  }, [activeFolder, loading]);
  
  // Обработчик выбора заметки
  const handleNoteSelect = (noteId) => {
    setActiveNote(noteId);
    setActiveTab('editor');
  };
  
  // Обработчик выбора папки
  const handleFolderSelect = (folderId) => {
    setActiveFolder(folderId);
  };
  
  // Обработчик клика по узлу графа
  const handleGraphNodeClick = (nodeId) => {
    setActiveNote(nodeId);
    setActiveTab('editor');
  };
  
  // Обработчик создания новой заметки
  const handleCreateNote = (folderId = null) => {
    setActiveNote('new');
    setActiveTab('editor');
    if (folderId) {
      setActiveFolder(folderId);
    }
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
    } catch (error) {
      console.error("Error saving folder:", error);
      alert('Не удалось сохранить папку');
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
    } catch (error) {
      console.error("Error deleting folder:", error);
      alert('Не удалось удалить папку');
    }
  };

  // Обработчик удаления заметки
  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(noteId);
      // Обновляем дерево и граф после удаления
      handleUpdateData();
      // Если удаленная заметка была активной, сбрасываем активную заметку
      if (activeNote === noteId) {
        setActiveNote(null);
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      alert('Не удалось удалить заметку');
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
    } catch (error) {
      console.error("Error moving note:", error);
      alert('Не удалось переместить заметку');
    }
  };
  
  // Обработчик перемещения папки в другую папку
  const handleMoveFolder = async (folderId, targetFolderId) => {
    try {
      await moveFolder(folderId, targetFolderId);
      // Обновляем UI
      handleUpdateData();
    } catch (error) {
      console.error("Error moving folder:", error);
      alert('Не удалось переместить папку');
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
      <Box className="app" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <AppHeader 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          onCreateNote={handleCreateNote}
        />
        
        <Box sx={{ 
          display: 'flex', 
          flex: 1, 
          overflow: 'hidden'
        }}>
          <Box className="sidebar" sx={{ 
            width: 280, 
            borderRight: '1px solid #ddd', 
            overflowY: 'auto',
            display: { xs: activeTab === 'explorer' ? 'block' : 'none', md: 'block' } 
          }}>
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
            />
          </Box>
          
          <Box className="main-content" sx={{ 
            flex: 1, 
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
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
                onDelete={handleDeleteNote}  // Передаем функцию удаления
                treeData={treeData}
              />
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;