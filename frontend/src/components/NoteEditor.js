import { useState, useEffect, useRef } from 'react';
import { Box, Button, CircularProgress, IconButton, Tooltip, Typography, Snackbar, Alert } from '@mui/material';
import { Editor } from '@monaco-editor/react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { 
  Save as SaveIcon,
  Visibility as VisibilityIcon, 
  Edit as EditIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  Code as CodeIcon,
  FormatListBulleted as BulletListIcon,
  FormatListNumbered as NumberListIcon,
  FormatQuote as QuoteIcon,
  Title as TitleIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import MarkdownPreview from './MarkdownPreview';
import TagsPanel from './TagsPanel';
import { fetchNote, createNote, updateNote } from '../services/api';

function NoteEditor({ noteId, folderId, onSave, onDelete, treeData }) {
  const [note, setNote] = useState({
    id: null,
    name: 'Untitled Note',
    content: '',
    folder_id: folderId,
    tags: []
  });
  const [loading, setLoading] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const editorRef = useRef(null);
  
  useEffect(() => {
    if (noteId === 'new') {
      // Создание новой заметки
      setNote({
        id: null,
        name: 'Untitled Note',
        content: '',
        folder_id: folderId,
        tags: []
      });
      setLoading(false);
      setIsModified(true);
    } else if (noteId) {
      // Загрузка существующей заметки
      setLoading(true);
      fetchNote(noteId)
        .then(data => {
          setNote(data);
          setIsModified(false);
          setLoading(false);
        })
        .catch(error => {
          console.error("Error fetching note:", error);
          showAlert('Failed to load note', 'error');
          setLoading(false);
        });
    }
  }, [noteId, folderId]);
  
  const handleContentChange = (newContent) => {
    setNote(prev => ({ ...prev, content: newContent }));
    setIsModified(true);
    
    // Извлекаем теги из контента
    extractTags(newContent);
  };
  
  const handleNameChange = (event) => {
    setNote(prev => ({ ...prev, name: event.target.value }));
    setIsModified(true);
  };
  
  const extractTags = (content) => {
    const tagRegex = /#[a-zA-Zа-яА-ЯёЁ0-9]\w*(?:[-_][a-zA-Zа-яА-ЯёЁ0-9]\w*)*/g;
    const foundTags = content.match(tagRegex) || [];
    // Обрабатываем найденные теги
    const uniqueTags = [...new Set(foundTags.map(tag => ({
      name: tag.substring(1), // Убираем символ #
      color: getTagColor(tag.substring(1))
    })))];
    
    setNote(prev => ({ ...prev, tags: uniqueTags }));
  };
  
  const getTagColor = (tagName) => {
    // Check if tag already exists in note
    const existingTag = note.tags.find(tag => tag.name === tagName);
    if (existingTag && existingTag.color) {
      return existingTag.color;
    }
    
    // Generate a random color
    return `#${Math.floor(Math.random()*16777215).toString(16)}`;
  };
  
  const handleSave = async () => {
    try {
      setLoading(true);
      let result;
      
      if (note.id) {
        // Update existing note
        result = await updateNote(note.id, note);
      } else {
        // Create new note
        result = await createNote(note);
        // Update note with new ID
        setNote(prev => ({ ...prev, id: result.id }));
      }
      
      setIsModified(false);
      showAlert('Note saved successfully', 'success');
      
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error("Error saving note:", error);
      showAlert('Failed to save note', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Обработчик для сохранения ссылки на редактор при его монтировании
  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };
  
  const insertFormat = (prefix, suffix = '') => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    const selection = editor.getSelection();
    const selectedText = editor.getModel().getValueInRange(selection);
    const id = { major: 1, minor: 1 };
    const op = { identifier: id, range: selection, text: prefix + selectedText + suffix, forceMoveMarkers: true };
    editor.executeEdits("insert-format", [op]);
  };
  
  const showAlert = (message, severity) => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };
  
  const handleAlertClose = () => {
    setAlertOpen(false);
  };

  const handleOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };
  
  const handleConfirmDelete = () => {
    if (note.id && onDelete) {
      onDelete(note.id);
    }
    handleCloseDeleteDialog();
  };
  
  if (loading && !note.content) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ 
        p: 1, 
        borderBottom: '1px solid #ddd', 
        display: 'flex', 
        alignItems: 'center' 
      }}>
        <input
          type="text"
          value={note.name}
          onChange={handleNameChange}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            width: '100%',
            padding: '4px'
          }}
        />
        
        <Tooltip title={isPreviewMode ? 'Edit' : 'Preview'}>
          <IconButton 
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            color={isPreviewMode ? 'primary' : 'default'}
          >
            {isPreviewMode ? <EditIcon /> : <VisibilityIcon />}
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Save">
          <IconButton 
            onClick={handleSave} 
            disabled={!isModified || loading}
            color="primary"
          >
            <SaveIcon />
          </IconButton>
        </Tooltip>

        {noteId !== 'new' && note.id && (
          <Tooltip title="Delete">
            <IconButton 
              onClick={handleOpenDeleteDialog}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      
      {!isPreviewMode && (
        <Box sx={{ 
          p: 1, 
          borderBottom: '1px solid #ddd', 
          display: 'flex', 
          alignItems: 'center',
          overflowX: 'auto'
        }}>
          <Tooltip title="Bold">
            <IconButton size="small" onClick={() => insertFormat('**', '**')}>
              <BoldIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Italic">
            <IconButton size="small" onClick={() => insertFormat('_', '_')}>
              <ItalicIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Code">
            <IconButton size="small" onClick={() => insertFormat('```\n', '\n```')}>
              <CodeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Bullet List">
            <IconButton size="small" onClick={() => insertFormat('* ')}>
              <BulletListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Numbered List">
            <IconButton size="small" onClick={() => insertFormat('1. ')}>
              <NumberListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Quote">
            <IconButton size="small" onClick={() => insertFormat('> ')}>
              <QuoteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Heading">
            <IconButton size="small" onClick={() => insertFormat('# ')}>
              <TitleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Link">
            <IconButton size="small" onClick={() => insertFormat('[', '](https://example.com)')}>
              <LinkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Image">
            <IconButton size="small" onClick={() => insertFormat('![alt text](', ')')}>
              <ImageIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {isPreviewMode ? (
          <MarkdownPreview content={note.content} />
        ) : (
          <Editor
            height="100%"
            language="markdown"
            value={note.content}
            onChange={handleContentChange}
            onMount={handleEditorDidMount}
            options={{
              wordWrap: 'on',
              minimap: { enabled: false },
              fontSize: 14
            }}
          />
        )}
      </Box>
      
      <TagsPanel tags={note.tags} />
      
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Удаление заметки</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить заметку "{note.name}"? Это действие нельзя отменить.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Отмена</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={alertOpen}
        autoHideDuration={6000}
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleAlertClose}
          severity={alertSeverity}
          sx={{ width: '100%' }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default NoteEditor;