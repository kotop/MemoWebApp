import { Box, Chip, Typography } from '@mui/material';

function TagsPanel({ tags }) {
  if (!tags || tags.length === 0) {
    return null;
  }
  
  return (
    <Box sx={{ 
      p: 1, 
      borderTop: '1px solid #ddd',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center'
    }}>
      <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary' }}>
        Tags:
      </Typography>
      
      {tags.map((tag, index) => (
        <Chip
          key={`${tag.name}-${index}`}
          label={tag.name}
          size="small"
          sx={{ 
            m: 0.5, 
            backgroundColor: tag.color || '#e0e0e0',
            color: '#000',
            '&:hover': {
              backgroundColor: tag.color ? `${tag.color}dd` : '#d0d0d0'
            }
          }}
        />
      ))}
    </Box>
  );
}

export default TagsPanel;