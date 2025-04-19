import React, { useState, useRef, useEffect } from 'react';
import { 
  TreeView, TreeItem, Box, Typography, IconButton, Menu, MenuItem, 
  Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  List, ListItem, ListItemIcon, ListItemText, ListItemButton,
  Collapse, InputBase, Paper, CircularProgress
} from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Description as FileIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  ArrowForward as MoveIcon,
  Clear as ClearIcon,
  Title as TitleIcon,
  Subject as ContentIcon, 
  LocalOffer as TagIcon
} from '@mui/icons-material';
import FolderDialog from './FolderDialog';
import { searchNotes } from '../services/api';

function NotesExplorer({ 
  treeData, 
  activeNote, 
  onSelectNote, 
  onSelectFolder, 
  onCreateNote, 
  onCreateFolder,
  showFolderDialog = false,
  setShowFolderDialog,
  folderParentId,
  onSaveFolder,
  onEditFolder,
  onDeleteFolder,
  onDeleteNote,
  onMoveNote,
  onMoveFolder,
  editMode = false,
  setEditMode,
  folderToEdit,
  setFolderToEdit,
  inTelegram = false,
  fullWidth = false // Добавляем новый параметр для управления шириной
}) {
  const [expanded, setExpanded] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveDetails, setMoveDetails] = useState({ noteId: null, folderId: null, noteName: '', folderName: '' });
  const [showDeleteNoteDialog, setShowDeleteNoteDialog] = useState(false);
  const [showDeleteFolderDialog, setShowDeleteFolderDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showSelectFolderDialog, setShowSelectFolderDialog] = useState(false);
  const [itemToMove, setItemToMove] = useState(null);
  const [selectedTargetFolder, setSelectedTargetFolder] = useState(null);

  const toggleExpand = (folderId) => {
    setExpanded(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const handleFolderClick = (event, folderId) => {
    event.stopPropagation();
    toggleExpand(folderId);
    if (onSelectFolder) {
      onSelectFolder(folderId);
    }
  };

  const handleFileClick = (fileId) => {
    if (onSelectNote) {
      onSelectNote(fileId);
    }
  };

  // Обновленный обработчик поиска с использованием API
  const handleSearchChange = async (event) => {
    const query = event.target.value;
    setSearchTerm(query);

    if (query.trim() === '') {
      setSearchResults([]);
      setIsSearchMode(false);
      setSearchError(null);
      return;
    }

    setIsSearchMode(true);
    setSearchLoading(true);
    setSearchError(null);

    try {
      console.log(`Поиск заметок: "${query}"`);
      const results = await searchNotes(query);
      console.log('Результаты поиска:', results);
      
      if (Array.isArray(results)) {
        setSearchResults(results);
      } else {
        console.error('Неожиданный формат результатов поиска:', results);
        setSearchResults([]);
        setSearchError('Результаты поиска имеют неверный формат');
      }
    } catch (error) {
      console.error('Ошибка поиска:', error);
      setSearchResults([]);
      setSearchError(`Ошибка поиска: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setSearchLoading(false);
    }
  };

  // Обработчик очистки поиска
  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setIsSearchMode(false);
    setSearchError(null);
  };

  // Получаем иконку в зависимости от типа совпадения
  const getMatchIcon = (match) => {
    switch (match) {
      case 'name': return <TitleIcon color="primary" />;
      case 'content': return <ContentIcon color="secondary" />;
      case 'tag': return <TagIcon style={{ color: '#4CAF50' }} />;
      default: return <FileIcon />;
    }
  };

  // Получаем текст для метки совпадения
  const getMatchLabel = (match) => {
    switch (match) {
      case 'name': return 'Название';
      case 'content': return 'Текст';
      case 'tag': return 'Тег';
      default: return match;
    }
  };

  // Отрисовка результатов поиска
  const renderSearchResults = () => {
    if (searchLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, alignItems: 'center' }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Выполняется поиск...
          </Typography>
        </Box>
      );
    }

    if (searchError) {
      return (
        <Box sx={{ p: 2, color: 'error.main' }}>
          <Typography variant="body2">{searchError}</Typography>
        </Box>
      );
    }

    if (searchResults.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
          <Typography>Ничего не найдено</Typography>
        </Box>
      );
    }

    return (
      <List>
        {searchResults.map((item) => (
          <ListItem
            key={item.id}
            button
            disablePadding
            selected={item.id === activeNote}
            sx={{ 
              borderLeft: '4px solid',
              borderLeftColor: item.match === 'name' ? 'primary.main' : 
                              item.match === 'content' ? 'secondary.main' : 
                              item.match === 'tag' ? '#4CAF50' : 'grey.400',
              mb: 1,
            }}
            onContextMenu={(event) => handleContextMenu(event, 'file', item.id)}
          >
            <ListItemButton onClick={() => handleFileClick(item.id)}>
              <ListItemIcon>
                {getMatchIcon(item.match)}
              </ListItemIcon>
              <ListItemText 
                primary={item.name}
                secondary={
                  <Box>
                    {/* Теги файла */}
                    {item.tags && item.tags.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                        {item.tags.map((tag) => (
                          <Box 
                            key={tag.name} 
                            component="span" 
                            sx={{ 
                              fontSize: '0.75rem',
                              p: '2px 4px',
                              borderRadius: '4px',
                              backgroundColor: tag.color || '#e0e0e0',
                              mr: 0.5,
                              fontWeight: 
                                item.match === 'tag' && 
                                tag.name.toLowerCase() === searchTerm.substring(1).toLowerCase() 
                                  ? 'bold' : 'normal'
                            }}
                          >
                            #{tag.name}
                          </Box>
                        ))}
                      </Box>
                    )}
                    {/* Тип совпадения */}
                    <Box 
                      component="span" 
                      sx={{ 
                        fontSize: '0.7rem',
                        p: '1px 4px',
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: 'divider',
                        mt: 0.5,
                        display: 'inline-block'
                      }}
                    >
                      {getMatchLabel(item.match)}
                    </Box>
                  </Box>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    );
  };

  const handleContextMenu = (event, type, id) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
    setSelectedItemType(type);
    setSelectedItemId(id);
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
    setSelectedItemType(null);
    setSelectedItemId(null);
  };

  const handleCreateNoteInFolder = () => {
    if (selectedItemType === 'folder' && onCreateNote) {
      onCreateNote(selectedItemId);
    }
    handleContextMenuClose();
  };

  const handleCreateFolderInParent = (parentId = null) => {
    if (onCreateFolder) {
      onCreateFolder(parentId);
    }
    handleContextMenuClose();
  };

  const handleEditFolder = () => {
    if (selectedItemType === 'folder' && selectedItemId) {
      const folder = treeData.folders.find(f => f.id === selectedItemId);
      if (folder && setFolderToEdit && setEditMode) {
        setFolderToEdit(folder);
        setEditMode(true);
        setShowFolderDialog(true);
      }
    }
    handleContextMenuClose();
  };

  const handleDeleteFolder = () => {
    if (selectedItemType === 'folder' && selectedItemId) {
      const folder = treeData.folders.find(f => f.id === selectedItemId);
      if (folder) {
        setItemToDelete({
          id: selectedItemId,
          name: folder.name,
          type: 'folder'
        });
        setShowDeleteFolderDialog(true);
      }
    }
    handleContextMenuClose();
  };

  const handleDeleteNote = () => {
    if (selectedItemType === 'file' && selectedItemId) {
      const note = treeData.files.find(f => f.id === selectedItemId);
      if (note) {
        setItemToDelete({
          id: selectedItemId,
          name: note.name,
          type: 'note'
        });
        setShowDeleteNoteDialog(true);
      }
    }
    handleContextMenuClose();
  };

  const handleChangeFolderColor = () => {
    if (selectedItemType === 'folder' && selectedItemId) {
      const folder = treeData.folders.find(f => f.id === selectedItemId);
      if (folder && setFolderToEdit && setEditMode) {
        setFolderToEdit(folder);
        setEditMode(true);
        setShowFolderDialog(true);
      }
    }
    handleContextMenuClose();
  };

  // Обработчик для перемещения элемента (папка или заметка)
  const handleMoveItem = () => {
    if (selectedItemType && selectedItemId) {
      const item = selectedItemType === 'folder' 
        ? treeData.folders.find(f => f.id === selectedItemId)
        : treeData.files.find(f => f.id === selectedItemId);
      
      if (item) {
        setItemToMove({
          id: selectedItemId,
          name: item.name,
          type: selectedItemType,
          parent_id: item.parent_id || item.folder_id
        });
        setShowSelectFolderDialog(true);
      }
    }
    handleContextMenuClose();
  };

  // Подтверждение выбора папки для перемещения
  const handleSelectTargetFolder = (folderId) => {
    // Важно: делаем проверку на undefined (а не на null),
    // чтобы могли успешно выбрать корневой каталог (null)
    setSelectedTargetFolder(folderId);
  };

  // Подтверждение перемещения элемента
  const confirmMoveItem = () => {
    // Проверяем только на undefined, чтобы разрешить null (корневой каталог)
    if (itemToMove && selectedTargetFolder !== undefined) {
      // Проверка на циклическую зависимость (для папок)
      if (itemToMove.type === 'folder' && selectedTargetFolder !== null && isSubfolder(itemToMove.id, selectedTargetFolder)) {
        alert('Невозможно переместить папку в ее подпапку');
        return;
      }

      // Проверка на перемещение в ту же папку
      if (itemToMove.parent_id === selectedTargetFolder) {
        setShowSelectFolderDialog(false);
        setItemToMove(null);
        setSelectedTargetFolder(null);
        return;
      }

      if (itemToMove.type === 'file' && onMoveNote) {
        onMoveNote(itemToMove.id, selectedTargetFolder);
      } else if (itemToMove.type === 'folder' && onMoveFolder) {
        onMoveFolder(itemToMove.id, selectedTargetFolder);
      }
    }
    setShowSelectFolderDialog(false);
    setItemToMove(null);
    setSelectedTargetFolder(null);
  };

  // Проверка, является ли folderB подпапкой folderA
  const isSubfolder = (folderA, folderB) => {
    if (folderA === folderB) return true;
    
    const folder = treeData.folders.find(f => f.id === folderB);
    if (!folder) return false;
    
    if (folder.parent_id === folderA) return true;
    
    return folder.parent_id ? isSubfolder(folderA, folder.parent_id) : false;
  };

  // Обработчики для drag-and-drop
  const handleDragStart = (event, item) => {
    if (item.type === 'file') {
      event.dataTransfer.setData('application/json', JSON.stringify(item));
      setDraggedItem(item);
    }
  };

  const handleDragOver = (event, item) => {
    if (item.type === 'folder' && draggedItem && draggedItem.type === 'file') {
      event.preventDefault();
      setDropTarget(item);
    }
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (event, targetFolder) => {
    event.preventDefault();
    if (draggedItem && draggedItem.type === 'file' && targetFolder.type === 'folder') {
      // Подготовим данные для диалога
      const noteData = findItemById(treeData.files, draggedItem.id);
      const folderData = findItemById(treeData.folders, targetFolder.id);
      
      setMoveDetails({
        noteId: draggedItem.id,
        folderId: targetFolder.id,
        noteName: noteData ? noteData.name : draggedItem.name,
        folderName: folderData ? folderData.name : targetFolder.name
      });
      
      setShowMoveDialog(true);
    }
    setDraggedItem(null);
    setDropTarget(null);
  };
  
  // Функция для поиска элемента по ID
  const findItemById = (items, id) => {
    return items.find(item => item.id === id);
  };

  // Подтверждение перемещения заметки
  const handleConfirmMove = () => {
    if (onMoveNote && moveDetails.noteId && moveDetails.folderId) {
      onMoveNote(moveDetails.noteId, moveDetails.folderId);
    }
    setShowMoveDialog(false);
  };

  const confirmDeleteFolder = () => {
    if (itemToDelete && onDeleteFolder) {
      onDeleteFolder(itemToDelete.id);
    }
    setShowDeleteFolderDialog(false);
    setItemToDelete(null);
  };

  const confirmDeleteNote = () => {
    if (itemToDelete && onDeleteNote) {
      onDeleteNote(itemToDelete.id);
    }
    setShowDeleteNoteDialog(false);
    setItemToDelete(null);
  };

  // Компонент для отображения древовидной структуры папок в диалоге выбора
  const FolderTreeSelect = ({ folders, selectedFolder, onSelect, excludeFolderId }) => {
    const renderFolderOptions = (parentId = null, level = 0) => {
      return folders
        .filter(folder => folder.parent_id === parentId && folder.id !== excludeFolderId)
        .map(folder => {
          const hasChildren = folders.some(f => f.parent_id === folder.id && f.id !== excludeFolderId);
          
          return (
            <Box key={folder.id}>
              <ListItem 
                disablePadding
                sx={{ pl: level * 2 }}
              >
                <ListItemButton 
                  onClick={() => onSelect(folder.id)}
                  selected={selectedFolder === folder.id}
                >
                  <ListItemIcon>
                    <FolderIcon style={{ color: folder.color || '#888' }} />
                  </ListItemIcon>
                  <ListItemText primary={folder.name} />
                </ListItemButton>
              </ListItem>
              {hasChildren && renderFolderOptions(folder.id, level + 1)}
            </Box>
          );
        });
    };

    return (
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => onSelect(null)}
            selected={selectedFolder === null}
          >
            <ListItemIcon>
              <FolderIcon />
            </ListItemIcon>
            <ListItemText primary="Корневой каталог" />
          </ListItemButton>
        </ListItem>
        {renderFolderOptions()}
      </List>
    );
  };

  // Recursive function to render folder tree
  const renderFolderTree = (folders, parentId = null, level = 0) => {
    const folderNodes = folders
      .filter(folder => folder.parent_id === parentId)
      .sort((a, b) => a.position - b.position)
      .map(folder => {
        const folderId = folder.id;
        const isExpanded = expanded[folderId];
        const folderFiles = treeData.files.filter(file => file.folder_id === folderId);
        const hasSubfolders = folders.some(f => f.parent_id === folderId);
        
        return (
          <Box key={folderId}>
            <ListItem 
              disablePadding
              sx={{ pl: level * 2 }}
              onContextMenu={(event) => handleContextMenu(event, 'folder', folderId)}
            >
              <ListItemButton onClick={(e) => handleFolderClick(e, folderId)}>
                <ListItemIcon>
                  {isExpanded ? (
                    <FolderOpenIcon style={{ color: folder.color || '#888' }} />
                  ) : (
                    <FolderIcon style={{ color: folder.color || '#888' }} />
                  )}
                </ListItemIcon>
                <ListItemText primary={folder.name} />
                {(hasSubfolders || folderFiles.length > 0) && (
                  isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />
                )}
              </ListItemButton>
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  handleContextMenu(event, 'folder', folderId);
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </ListItem>
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {folderFiles.map(file => (
                  <ListItem 
                    key={file.id}
                    disablePadding
                    sx={{ pl: (level + 1) * 2 }}
                    selected={file.id === activeNote}
                    onContextMenu={(event) => handleContextMenu(event, 'file', file.id)}
                  >
                    <ListItemButton onClick={() => handleFileClick(file.id)}>
                      <ListItemIcon>
                        <FileIcon />
                      </ListItemIcon>
                      <ListItemText primary={file.name} />
                    </ListItemButton>
                  </ListItem>
                ))}
                {renderFolderTree(folders, folderId, level + 1)}
              </List>
            </Collapse>
          </Box>
        );
      });
      
    return folderNodes;
  };
  
  // Files at root level (no folder)
  const rootFiles = treeData.files.filter(file => !file.folder_id);
  
  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      width: '100%', // Всегда используем полную ширину
      minWidth: '100%', // Минимальная ширина также 100%
      maxWidth: '100%', // Максимальная ширина также 100%
      boxSizing: 'border-box', // Учитываем padding и border внутри width
      overflow: 'hidden' // Предотвращаем выход за пределы контейнера
    }}>
      <Paper
        component="form"
        sx={{ 
          p: '2px 4px', 
          display: 'flex', 
          alignItems: 'center', 
          m: 1,
          mb: 2,
          width: 'calc(100% - 16px)', // Учитываем отступы по бокам
          boxSizing: 'border-box'
        }}
      >
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder="Поиск по имени, содержимому или тегам (#тег)"
          value={searchTerm}
          onChange={handleSearchChange}
        />
        {searchTerm ? (
          <IconButton type="button" sx={{ p: '10px' }} onClick={handleClearSearch}>
            <ClearIcon />
          </IconButton>
        ) : (
          <IconButton type="button" sx={{ p: '10px' }}>
            <SearchIcon />
          </IconButton>
        )}
      </Paper>

      {/* Кнопки создания для мобильной версии - отображаются под строкой поиска только если НЕ в Telegram */}
      {!inTelegram && (
        <Box 
          sx={{ 
            p: 1, 
            display: { xs: 'flex', md: 'none' }, 
            gap: 1,
            mb: 2,
            mx: 1,
            borderRadius: 1,
            bgcolor: 'background.paper',
            boxShadow: 1
          }}
        >
          <IconButton 
            color="primary" 
            onClick={() => onCreateNote()}
            sx={{ flex: 1 }}
          >
            <AddIcon />
            <Typography variant="body2" sx={{ ml: 1 }}>
              Новая заметка
            </Typography>
          </IconButton>
          <IconButton 
            color="primary" 
            onClick={() => handleCreateFolderInParent(null)}
            sx={{ flex: 1 }}
          >
            <FolderIcon />
            <Typography variant="body2" sx={{ ml: 1 }}>
              Новая папка
            </Typography>
          </IconButton>
        </Box>
      )}

      {isSearchMode ? (
        // Показываем результаты поиска
        <Box sx={{ overflow: 'auto', flex: 1 }}>
          <Typography variant="body2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
            Результаты поиска: {searchResults.length} заметок
          </Typography>
          {renderSearchResults()}
        </Box>
      ) : (
        // Показываем структуру папок
        <Box sx={{ overflow: 'auto', flex: 1 }}>
          <List>
            {renderFolderTree(treeData.folders)}
            
            {rootFiles.map(file => (
              <ListItem 
                key={file.id}
                disablePadding
                selected={file.id === activeNote}
                onContextMenu={(event) => handleContextMenu(event, 'file', file.id)}
              >
                <ListItemButton onClick={() => handleFileClick(file.id)}>
                  <ListItemIcon>
                    <FileIcon />
                  </ListItemIcon>
                  <ListItemText primary={file.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      
      {/* Кнопки создания для десктопной версии - остаются внизу */}
      <Box 
        sx={{ 
          p: 1, 
          borderTop: '1px solid #ddd', 
          display: { xs: 'none', md: 'flex' }, 
          gap: 1 
        }}
      >
        <IconButton 
          color="primary" 
          onClick={() => onCreateNote()}
          sx={{ flex: 1 }}
        >
          <AddIcon />
          <Typography variant="body2" sx={{ ml: 1 }}>
            New Note
          </Typography>
        </IconButton>
        <IconButton 
          color="primary" 
          onClick={() => handleCreateFolderInParent(null)}
          sx={{ flex: 1 }}
        >
          <FolderIcon />
          <Typography variant="body2" sx={{ ml: 1 }}>
            New Folder
          </Typography>
        </IconButton>
      </Box>
      
      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {selectedItemType === 'folder' ? [
          <MenuItem key="create-note" onClick={handleCreateNoteInFolder}>
            Создать заметку в этой папке
          </MenuItem>,
          <MenuItem key="create-subfolder" onClick={() => handleCreateFolderInParent(selectedItemId)}>
            Создать подпапку
          </MenuItem>,
          <Divider key="divider-1" />,
          <MenuItem key="move-folder" onClick={handleMoveItem}>
            Переместить папку
          </MenuItem>,
          <MenuItem key="change-color" onClick={handleChangeFolderColor}>
            Изменить цвет папки
          </MenuItem>,
          <MenuItem key="rename-folder" onClick={handleEditFolder}>
            Переименовать папку
          </MenuItem>,
          <MenuItem key="delete-folder" onClick={handleDeleteFolder}>
            Удалить папку
          </MenuItem>
        ] : selectedItemType === 'file' ? [
          <MenuItem key="move-note" onClick={handleMoveItem}>
            Переместить заметку
          </MenuItem>,
          <Divider key="divider-2" />,
          <MenuItem key="delete-note" onClick={handleDeleteNote}>
            Удалить заметку
          </MenuItem>
        ] : null}
      </Menu>
      
      {/* Диалог перемещения заметки */}
      <Dialog open={showMoveDialog} onClose={() => setShowMoveDialog(false)}>
        <DialogTitle>Переместить заметку</DialogTitle>
        <DialogContent className="move-note-dialog">
          <Typography>
            Вы уверены, что хотите переместить заметку "{moveDetails.noteName}" в папку "{moveDetails.folderName}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMoveDialog(false)}>Отмена</Button>
          <Button onClick={handleConfirmMove} variant="contained" color="primary">Переместить</Button>
        </DialogActions>
      </Dialog>
      
      {/* Диалог подтверждения удаления заметки */}
      <Dialog open={showDeleteNoteDialog} onClose={() => setShowDeleteNoteDialog(false)}>
        <DialogTitle>Удаление заметки</DialogTitle>
        <DialogContent className="delete-dialog">
          <Typography>
            Вы уверены, что хотите удалить заметку "{itemToDelete?.name}"?
          </Typography>
          <Typography color="error" sx={{ mt: 2 }}>
            Это действие невозможно отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteNoteDialog(false)}>Отмена</Button>
          <Button onClick={confirmDeleteNote} variant="contained" color="error">Удалить</Button>
        </DialogActions>
      </Dialog>
      
      {/* Диалог подтверждения удаления папки */}
      <Dialog open={showDeleteFolderDialog} onClose={() => setShowDeleteFolderDialog(false)}>
        <DialogTitle>Удаление папки</DialogTitle>
        <DialogContent className="delete-dialog">
          <Typography>
            Вы уверены, что хотите удалить папку "{itemToDelete?.name}"?
          </Typography>
          <Typography color="error" sx={{ mt: 2 }}>
            Внимание! Все заметки внутри этой папки также будут удалены.
            Это действие невозможно отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteFolderDialog(false)}>Отмена</Button>
          <Button onClick={confirmDeleteFolder} variant="contained" color="error">Удалить</Button>
        </DialogActions>
      </Dialog>
      
      {/* Диалог выбора папки для перемещения */}
      <Dialog 
        open={showSelectFolderDialog} 
        onClose={() => setShowSelectFolderDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {itemToMove?.type === 'folder' ? 'Переместить папку' : 'Переместить заметку'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography gutterBottom>
            Выберите папку, в которую хотите переместить "{itemToMove?.name}"
          </Typography>
          <Box sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
            <FolderTreeSelect 
              folders={treeData.folders}
              selectedFolder={selectedTargetFolder}
              onSelect={handleSelectTargetFolder}
              excludeFolderId={itemToMove?.type === 'folder' ? itemToMove.id : null}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSelectFolderDialog(false)}>Отмена</Button>
          <Button 
            onClick={confirmMoveItem} 
            variant="contained" 
            color="primary"
            disabled={selectedTargetFolder === undefined}
          >
            Переместить
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Диалог создания/редактирования папки */}
      <FolderDialog 
        open={showFolderDialog}
        onClose={() => {
          setShowFolderDialog(false);
          setEditMode(false);
          setFolderToEdit(null);
        }}
        onSave={onSaveFolder}
        folderToEdit={folderToEdit}
        editMode={editMode}
        parentId={folderParentId}
        folders={treeData.folders}
      />
    </Box>
  );
}

export default NotesExplorer;