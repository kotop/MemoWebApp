import React, { useState, useEffect } from 'react';
import { 
  Box, TextField, InputAdornment, IconButton, List, ListItem, ListItemIcon, ListItemText, 
  Chip, Typography, CircularProgress
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Clear as ClearIcon, 
  Description as DescriptionIcon,
  Title as TitleIcon,
  Subject as ContentIcon,
  LocalOffer as TagIcon 
} from '@mui/icons-material';
import { searchNotes } from '../services/api';

const Explorer = ({ onItemSelect, selectedItemId, renderFileTree }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (event) => {
    const query = event.target.value;
    setSearchQuery(query);

    if (query.trim() === '') {
      setSearchResults([]);
      setIsSearchMode(false);
      setError(null);
      return;
    }

    setIsSearchMode(true);
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Performing search for: "${query}"`);
      const results = await searchNotes(query);
      console.log('Search results:', results);
      
      if (Array.isArray(results)) {
        // Добавляем поле queryText для подсветки
        const resultsWithQuery = results.map(item => ({
          ...item,
          queryText: query.replace(/#\w+/g, '').trim() // Очищаем от тегов
        }));
        setSearchResults(resultsWithQuery);
      } else {
        console.error('Unexpected search results format:', results);
        setSearchResults([]);
        setError('Результаты поиска имеют неверный формат');
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setError(`Ошибка поиска: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  // Функция для подсветки совпадения в тексте
  const highlightText = (text, searchText) => {
    if (!searchText || !text || searchText.trim() === '') return text;
    
    try {
      const regex = new RegExp(`(${searchText})`, 'gi');
      const parts = text.split(regex);
      
      if (parts.length === 1) return text;
      
      return (
        <>
          {parts.map((part, i) => 
            regex.test(part) ? (
              <mark key={i} style={{ backgroundColor: '#FFEB3B' }}>{part}</mark>
            ) : (
              part
            )
          )}
        </>
      );
    } catch (e) {
      // В случае ошибки в регулярном выражении возвращаем обычный текст
      return text;
    }
  };

  // Получаем иконку в зависимости от типа совпадения
  const getMatchIcon = (match) => {
    switch (match) {
      case 'name': return <TitleIcon color="primary" />;
      case 'content': return <ContentIcon color="secondary" />;
      case 'tag': return <TagIcon style={{ color: '#4CAF50' }} />;
      default: return <DescriptionIcon />;
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

  const renderSearchResults = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, alignItems: 'center' }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Выполняется поиск...
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ p: 2, color: 'error.main' }}>
          <Typography variant="body2">{error}</Typography>
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
            onClick={() => onItemSelect(item.id)}
            selected={selectedItemId === item.id}
            divider
            sx={{ 
              borderLeft: '4px solid',
              borderLeftColor: item.match === 'name' ? 'primary.main' : 
                              item.match === 'content' ? 'secondary.main' : 
                              item.match === 'tag' ? '#4CAF50' : 'grey.400',
              mb: 1,
            }}
          >
            <ListItemIcon>
              {getMatchIcon(item.match)}
            </ListItemIcon>
            
            <ListItemText 
              primary={
                <Typography variant="subtitle1">
                  {item.match === 'name' 
                    ? highlightText(item.name, item.queryText) 
                    : item.name}
                </Typography>
              }
              secondary={
                <Box>
                  {/* Отображаем теги */}
                  {item.tags && item.tags.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                      {item.tags.map((tag) => (
                        <Chip
                          key={tag.name}
                          size="small"
                          label={tag.name}
                          sx={{
                            backgroundColor: tag.color || '#e0e0e0',
                            '& .MuiChip-label': {
                              fontWeight: 
                                item.match === 'tag' && 
                                tag.name.toLowerCase() === searchQuery.substring(1).toLowerCase() 
                                  ? 'bold' : 'normal'
                            }
                          }}
                        />
                      ))}
                    </Box>
                  )}
                  
                  {/* Отображаем тип совпадения */}
                  <Chip 
                    label={getMatchLabel(item.match)} 
                    size="small" 
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TextField
        placeholder="Поиск (введите # для поиска по тегам)"
        size="small"
        fullWidth
        value={searchQuery}
        onChange={handleSearch}
        sx={{ mb: 1, px: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => {
                setSearchQuery('');
                setIsSearchMode(false);
                setSearchResults([]);
                setError(null);
              }}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          )
        }}
      />

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isSearchMode ? (
          <Box sx={{ p: 1 }}>
            {renderSearchResults()}
          </Box>
        ) : (
          renderFileTree()
        )}
      </Box>
    </Box>
  );
};

export default Explorer;