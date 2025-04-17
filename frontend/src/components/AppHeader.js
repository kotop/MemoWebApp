import { AppBar, Toolbar, Typography, Button, Tabs, Tab, Box, useMediaQuery, useTheme, IconButton, Menu, MenuItem } from '@mui/material';
import { Add as AddIcon, Menu as MenuIcon } from '@mui/icons-material';
import { useState } from 'react';

function AppHeader({ activeTab, setActiveTab, onCreateNote }) {
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
    <AppBar position="static">
      <Toolbar>
        {isMobile && (
          <>
            <IconButton
              color="inherit"
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
                Explorer
              </MenuItem>
              <MenuItem 
                selected={activeTab === 'graph'} 
                onClick={() => handleTabChange(null, 'graph')}
              >
                Graph
              </MenuItem>
              <MenuItem 
                selected={activeTab === 'editor'} 
                onClick={() => handleTabChange(null, 'editor')}
              >
                Editor
              </MenuItem>
            </Menu>
          </>
        )}
      
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Notes Manager
        </Typography>
        
        {!isMobile && (
          <Box sx={{ mr: 2 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              textColor="inherit"
              indicatorColor="secondary"
            >
              <Tab value="graph" label="Graph" />
              <Tab value="editor" label="Editor" />
            </Tabs>
          </Box>
        )}
        
        <Button 
          color="inherit" 
          startIcon={<AddIcon />}
          onClick={() => onCreateNote()}
        >
          New Note
        </Button>
      </Toolbar>
    </AppBar>
  );
}

export default AppHeader;