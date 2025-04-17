import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Box
} from '@mui/material';
import { generateTagColor } from '../services/tagsService';

function FolderDialog({ open, onClose, onSave, folders = [], parentId = null, editMode = false, folderToEdit = null }) {
  const [folderName, setFolderName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState(parentId);
  const [folderColor, setFolderColor] = useState(generateTagColor());

  // Инициализация данных при редактировании
  useEffect(() => {
    if (editMode && folderToEdit) {
      setFolderName(folderToEdit.name || '');
      setSelectedParentId(folderToEdit.parent_id || null);
      setFolderColor(folderToEdit.color || generateTagColor());
    } else {
      // При создании новой папки
      setFolderName('');
      setSelectedParentId(parentId);
      setFolderColor(generateTagColor());
    }
  }, [editMode, folderToEdit, parentId]);

  const handleSave = () => {
    if (folderName.trim() === '') return;
    
    onSave({
      name: folderName.trim(),
      parent_id: selectedParentId,
      color: folderColor,
      id: editMode && folderToEdit ? folderToEdit.id : null
    });
    
    resetForm();
  };
  
  const resetForm = () => {
    setFolderName('');
    setSelectedParentId(parentId);
    setFolderColor(generateTagColor());
    onClose();
  };
  
  const handleClose = () => {
    resetForm();
  };
  
  // Изменение цвета
  const handleColorChange = (event) => {
    setFolderColor(event.target.value);
  };

  // Функция рекурсивного построения дерева папок для выбора родителя
  const buildFolderOptions = (folders, parentId = null, level = 0) => {
    const options = [];
    
    folders
      .filter(folder => folder.parent_id === parentId)
      .forEach(folder => {
        options.push(
          <MenuItem 
            key={folder.id} 
            value={folder.id}
            style={{ paddingLeft: `${20 + level * 20}px` }}
          >
            {folder.name}
          </MenuItem>
        );
        
        // Рекурсивно добавляем дочерние папки
        const childOptions = buildFolderOptions(folders, folder.id, level + 1);
        options.push(...childOptions);
      });
    
    return options;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editMode ? 'Редактирование папки' : 'Создание новой папки'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Название папки"
          type="text"
          fullWidth
          variant="outlined"
          value={folderName}
          onChange={e => setFolderName(e.target.value)}
          sx={{ mb: 2 }}
        />
        
        <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
          <InputLabel>Родительская папка</InputLabel>
          <Select
            value={selectedParentId || ''}
            onChange={e => setSelectedParentId(e.target.value || null)}
            label="Родительская папка"
          >
            <MenuItem value="">
              <em>Корневой каталог</em>
            </MenuItem>
            {buildFolderOptions(folders)}
          </Select>
        </FormControl>
        
        <FormControl fullWidth variant="outlined">
          <InputLabel htmlFor="folder-color">Цвет папки</InputLabel>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            <input 
              type="color" 
              value={folderColor} 
              onChange={handleColorChange}
              style={{ marginRight: '10px', width: '40px', height: '40px' }}
            />
            <TextField
              id="folder-color"
              value={folderColor}
              onChange={handleColorChange}
              fullWidth
              variant="outlined"
            />
          </Box>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Отмена</Button>
        <Button 
          onClick={handleSave} 
          color="primary"
          disabled={folderName.trim() === ''}
        >
          {editMode ? 'Сохранить' : 'Создать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default FolderDialog;
