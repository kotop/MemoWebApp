import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, FormControl, InputLabel, Select, MenuItem, Button, Tooltip, Collapse, Paper } from '@mui/material';
import { Network } from 'vis-network/standalone';
import { Tune as TuneIcon, Close as CloseIcon } from '@mui/icons-material';

function GraphView({ graphData, loading, onNodeClick, onResetView }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [layout, setLayout] = useState('force');
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false); // По умолчанию панель свернута
  
  useEffect(() => {
    if (containerRef.current && graphData && graphData.nodes && graphData.nodes.length > 0) {
      // Transform data for vis-network
      const nodes = graphData.nodes.map(node => ({
        id: node.id,
        label: node.name,
        color: node.color,
        shape: "dot",
        size: 10,
        font: { size: 12 }
      }));
      
      const edges = graphData.edges.map(edge => ({
        from: edge.source,
        to: edge.target,
        color: edge.color,
        dashes: edge.relation === 'tag',
        arrows: "to",
        smooth: { type: 'curvedCW', roundness: 0.2 }
      }));
      
      // Create a new network
      const options = getNetworkOptions(layout);
      
      if (networkRef.current) {
        networkRef.current.destroy();
      }
      
      networkRef.current = new Network(
        containerRef.current,
        { nodes, edges },
        options
      );
      
      // Event listeners
      networkRef.current.on("click", params => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          onNodeClick && onNodeClick(nodeId);
        }
      });
      
      // Save positions after stabilization
      networkRef.current.once("stabilized", () => {
        networkRef.current.storePositions();
      });
    }
    
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [graphData, layout, onNodeClick]);
  
  const getNetworkOptions = (layoutType) => {
    const commonOptions = {
      nodes: {
        borderWidth: 2,
        borderWidthSelected: 4,
        font: {
          color: '#333',
          face: 'Roboto',
          size: 14
        }
      },
      edges: {
        width: 2,
        selectionWidth: 3,
        smooth: { type: 'continuous' }
      },
      physics: {
        enabled: physicsEnabled,
        stabilization: {
          iterations: 100
        }
      },
      interaction: {
        navigationButtons: true,
        keyboard: true,
        hover: true,
        hoverConnectedEdges: true,
        tooltipDelay: 300
      }
    };
    
    // Layout-specific options
    switch (layoutType) {
      case 'force':
        return {
          ...commonOptions,
          physics: {
            ...commonOptions.physics,
            barnesHut: {
              gravitationalConstant: -2000,
              centralGravity: 0.3,
              springLength: 95,
              springConstant: 0.04,
              damping: 0.09
            }
          }
        };
        
      case 'hierarchical':
        return {
          ...commonOptions,
          layout: {
            hierarchical: {
              direction: 'UD',
              sortMethod: 'directed',
              levelSeparation: 150,
              nodeSpacing: 100
            }
          },
          physics: {
            ...commonOptions.physics,
            hierarchicalRepulsion: {
              centralGravity: 0.0,
              springLength: 100,
              springConstant: 0.01,
              nodeDistance: 120
            }
          }
        };
        
      case 'circular':
        return {
          ...commonOptions,
          layout: {
            improvedLayout: true,
            randomSeed: 42
          },
          physics: {
            ...commonOptions.physics,
            forceAtlas2Based: {
              gravitationalConstant: -50,
              centralGravity: 0.01,
              springConstant: 0.08,
              springLength: 100,
              damping: 0.4,
              avoidOverlap: 0.8
            }
          }
        };
        
      default:
        return commonOptions;
    }
  };
  
  const handleLayoutChange = (event) => {
    setLayout(event.target.value);
  };
  
  const togglePhysics = () => {
    setPhysicsEnabled(!physicsEnabled);
    if (networkRef.current) {
      networkRef.current.setOptions({ physics: { enabled: !physicsEnabled } });
    }
  };
  
  const resetView = () => {
    // Сначала вызовем функцию сброса фильтрации графа
    if (onResetView) {
      onResetView();
    }
    
    // Затем подгоняем граф под размер окна (будет применено к новому графу после загрузки)
    if (networkRef.current) {
      networkRef.current.fit();
    }
  };
  
  const togglePanel = () => {
    setIsPanelExpanded(!isPanelExpanded);
  };
  
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100%' 
      }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '100%', 
        flexDirection: 'column'
      }}>
        <Box sx={{ mb: 2 }}>No notes to display in graph</Box>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => onNodeClick && onNodeClick('new')}
        >
          Create a new note
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%' 
    }}>
      <Box 
        ref={containerRef} 
        sx={{ 
          width: '100%', 
          height: '100%' 
        }}
      />
      
      <Box sx={{ 
        position: 'absolute', 
        top: 16, 
        right: 16, 
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
      }}>
        {/* Кнопка сворачивания/разворачивания панели */}
        <Tooltip title={isPanelExpanded ? "Скрыть настройки" : "Показать настройки"}>
          <Button 
            onClick={togglePanel}
            variant="contained"
            color="primary"
            size="small"
            sx={{
              minWidth: '40px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              mb: isPanelExpanded ? 1 : 0,
              boxShadow: 3
            }}
          >
            {isPanelExpanded ? <CloseIcon /> : <TuneIcon />}
          </Button>
        </Tooltip>
        
        {/* Панель настроек - сворачиваемая */}
        <Collapse in={isPanelExpanded} timeout="auto">
          <Paper sx={{ 
            bgcolor: 'rgba(255,255,255,0.9)', 
            p: 1, 
            borderRadius: 1,
            boxShadow: 3,
            minWidth: '250px'
          }}>
            <FormControl sx={{ m: 1, width: '100%' }} size="small">
              <InputLabel>Layout</InputLabel>
              <Select
                value={layout}
                label="Layout"
                onChange={handleLayoutChange}
              >
                <MenuItem value="force">Force</MenuItem>
                <MenuItem value="hierarchical">Hierarchical</MenuItem>
                <MenuItem value="circular">Circular</MenuItem>
              </Select>
            </FormControl>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              <Button 
                onClick={togglePhysics} 
                size="small" 
                variant="outlined"
                fullWidth
              >
                {physicsEnabled ? 'Stop Physics' : 'Start Physics'}
              </Button>
              
              <Button 
                onClick={resetView} 
                size="small" 
                variant="outlined"
                fullWidth
              >
                Показать все заметки
              </Button>
            </Box>
          </Paper>
        </Collapse>
      </Box>
    </Box>
  );
}

export default GraphView;