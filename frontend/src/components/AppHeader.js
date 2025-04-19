import { 
  AppBar, Toolbar, Typography, Button, Tabs, Tab, Box, 
  useMediaQuery, useTheme, IconButton, Menu, MenuItem 
} from '@mui/material';
import { Add as AddIcon, Menu as MenuIcon } from '@mui/icons-material';
import { useState } from 'react';

function AppHeader({ activeTab, setActiveTab, onCreateNote, inTelegram = false }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [menuAnchor, setMenuAnchor] = useState(null);
  
  const handleMenuOpen = (event) => {
    setMenuAnchor(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchor(null);
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    handleMenuClose();
  };
  
  return (
    <AppBar 
      position="static" 
      color="primary"
      sx={{
        // Если мы в Telegram, адаптируем стиль под его интерфейс
        backgroundColor: inTelegram ? 'transparent' : theme.palette.primary.main,
        boxShadow: inTelegram ? 'none' : undefined,
        borderBottom: inTelegram ? `1px solid ${theme.palette.divider}` : 'none'
      }}
    >
      <Toolbar>
        {isMobile && (
          <>
            <IconButton
              color={inTelegram ? "primary" : "inherit"}
              edge="start"
              onClick={handleMenuOpen}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
            >
              <MenuItem 
                selected={activeTab === 'explorer'} 
                onClick={() => handleTabChange(null, 'explorer')}
              >
                Проводник
              </MenuItem>
              <MenuItem 
                selected={activeTab === 'graph'} 
                onClick={() => handleTabChange(null, 'graph')}
              >
                Граф
              </MenuItem>
            </Menu>
          </>
        )}
      
        <Typography 
          variant="h6" 
          sx={{ 
            flexGrow: 1,
            color: inTelegram ? theme.palette.text.primary : 'inherit'
          }}
        >
          Notes Manager
        </Typography>
        
        {!isMobile && (
          <Box sx={{ mr: 2 }}>
            <Tabs 
              value={activeTab}
              onChange={handleTabChange}
              textColor={inTelegram ? "primary" : "inherit"}
              indicatorColor={inTelegram ? "primary" : "secondary"}
            >
              <Tab value="explorer" label="Проводник" />
              <Tab value="graph" label="Граф" />
            </Tabs>
          </Box>
        )}
        
        {/* Если не в Telegram, показываем кнопку создания заметки
            В Telegram кнопка создания заметки будет в нижней части экрана */}
        {!inTelegram && (
          <Button 
            color="inherit" 
            startIcon={<AddIcon />}
            onClick={() => onCreateNote()}
          >
            Новая заметка
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default AppHeader;