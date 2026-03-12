import React, { useState, useRef, useEffect } from 'react';
import { ArrowDownCircle, ArrowRight, ArrowLeft, CheckCircle2, CircleDot, PenTool, Eraser, Minus, Type, Layers, Undo, Activity, Maximize, Minimize, BookOpen, PlayCircle, TrendingUp, TrendingDown } from 'lucide-react';
import './index.css';

const ToolBtn = ({ t, icon: Icon, label, currentTool, onToolChange }) => (
  <button
    onClick={() => onToolChange(t)}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid', borderColor: currentTool === t ? 'var(--card-border)' : 'transparent', background: currentTool === t ? 'rgba(255, 94, 0, 0.05)' : 'transparent',
      color: currentTool === t ? 'var(--accent-color)' : 'var(--text-secondary)', padding: '0.5rem 0.8rem', borderRadius: '6px', cursor: 'pointer',
      fontSize: '0.9rem', transition: 'all 0.2s', fontWeight: currentTool === t ? 600 : 500
    }}
    title={label}
    onMouseEnter={(e) => currentTool !== t && (e.currentTarget.style.backgroundColor = 'var(--card-hover)')}
    onMouseLeave={(e) => currentTool !== t && (e.currentTarget.style.backgroundColor = 'transparent')}
  >
    <Icon size={16} /> <span className="tool-label">{label}</span>
  </button>
);

const DrawingCanvas = ({ src, alt }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [elements, setElements] = useState([]);
  const [currentElement, setCurrentElement] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('line'); // 'pen', 'line', 'fibo', 'text'
  const [color, setColor] = useState('#ff5e00');
  const [imgError, setImgError] = useState(false);
  const [textInput, setTextInput] = useState({ show: false, x: 0, y: 0, text: '' });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0, natW: 0, natH: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedElementIndex, setSelectedElementIndex] = useState(null);
  const [dragHandle, setDragHandle] = useState(null); // 'sl' or 'tp'

  const drawElement = (ctx, el) => {
    // scale factor to keep visuals uniform across resolution
    const scale = ctx.canvas.width / (ctx.canvas.offsetWidth || ctx.canvas.width);
    
    ctx.strokeStyle = el.color;
    ctx.fillStyle = el.color;
    ctx.lineWidth = 3 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (el.type === 'pen') {
      if (el.points.length === 0) return;
      ctx.beginPath();
      el.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    } else if (el.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(el.x1, el.y1);
      ctx.lineTo(el.x2, el.y2);
      ctx.stroke();
    } else if (el.type === 'fibo') {
      const {x1, y1, x2, y2} = el;
      if (x1 === x2 && y1 === y2) return;
      
      const startX = Math.min(x1, x2);
      const endX = Math.max(x1, x2);
      const drawEndX = startX === endX ? startX + (50 * scale) : endX;
      
      ctx.setLineDash([5 * scale, 5 * scale]);
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
      const colors = ['#787b86', '#f44336', '#81c784', '#4caf50', '#009688', '#64b5f6', '#787b86'];
      const diffY = y2 - y1;

      levels.forEach((lvl, i) => {
        const y = y2 - diffY * lvl;
        ctx.strokeStyle = colors[i] || el.color;
        ctx.fillStyle = colors[i] || el.color;
        
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(drawEndX, y);
        ctx.stroke();
        
        ctx.font = `500 ${12 * scale}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`Fib ${lvl}`, drawEndX + (4 * scale), y - (2 * scale));
      });
    } else if (el.type === 'elliot') {
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      el.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      const labels = ['0', '1', '2', '3', '4', '5'];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      el.points.forEach((p, i) => {
        ctx.fillStyle = '#2b1d19'; // use actual background color value instead of CSS variable
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = el.color;
        ctx.font = `bold ${12 * scale}px sans-serif`;
        ctx.fillText(labels[i] || '', p.x, p.y);
      });
    } else if (el.type === 'text') {
      ctx.font = `bold ${16 * scale}px sans-serif`;
      ctx.fillText(el.text, el.x, el.y);
    } else if (el.type === 'positionLong' || el.type === 'positionShort') {
      const { x1, y1, x2, slHeight, tpHeight } = el;
      const isLong = el.type === 'positionLong';
      const width = x2 - x1;
      const isSelected = elements.indexOf(el) === selectedElementIndex;
      
      // TP Area (Green for Long, Red boundary logic)
      let tpY_start, tpY_height;
      let slY_start, slY_height;

      if (isLong) {
        tpY_start = y1 + tpHeight; // tpHeight is typically negative for Long (above entry)
        tpY_height = Math.abs(tpHeight);
        slY_start = y1;
        slY_height = Math.abs(slHeight); // slHeight is typically positive for Long (below entry)
      } else {
        slY_start = y1 + slHeight; // slHeight is negative for Short (above entry)
        slY_height = Math.abs(slHeight);
        tpY_start = y1;
        tpY_height = Math.abs(tpHeight); // tpHeight is positive for Short (below entry)
      }
      
      // Draw TP Area
      ctx.fillStyle = isLong ? 'rgba(0, 255, 128, 0.2)' : 'rgba(255, 68, 68, 0.2)';
      ctx.fillRect(x1, tpY_start, width, tpY_height);
      ctx.strokeStyle = isLong ? 'rgba(0, 255, 128, 0.4)' : 'rgba(255, 68, 68, 0.4)';
      ctx.lineWidth = 1 * scale;
      ctx.strokeRect(x1, tpY_start, width, tpY_height);
      
      // Draw SL Area
      ctx.fillStyle = isLong ? 'rgba(255, 68, 68, 0.2)' : 'rgba(0, 255, 128, 0.2)';
      ctx.fillRect(x1, slY_start, width, slY_height);
      ctx.strokeStyle = isLong ? 'rgba(255, 68, 68, 0.4)' : 'rgba(0, 255, 128, 0.4)';
      ctx.strokeRect(x1, slY_start, width, slY_height);
      
      // Entry Line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y1);
      ctx.stroke();
      
      if (isSelected) {
        // Draw Handles
        const handleSize = 8 * scale;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'var(--accent-color)';
        ctx.lineWidth = 2 * scale;

        // SL Handle
        const slEdgeY = y1 + slHeight;
        ctx.beginPath();
        ctx.arc(x1 + width/2, slEdgeY, handleSize/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // TP Handle
        const tpEdgeY = y1 + tpHeight;
        ctx.beginPath();
        ctx.arc(x1 + width/2, tpEdgeY, handleSize/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Label
      ctx.font = `bold ${9 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(isLong ? 'LONG' : 'SHORT', x1 + width/2, y1 + (isSelected ? -10 * scale : 12 * scale));
    }
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    elements.forEach(el => drawElement(ctx, el));
    
    if (currentElement) {
      drawElement(ctx, currentElement);
    }
  };

  useEffect(() => {
    redraw();
  }, [elements, currentElement, canvasSize]);

  const handleResize = () => {
    const container = containerRef.current;
    if (container) {
       const rect = container.getBoundingClientRect();
       const cw = rect.width;
       const ch = rect.height;

       setCanvasSize(prev => {
         if (prev.natW && prev.natH) {
           const imgRatio = prev.natW / prev.natH;
           const containerRatio = cw / (ch || 1);

           let finalW = cw;
           let finalH = ch;

           if (containerRatio > imgRatio) {
             finalH = ch;
             finalW = ch * imgRatio;
           } else {
             finalW = cw;
             finalH = cw / imgRatio;
           }
           return { ...prev, width: finalW, height: finalH };
         }
         return prev;
       });
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    const fullscreenHandler = () => {
       setIsFullscreen(!!document.fullscreenElement);
       // Ensure resize fires immediately after fullscreen layout changes
       setTimeout(handleResize, 50);
    };
    document.addEventListener('fullscreenchange', fullscreenHandler);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', fullscreenHandler);
    };
  }, []);

  const handleImageLoad = (e) => {
    const img = e.target;
    const updateSize = () => {
      if (img && containerRef.current) {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;
        
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        const cw = rect.width;
        const ch = rect.height;
        
        const imgRatio = natW / natH;
        const containerRatio = cw / (ch || 1);

        let finalW = cw;
        let finalH = ch;

        if (containerRatio > imgRatio) {
           finalH = ch;
           finalW = ch * imgRatio;
        } else {
           finalW = cw;
           finalH = cw / imgRatio;
        }

        setCanvasSize({ width: finalW, height: finalH, natW, natH });
      }
    };
    updateSize();
    // Re-check just in case layout repaints
    setTimeout(updateSize, 100);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    // apply intrinsic native height, not DOM container height. Resolves scaling mismatches.
    if (canvas && canvasSize.natW > 0 && canvasSize.natH > 0) {
       canvas.width = canvasSize.natW;
       canvas.height = canvasSize.natH;
       redraw();
    }
  }, [canvasSize]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if(!canvas) return {x:0, y:0};
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const commitText = () => {
    if (textInput.text.trim()) {
      setElements(prev => [...prev, { type: 'text', x: textInput.x, y: textInput.y, text: textInput.text, color }]);
    }
    setTextInput({ show: false, x: 0, y: 0, text: '' });
  };

  const startDrawing = (e) => {
    if (textInput.show) {
      return;
    }
    e.preventDefault();
    const { x, y } = getCoordinates(e);

    if (selectedElementIndex !== null) {
      const el = elements[selectedElementIndex];
      if (el && (el.type === 'positionLong' || el.type === 'positionShort')) {
        const scale = canvasRef.current.width / canvasRef.current.offsetWidth;
        const width = el.x2 - el.x1;
        const slEdgeY = el.y1 + el.slHeight;
        const tpEdgeY = el.y1 + el.tpHeight;
        const centerX = el.x1 + width / 2;
        const threshold = 15 * scale;

        if (Math.abs(x - centerX) < threshold) {
          if (Math.abs(y - slEdgeY) < threshold) {
            setDragHandle('sl');
            setIsDrawing(true);
            return;
          }
          if (Math.abs(y - tpEdgeY) < threshold) {
            setDragHandle('tp');
            setIsDrawing(true);
            return;
          }
        }
      }
    }

    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === 'positionLong' || el.type === 'positionShort') {
        const minX = Math.min(el.x1, el.x2);
        const maxX = Math.max(el.x1, el.x2);
        const minY = el.y1 + Math.min(0, el.slHeight, el.tpHeight);
        const maxY = el.y1 + Math.max(0, el.slHeight, el.tpHeight);
        
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          setSelectedElementIndex(i);
          return;
        }
      }
    }

    setSelectedElementIndex(null);
    
    if (tool === 'text') {
      setTextInput({ show: true, x, y, text: '' });
      return;
    }

    if (tool === 'elliot') {
      if (!currentElement || currentElement.type !== 'elliot') {
        setCurrentElement({ type: 'elliot', points: [{x, y}, {x, y}], color });
        setIsDrawing(true);
      } else {
        const newPoints = [...currentElement.points, {x, y}];
        if (newPoints.length > 6) { 
          setElements(prev => [...prev, { ...currentElement, points: currentElement.points }]);
          setCurrentElement(null);
          setIsDrawing(false);
        } else {
          setCurrentElement({ ...currentElement, points: newPoints });
        }
      }
      return;
    }

    setIsDrawing(true);
    if (tool === 'pen') {
      setCurrentElement({ type: 'pen', points: [{x, y}], color });
    } else if (tool === 'line') {
      setCurrentElement({ type: 'line', x1: x, y1: y, x2: x, y2: y, color });
    } else if (tool === 'fibo') {
      setCurrentElement({ type: 'fibo', x1: x, y1: y, x2: x, y2: y, color });
    } else if (tool === 'positionLong' || tool === 'positionShort') {
      setCurrentElement({ type: tool, x1: x, y1: y, x2: x, slHeight: 0, tpHeight: 0, color });
    }
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    if (!currentElement && !dragHandle) return;
    
    const { x, y } = getCoordinates(e);

    if (dragHandle && selectedElementIndex !== null) {
      setElements(prev => {
        const newEls = [...prev];
        const el = { ...newEls[selectedElementIndex] };
        if (dragHandle === 'sl') el.slHeight = y - el.y1;
        if (dragHandle === 'tp') el.tpHeight = y - el.y1;
        newEls[selectedElementIndex] = el;
        return newEls;
      });
      return;
    }
    
    if (tool === 'elliot' && currentElement.type === 'elliot') {
      const newPoints = [...currentElement.points];
      newPoints[newPoints.length - 1] = {x, y};
      setCurrentElement(prev => ({ ...prev, points: newPoints }));
      return;
    }
    
    if (tool === 'pen') {
      setCurrentElement(prev => ({ ...prev, points: [...prev.points, {x, y}] }));
    } else if (tool === 'line' || tool === 'fibo') {
      setCurrentElement(prev => ({ ...prev, x2: x, y2: y }));
    } else if (tool === 'positionLong' || tool === 'positionShort') {
      const h = y - currentElement.y1;
      setCurrentElement(prev => ({ 
        ...prev, 
        x2: x, 
        slHeight: h, 
        tpHeight: -h 
      }));
    }
  };

  const stopDrawing = (e) => {
    e.preventDefault();
    if (tool === 'elliot') return;
    
    if (dragHandle) {
      setDragHandle(null);
      setIsDrawing(false);
      return;
    }

    if (isDrawing && currentElement) {
      setElements(prev => [...prev, currentElement]);
      setSelectedElementIndex(elements.length);
      setCurrentElement(null);
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    setElements([]);
    setCurrentElement(null);
  };

  const undo = () => {
    setElements(prev => prev.slice(0, -1));
  };                     

  const handleToolChange = (t) => {
    if (tool === 'elliot' && currentElement && currentElement.type === 'elliot') {
      const savedPoints = currentElement.points.slice(0, -1);
      if (savedPoints.length > 1) {
        setElements(prev => [...prev, { ...currentElement, points: savedPoints }]);
      }
    }
    setCurrentElement(null);
    setIsDrawing(false);
    setTool(t);
  };

  const toggleFullscreen = () => {
    const elem = containerRef.current.parentElement;
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* TradingView-style Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'var(--card-bg)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
        
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <ToolBtn t="line" icon={Minus} label="Línea Recta" currentTool={tool} onToolChange={handleToolChange} />
          <ToolBtn t="fibo" icon={Layers} label="Fibonacci" currentTool={tool} onToolChange={handleToolChange} />
          <ToolBtn t="elliot" icon={Activity} label="Ondas Elliot" currentTool={tool} onToolChange={handleToolChange} />
          <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--card-border)', margin: '0 0.5rem' }}></div>
          <ToolBtn t="positionLong" icon={TrendingUp} label="Largo" currentTool={tool} onToolChange={handleToolChange} />
          <ToolBtn t="positionShort" icon={TrendingDown} label="Corto" currentTool={tool} onToolChange={handleToolChange} />
          <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--card-border)', margin: '0 0.5rem' }}></div>
          <ToolBtn t="pen" icon={PenTool} label="Resaltador" currentTool={tool} onToolChange={handleToolChange} />
          <ToolBtn t="text" icon={Type} label="Texto" currentTool={tool} onToolChange={handleToolChange} />
          
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--card-border)', margin: '0 0.5rem' }}></div>
          
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
             <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: color, border: '2px solid var(--text-primary)', cursor: 'pointer', overflow: 'hidden' }}>
                <input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)} 
                  style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} 
                  title="Elegir Color"
                />
             </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
             onClick={undo} 
             disabled={elements.length === 0}
             style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1px solid var(--card-border)', color: elements.length === 0 ? 'var(--card-border)' : 'var(--text-primary)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: elements.length === 0 ? 'not-allowed' : 'pointer', fontSize: '0.85rem', transition: 'background-color 0.2s' }}
             onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'var(--card-hover)')}
             onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Undo size={16} /> <span style={{display: 'none', '@media (min-width: 768px)': {display: 'inline'}}}>Deshacer</span>
          </button>
          <button 
             onClick={clearCanvas} 
             style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', transition: 'background-color 0.2s' }}
             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--card-hover)'}
             onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Eraser size={16} /> <span style={{display: 'none', '@media (min-width: 768px)': {display: 'inline'}}}>Limpiar Todo</span>
          </button>
          
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--card-border)', margin: '0 0.25rem' }}></div>
          
          <button 
             onClick={toggleFullscreen} 
             style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', transition: 'background-color 0.2s' }}
             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--card-hover)'}
             onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />} 
          </button>
        </div>
      </div>

      <div 
        ref={containerRef} 
        style={{ 
          position: 'relative', 
          width: '100%', 
          aspectRatio: isFullscreen ? 'auto' : (canvasSize.natW && canvasSize.natH ? `${canvasSize.natW}/${canvasSize.natH}` : 'auto'),
          height: isFullscreen ? 'calc(100vh - 60px)' : 'auto', 
          borderRadius: '12px', 
          overflow: 'hidden', 
          border: '1px solid var(--card-border)', 
          backgroundColor: 'var(--card-bg)', 
          minHeight: imgError ? '400px' : 'auto', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}
      >
        {!imgError ? (
          <div style={{ position: 'relative', width: canvasSize.width > 0 ? canvasSize.width : '100%', height: canvasSize.height > 0 ? canvasSize.height : '100%', display: 'flex' }}>
            <img 
              src={src} 
              alt={alt} 
              onLoad={handleImageLoad} 
              onError={() => setImgError(true)}
              style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none', userSelect: 'none' }} 
              draggable="false" 
            />
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              onTouchCancel={stopDrawing}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: tool === 'text' ? 'text' : 'crosshair', touchAction: 'none' }}
            />
            {textInput.show && (
              <input
                autoFocus
                style={{
                  position: 'absolute',
                  left: textInput.x / (canvasSize.natW / canvasSize.width || 1),
                  top: (textInput.y / (canvasSize.natH / canvasSize.height || 1)) - 12,
                  color: color,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--accent-color)',
                  outline: 'none',
                  font: 'bold 16px var(--font-family)',
                  zIndex: 10,
                  minWidth: '100px',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
                value={textInput.text}
                onChange={e => setTextInput(prev => ({ ...prev, text: e.target.value }))}
                onBlur={commitText}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitText();
                }}
                placeholder="Escribe algo..."
              />
            )}
          </div>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ marginBottom: '1rem' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                 <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                 <circle cx="8.5" cy="8.5" r="1.5" />
                 <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <h4 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Imagen no encontrada</h4>
            <p style={{ lineHeight: 1.5 }}>
              Para que el gráfico aparezca aquí, asegúrate de guardar la imagen como <strong>{src.split('/').pop()}</strong><br/>
              dentro de la carpeta <strong>public/</strong> de este proyecto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const GalleryCanvas = ({ images, alt }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ position: 'relative' }}>
        <DrawingCanvas src={images[currentIndex]} alt={`${alt} - ${currentIndex + 1}`} />
        
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(0,0,0,0.6)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
            >
              <ArrowLeft size={24} />
            </button>
            <button 
              onClick={nextImage}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(0,0,0,0.6)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
            >
              <ArrowRight size={24} />
            </button>
          </>
        )}
      </div>
      
      {images.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          {images.map((_, i) => (
            <div 
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: i === currentIndex ? 'var(--accent-color)' : 'var(--card-border)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Mock questions for the demo
const questions = {
  basico: [
    {
      id: 1,
      title: "Estilos de Trading y Temporalidades",
      desc: "Aprende los conceptos fundamentales sobre temporalidades de mercado y estilos de análisis.",
      question: "¿Cuáles son los estilos de trading existentes?",
      options: [
        "Swing, Day, Scalping",
        "Alcista, Bajista, Rango",
        "Mensual, Diario, Horario",
        "Indicadores, Resistencias, Diagonales"
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Estilos de Trading y Temporalidades</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>Los estilos de trading se definen según las temporalidades en las que se ejecutan las operaciones. Los tres principales estilos son:</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--card-bg)', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #ff5e00' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h5 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Swing</h5>
                <span style={{ fontSize: '0.85rem', color: 'var(--accent-color)', backgroundColor: 'rgba(255, 94, 0, 0.1)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>Días a meses</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ background: 'var(--bg-color)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--card-border)' }}><strong>Dir:</strong> Mensual</span>
                <span style={{ background: 'var(--bg-color)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--card-border)' }}><strong>Análisis:</strong> Semanal, Diario</span>
                <span style={{ background: 'var(--bg-color)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--card-border)' }}><strong>Ejecución:</strong> 1 Hora</span>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Considerado el más "sencillo" por operar en altas temporalidades. Permite analizar con más calma y ofrece mayor tiempo de reacción ante movimientos inesperados del precio, capitalizando movimientos significativos.</p>
            </div>

            <div style={{ backgroundColor: 'var(--card-bg)', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #00a8ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h5 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Day</h5>
                <span style={{ fontSize: '0.85rem', color: '#00a8ff', backgroundColor: 'rgba(0, 168, 255, 0.1)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>Horas a días</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ background: 'var(--bg-color)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--card-border)' }}><strong>Dir:</strong> Diario</span>
                <span style={{ background: 'var(--bg-color)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--card-border)' }}><strong>Análisis:</strong> 4 Horas, 1 Hora</span>
                <span style={{ background: 'var(--bg-color)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--card-border)' }}><strong>Ejecución:</strong> 5 min</span>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Estilo equilibrado que combina temporalidades altas y bajas, resultando en un mayor número de operaciones que el Swing. Requiere un tiempo de reacción mayor, pero es permisivo si se sigue un plan de trading estructurado.</p>
            </div>

            <div style={{ backgroundColor: 'var(--card-bg)', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #ff3366' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h5 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Scalping</h5>
                <span style={{ fontSize: '0.85rem', color: '#ff3366', backgroundColor: 'rgba(255, 51, 102, 0.1)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>Minutos a horas</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ background: 'var(--bg-color)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--card-border)' }}><strong>Dir:</strong> 1 Hora</span>
                <span style={{ background: 'var(--bg-color)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--card-border)' }}><strong>Análisis:</strong> 15 min, 5 min</span>
                <span style={{ background: 'var(--bg-color)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--card-border)' }}><strong>Ejecución:</strong> 1 min / 30s</span>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Implica operar en las temporalidades más bajas, permitiendo "cazar" movimientos rápidos, incluso varios en un solo día. Su complejidad es alta debido al tiempo de reacción mínimo requerido, exigiendo un plan de trading totalmente formado y un "ojo" entrenado para el control gráfico y la identificación rápida de soportes/resistencias.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Soportes y Resistencias Claves",
      desc: "Ejercicio práctico sobre la identificación de soportes y resistencias en el par GBPZAR.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Ejercicio Práctico: Identificación de Soportes y Resistencias Clave</h3>
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            El objetivo de este ejercicio es practicar la identificación de los niveles de soporte y resistencia. Se solicita encontrar los <strong>3 soportes o resistencias más significativos</strong> en el gráfico mensual del par de divisas <strong>GBPZAR</strong>.
          </p>
          <DrawingCanvas src="/gbpzar.png" alt="Gráfico Mensual GBPZAR" />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Justifica la elección de tus líneas:</label>
            <textarea 
              placeholder="Explica por qué has elegido estos niveles (puntos de contacto, mechas, relevancia histórica...)"
              style={{
                width: '100%',
                minHeight: '100px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>

          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>Es fundamental recordar que la delimitación de estos niveles es subjetiva. Una vez trazados y justificados, pulsa el botón para ver la solución.</em>
          </p>
        </div>
      ),
      options: [
        "He completado el trazado y mi justificación, estoy listo para revisar la solución."
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Solución del Ejercicio</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>En el siguiente video te explicamos en detalle cómo identificar de forma correcta estos 3 niveles clave, justificando la elección en base a la acción del precio.</p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/1614696766104404810b82ffae80600d?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Análisis Detallado de Ondas de Elliott en GBPUSD",
      desc: "Análisis exhaustivo y aplicación interactiva en el gráfico mensual de GBPUSD.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Análisis Detallado de Ondas de Elliott en GBPUSD (Gráfico Mensual)</h3>
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            El propósito de este material es ofrecer una explicación exhaustiva y desarrollada sobre la aplicación de la Teoría de Ondas de Elliott al par de divisas GBPUSD, utilizando el gráfico mensual como marco temporal.
          </p>
          <DrawingCanvas src="/gbpusd.png" alt="Gráfico Mensual GBPUSD" />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tus Notas / Dudas sobre el Marcado:</label>
            <textarea 
              placeholder="Escribe aquí tu análisis o dudas que quieras plantear luego en la comunidad..."
              style={{
                width: '100%',
                minHeight: '100px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>

          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>Utiliza la herramienta interactiva de Ondas de Elliott para trazar las 5 ondas impulsivas sobre el gráfico mensual. Una vez completado, pulsa el botón para revisar el video instructivo.</em>
          </p>
        </div>
      ),
      options: [
        "Finalicé mi análisis y mi marcado, estoy listo para ver el video explicativo."
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Recurso de Apoyo: Video Explicativo sobre el Marcado de Ondas</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Para facilitar la comprensión y el correcto marcado de las 5 ondas de Elliott, se adjunta un video instructivo. Dominar esta técnica es crucial, por lo que cualquier consulta o inquietud puede plantearse libremente en la comunidad o, si se prefiere discreción, a través de mensaje privado.
            </p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/d82945ae0db14b20aaf0ce407e33b474?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Ruptura de Estructura en EURCAD",
      desc: "Identificación de niveles de ruptura de estructura y cambio de tendencia en el par EURCAD mensual.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Ruptura de Estructura en el Gráfico Mensual (EURCAD)</h3>
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            Identifica las rupturas de estructura en el gráfico mensual del par <strong>EURCAD</strong>. He completado el primer ejemplo para que puedas seguir la misma metodología utilizando la herramienta interactiva.
          </p>
          
          <DrawingCanvas src="/eurcad-bos.png" alt="Gráfico EURCAD SMC" />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
             <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>Conceptos Clave del SMC:</h4>
             <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                <li><strong>Ruptura de Estructura:</strong> Ruptura a favor de la tendencia principal. Indica continuación.</li>
                <li><strong>Cambio de Tendencia:</strong> Primer indicio de cambio de dirección. Inversión de tendencia.</li>
             </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tus Notas de Análisis:</label>
            <textarea 
              placeholder="Justifica tus trazados aquí (ej: 'El precio rompe el último máximo formando una ruptura de estructura...')"
              style={{
                width: '100%',
                minHeight: '100px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>

          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>Dibuja tus propios niveles de ruptura sobre el gráfico antes de ver la solución en video.</em>
          </p>
        </div>
      ),
      options: [
        "He terminado mis marcaciones y quiero ver la video-explicación."
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Análisis de Ruptura de Estructura</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              En este video explicamos detalladamente las rupturas de estructura y los cambios de tendencia identificados en EURCAD:
            </p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/0d5721dbc4e5403996d9a47b183ae60d?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "Secuencia de Fibonacci en EURCAD",
      desc: "Aplicación de retrocesos de Fibonacci y su relación con la estructura.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Instrucciones para el Ejercicio de Fibonacci</h3>
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            Para este ejercicio, dirígete al gráfico del par <strong>EURCAD</strong> en temporalidad mensual y dibuja los retrocesos de Fibonacci correspondientes.
          </p>
          
          <DrawingCanvas src="/eurcad-fibonacci.png" alt="Gráfico EURCAD Fibonacci" />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'rgba(255, 94, 0, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
             <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>Reglas de Oro:</h4>
             <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                <li><strong>Trazado:</strong> Fibonacci siempre se traza del <strong>mínimo al máximo</strong>.</li>
                <li><strong>Identificación:</strong> Es crucial identificar claramente las rupturas de estructura para definir los extremos relevantes.</li>
             </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tus Notas de Aplicación:</label>
            <textarea 
              placeholder="Explica tu trazado y qué niveles de retroceso consideras más probables..."
              style={{
                width: '100%',
                minHeight: '100px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>

          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>Tanto Fibonacci como la estructura están intrínsecamente relacionados para entender una tendencia. Pulsa para ver el video explicativo.</em>
          </p>
        </div>
      ),
      options: [
        "He terminado mi trazado de Fibonacci y quiero ver la explicación y su fundamento."
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Cómo aplicar la secuencia de Fibonacci</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Descubre el fundamento detrás de esta herramienta y cómo se conecta con las rupturas de estructura:
            </p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/2109c70daf234a1da80c26e653878efe?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 6,
      title: "Análisis de Patrones en AUDUSD",
      desc: "Identificación de patrones como fallos en la tendencia principal.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Formación de Patrones sobre AUDUSD (1H)</h3>
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            Analiza el periodo desde el 1 de abril de 2024 hasta el 31 de mayo de 2024 en el gráfico de 1 hora. Recuerda que los patrones son, en esencia, fallos o interrupciones en la tendencia principal.
          </p>
          
          <DrawingCanvas src="/audusd-patrones.png" alt="Gráfico AUDUSD Patrones" />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'rgba(0, 168, 255, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
             <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>Objetivo del Ejercicio:</h4>
             <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Utiliza la herramienta de dibujo para marcar los patrones que identifiques. Busca esos puntos donde la tendencia se interrumpe y cambia el carácter del movimiento.
             </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tu Análisis Detallado:</label>
            <textarea 
              placeholder="Describe los fallos de tendencia que has encontrado y qué patrones representan..."
              style={{
                width: '100%',
                minHeight: '120px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>

          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>La comprensión de los patrones es el puente entre el análisis técnico y la ejecución estratégica. Pulsa para ver la solución.</em>
          </p>
        </div>
      ),
      options: [
        "He finalizado mi análisis de patrones y quiero ver la video-explicación."
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Solución: Formación de Patrones</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              En este video detallamos los fallos de tendencia y cómo se estructuran los patrones identificados en el AUDUSD:
            </p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/aa0e8f449aca4f69b0c4021f5ae2827f?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 7,
      title: "Patrones de Velas en AUDCHF",
      desc: "Identificación de aceleración, desaceleración e impulso en el gráfico diario.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Análisis de Velas en el Gráfico Diario (AUDCHF)</h3>
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            Busca patrones de velas específicos en el gráfico diario del par <strong>AUDCHF</strong> desde el 26 de septiembre de 2023 hasta hoy (7 de junio de 2024).
          </p>
          
          <DrawingCanvas src="/audchf-velas.png" alt="Gráfico AUDCHF Velas" />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'rgba(255, 94, 0, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
             <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>Tarea Técnica:</h4>
             <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                <li><strong>Identificar:</strong> Aceleración, desaceleración e impulso (idealmente vela envolvente).</li>
                <li><strong>Opcional:</strong> Marca los principales soportes y resistencias relevantes.</li>
             </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tus Observaciones:</label>
            <textarea 
              placeholder="Justifica los patrones encontrados (ej: 'Se observa una desaceleración clara seguida de un impulsovolvente...')"
              style={{
                width: '100%',
                minHeight: '100px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>

          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>Este es un ejercicio de varias partes. Guarda tus secciones indicadas para la próxima tarea. Pulsa para ver la solución inicial.</em>
          </p>
        </div>
      ),
      options: [
        "He identificado los patrones de velas y quiero ver la solución."
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Solución: Patrones de Velas y Estructura</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Analizamos la aceleración, desaceleración y el impulso envolvente en el AUDCHF:
            </p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/d07d5f47e23646fea1e32064a320c8be?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 8,
      title: "Estructura de Mercado: Impulsos y Pullbacks",
      desc: "Desafío semanal sobre la identificación de rupturas de estructura y cambios de tendencia.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Desafío: Ruptura de Estructura vs. Ruptura de Tendencia</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'rgba(255, 94, 0, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
             <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>Ruptura de Estructura vs. Ruptura de Tendencia en el Precio</h4>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                <div>
                   <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Ruptura de Estructura:</p>
                   <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>Ocurre cuando el precio continúa con la misma tendencia, es decir, sigue creando máximos más altos (en tendencia alcista) o mínimos más bajos (en tendencia bajista). Mantiene la dirección establecida.</p>
                </div>
                <div>
                   <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Ruptura de Tendencia:</p>
                   <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>Se produce cuando el precio cambia su dirección predominante, revirtiendo la tendencia actual. Por ejemplo, pasa de un movimiento alcista a uno bajista o viceversa.</p>
                </div>
             </div>
          </div>

          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            A continuación, encontrarás 6 imágenes. Debes indicar en cada una si la línea naranja representa o no una ruptura de mercado y justificar tu respuesta.
          </p>
          
          <div style={{ padding: '1rem', backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', fontStyle: 'italic' }}>Referencia Visual de Conceptos:</p>
             <DrawingCanvas src="/estructura-ref.png" alt="Referencia Ruptura vs Tendencia" />
          </div>

          <div style={{ marginTop: '1rem' }}>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '1rem' }}>Analiza las 6 imágenes del reto:</p>
            <GalleryCanvas 
              images={[
                "/estructura-1.png", 
                "/estructura-2.png", 
                "/estructura-3.png", 
                "/estructura-4.png", 
                "/estructura-5.png", 
                "/estructura-6.png"
              ]} 
              alt="Ejercicios de Estructura de Mercado" 
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tus Respuestas (1 al 6) y Justificación:</label>
            <textarea 
              placeholder="Ejemplo: 1. Sí, es ruptura de estructura porque... 2. No, es cambio de tendencia porque..."
              style={{
                width: '100%',
                minHeight: '150px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>

          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>Es vital clarificar el funcionamiento de los impulsos y los pullbacks. Una vez analizadas las 6 imágenes, pulsa para ver la corrección en video.</em>
          </p>
        </div>
      ),
      options: [
        "He analizado las 6 imágenes y redactado mi justificación."
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Solución en Video: Estructura de Mercado</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              En este video resolvemos el ejercicio de la semana, explicando detalladamente cada una de las 6 imágenes y por qué se consideran rupturas de estructura o cambios de tendencia.
            </p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/d47d146561b74f83b13c23010652df3e?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 9,
      title: "Fractalidad y Multitemporalidad",
      desc: "Análisis de la repetición de patrones en diferentes marcos temporales.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Desafío: Fractalidad en los Mercados</h3>
          
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            ¡Llegó el ejercicio de la semana! En esta ocasión, nos centraremos en la fractalidad y en cómo los patrones se repiten consistentemente en todas las temporalidades.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ color: 'var(--accent-color)', margin: 0, fontSize: '1rem' }}>Distribución de Gráficos:</h4>
                <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', paddingLeft: '1.2rem', margin: 0 }}>
                   <li><strong>S. Izquierda:</strong> Temporalidad mayor.</li>
                   <li><strong>I. Izquierda:</strong> Temporalidad análisis mayor.</li>
                   <li><strong>S. Derecha:</strong> Temporalidad análisis menor.</li>
                   <li><strong>I. Derecha:</strong> Gráfico de ejecución.</li>
                </ul>
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ color: 'var(--accent-color)', margin: 0, fontSize: '1rem' }}>Indicadores (EMAs):</h4>
                <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', paddingLeft: '1.2rem', margin: 0 }}>
                   <li><strong>Azul:</strong> EMA50 de temporalidad actual.</li>
                   <li><strong>Blanco:</strong> EMA50 de temporalidad mayor.</li>
                </ul>
             </div>
          </div>

          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            Realiza un análisis exhaustivo de lo que observas en este cuadrante multitemporal:
          </p>
          
          <DrawingCanvas src="/fractalidad.png" alt="Análisis de Fractalidad" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tu Análisis (Usa la plantilla de la sección "Ideas"):</label>
            <textarea 
              placeholder="Escribe aquí tu análisis detallado sobre la fractalidad y lo que observas en las 4 temporalidades..."
              style={{
                width: '100%',
                minHeight: '150px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      ),
      options: [
        "He completado mi análisis multitemporal."
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Solución y Valor de la Fractalidad</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1rem 0' }}>
              En este documento y video, explico el valor y el peso de la fractalidad en los mercados. No es necesario obsesionarse buscando patrones en múltiples temporalidades; este ejercicio tiene como único fin explicar cómo funciona la fractalidad.
            </p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/5dab4e79c447409abbc060daf183ba7b?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    }
  ],
  intermedio: [
    {
      id: 1,
      title: "Teoría de las Ondas de Elliott",
      desc: "Movimientos del Precio y Estrategias de TradingLab",
      question: "¿Cuántas ondas de Elliot hay teóricamente?",
      options: [
        "Dos ondas, Impulso y Pullback",
        "Tres ondas, siendo la tercera la de mayor movimiento",
        "Dos impulsos y tres pullbacks, siendo uno complejo",
        "Tres impulsos y dos pullbacks, siendo uno complejo"
      ],
      correctAnswer: 3,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Teoría de las Ondas de Elliott</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              La respuesta correcta es <strong>Tres impulsos y dos pullbacks, siendo uno de ellos complejo</strong>.
              La teoría de las Ondas de Elliott postula que el precio se mueve en una secuencia de cinco movimientos (ondas): impulsos (a favor de la tendencia) y pullbacks (retrocesos).
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--card-bg)', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #ff5e00' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h5 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Ondas 1 y 2</h5>
                <span style={{ fontSize: '0.85rem', color: '#ff5e00', backgroundColor: 'rgba(255, 94, 0, 0.1)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>Inicio y Retroceso Corto</span>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong>Onda 1 (Impulsiva):</strong> Indica el inicio de una nueva tendencia. Es difícil de identificar por la falta de información inicial. <br/>
                <span style={{ color: 'var(--accent-color)' }}><strong>Estrategia TradingLab:</strong> BLACK</span>
              </p>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '0.5rem' }}>
                <strong>Onda 2 (Pullback):</strong> Retroceso posterior a la Onda 1. Suele ser un movimiento corto.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--card-bg)', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #00a8ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h5 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Ondas 3 y 4</h5>
                <span style={{ fontSize: '0.85rem', color: '#00a8ff', backgroundColor: 'rgba(0, 168, 255, 0.1)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>Cuerpo y Complejidad</span>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong>Onda 3 (Impulsiva):</strong> Generalmente es la onda con mayor recorrido tras la confirmación clara. <br/>
                <span style={{ color: '#00a8ff' }}><strong>Estrategia TradingLab:</strong> Blue (1h) y RED (4h)</span>
              </p>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '0.5rem' }}>
                <strong>Onda 4 (Pullback):</strong> Tiende a ser un movimiento <strong>complejo</strong> debido a la entrada de traders por FOMO tras la gran onda 3.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--card-bg)', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #ff3366' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h5 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>Onda 5</h5>
                <span style={{ fontSize: '0.85rem', color: '#ff3366', backgroundColor: 'rgba(255, 51, 102, 0.1)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>Final del Ciclo</span>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Representa el movimiento final antes de revertir o reiniciar el ciclo. Suele ser igual o ligeramente superior a la Onda 3. <br/>
                <span style={{ color: '#ff3366' }}><strong>Estrategia TradingLab:</strong> Pink (4h)</span>
              </p>
            </div>
          </div>

          <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--card-border)', marginTop: '0.5rem' }}>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
               <strong>Aclaración Importante:</strong> La teoría de Elliott es una guía y no se cumple el 100% de las veces. Debe utilizarse como un factor de confluencia con otros análisis.
             </p>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Análisis de Estrategia en Gráfico",
      desc: "Análisis de estructura y toma de decisiones sobre el gráfico.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>¿Qué estrategia se puede dar en el siguiente gráfico?</h3>
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            Observa la tendencia, la posición respecto a la media móvil y el patrón de velas en las 3 temporalidades proporcionadas. Desarrolla tu análisis antes de elegir una opción.
          </p>
          
          <GalleryCanvas 
            images={["/analisis-1.png", "/analisis-2.png", "/analisis-3.png"]} 
            alt="Gráfico de Análisis de Estrategia" 
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tus Notas de Análisis:</label>
            <textarea 
              placeholder="Escribe aquí tu razonamiento (ej: Ruptura de estructura, rebote en EMA, etc.)..."
              style={{
                width: '100%',
                minHeight: '120px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>

          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>Selecciona la estrategia que mejor se ajuste al escenario planteado:</em>
          </p>
        </div>
      ),
      options: [
        "Blue A",
        "Red",
        "Green",
        "Blue C",
        "Black"
      ],
      correctAnswer: 3,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Video-Respuesta del Ejercicio</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Os compartimos un vídeo con la explicación detallada de la estrategia identificada en este escenario real de mercado.
            </p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/5507f786310c4be481eb922f832ed440?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Estrategia de Scalping en EURNZD",
      desc: "Análisis de operación real en temporalidades de Scalping.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Estrategia de Scalping en EURNZD: Análisis de Operación</h3>
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            A continuación, se detalla una operación de Scalping en el par <strong>EURNZD</strong> ejecutada el jueves 2 de mayo (entre las 3:00 AM y las 9:00 PM hora España).
          </p>
          
          <DrawingCanvas src="/scalping-eurnzd.png" alt="Gráfico Scalping EURNZD" />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'rgba(255, 94, 0, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
             <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>Análisis Comunitario:</h4>
             <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                ¿Qué tipo de operación logras identificar dentro del área marcada con el <strong>recuadro amarillo</strong>? Nos gustaría conocer los motivos que sustentan tu análisis.
             </p>
             <textarea 
              placeholder="Desarrolla aquí tu análisis exhaustivo..."
              style={{
                width: '100%',
                minHeight: '100px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical',
                marginTop: '0.5rem'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>

          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>Con un enfoque paciente, notarás que al basarte en movimientos diarios (DAY), el scalping puede ser mucho más sencillo. Pulsa para ver la explicación.</em>
          </p>
        </div>
      ),
      options: [
        "He terminado mi análisis y quiero ver la video-explicación."
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Análisis de Scalping: EURNZD</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Descubre por qué el scalping es accesible cuando se estructura correctamente. Aquí tienes el análisis detallado de la operación:
            </p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/1a6ea03ba7b34049a936c9c028e3881d?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Estrategias que Requieren un Patrón",
      desc: "Análisis sobre la necesidad y justificación de patrones específicos en la ejecución.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Estrategias de TradingLab que Requieren un Patrón: Su Crucial Justificación</h3>
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            ¿Qué estrategias de TradingLab necesitan un patrón específico para su ejecución? Y, fundamentalmente, ¿por qué es indispensable este requisito?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tus Reflexiones:</label>
            <textarea 
              placeholder="Escribe aquí tu análisis sobre por qué crees que los patrones son indispensables en ciertas estrategias..."
              style={{
                width: '100%',
                minHeight: '120px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>
          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>Reflexiona sobre la importancia de la confirmación visual antes de ejecutar. Una vez que tengas tu respuesta, pulsa para ver la justificación en video.</em>
          </p>
        </div>
      ),
      options: [
        "He completado mi reflexión y estoy listo para ver la explicación detallada."
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Justificación Médica de los Patrones</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Aquí tienes el video donde explicamos detalladamente qué estrategias requieren un patrón y por qué es indispensable para tu éxito en el trading:
            </p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/585a1794e64b4f36b04c120adc5e62f2?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "Estrategias con EMAs en AUDCHF",
      desc: "Identificación de estrategias de TradingLab usando medias móviles exponenciales.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Análisis de EMA sobre AUDCHF</h3>
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            Para esta actividad, desciende a las temporalidades de 1 hora o 4 horas con las EMAs activadas e identifica qué estrategia de TradingLab se está desarrollando, en caso de que se observe alguna formación sobre el par AUDCHF.
          </p>
          
          <DrawingCanvas src="/audchf-estrategia.png" alt="Gráfico AUDCHF con Estrategia EMA" />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'rgba(255, 94, 0, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
             <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>Sugerencia de Análisis:</h4>
             <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Fíjate en el comportamiento del precio respecto a las EMAs y si existe alguna confluencia con niveles de soporte/resistencia o patrones de velas vistos anteriormente.
             </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tu Justificación de Estrategia:</label>
            <textarea 
              placeholder="¿Qué estrategia identificas y por qué? (ej: 'Rebote en EMA50 sugiriendo Red...', 'Ruptura de EMA sugiriendo Blue...')"
              style={{
                width: '100%',
                minHeight: '100px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>

          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>Identificar la estrategia correcta es el primer paso para una ejecución sin dudas. Pulsa para ver la solución en video.</em>
          </p>
        </div>
      ),
      options: [
        "He identificado la estrategia y quiero ver la video-explicación."
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Solución: Estrategias TradingLab y EMAs</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Aquí tienes la explicación detallada de la estrategia que se está desarrollando en este escenario sobre el AUDCHF:
            </p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/b5a264901b1e4c9b98727f74a1b2b306?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 6,
      title: "Análisis de Operación: EURUSD (Sergio R.)",
      desc: "Análisis técnico exhaustivo de una operación compartida por la comunidad.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Análisis de Operación Real (EURUSD)</h3>
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            Tras finalizar la serie anterior, analizaremos una operación muy particular compartida por <strong>@Sergio R.</strong> en el par EURUSD.
          </p>
          
          <DrawingCanvas src="/eurusd-sergio.png" alt="Análisis EURUSD Sergio R." />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'rgba(0, 168, 255, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
             <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem' }}>Tu misión de análisis (Estilo IDEAS):</h4>
             <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                <li><strong>Estrategia:</strong> Identifica qué estrategia es.</li>
                <li><strong>Justificación:</strong> Explica los motivos de tu clasificación.</li>
                <li><strong>Gestión:</strong> Indica dónde ubicarías el Stop Loss (SL) y por qué.</li>
             </ul>
             <p style={{ color: 'var(--accent-color)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 600 }}>
                💡 ¡Utiliza las nuevas herramientas 'Largo' o 'Corto' de la barra de dibujo para marcar tu entrada y stop!
             </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tu Análisis Detallado:</label>
            <textarea 
              placeholder="Escribe aquí tu análisis completo de la operación..."
              style={{
                width: '100%',
                minHeight: '130px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-family)',
                fontSize: '0.95rem',
                outline: 'none',
                resize: 'vertical'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
          </div>
        </div>
      ),
      options: [
        "He finalizado mi análisis y diseño de posición."
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Solución: Análisis de la Operación de Sergio R.</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Aquí tienes la explicación detallada sobre la estrategia, motivos y la ubicación óptima del SL para este escenario:
            </p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/85293f5a29d1440d93c29c6079f98283?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 7,
      title: "Reflexión: Estrategias Favoritas y Seguridad",
      desc: "Compartir y analizar perspectivas personales sobre las estrategias de TradingLab.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Preferencias y Seguridad en TradingLab</h3>
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
             Es momento de reflexionar sobre lo aprendido. Queremos conocer vuestra perspectiva personal para enriquecer el análisis colectivo.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>1. ¿Cuál es vuestra estrategia favorita y por qué?</label>
              <textarea 
                placeholder="Nombra la estrategia que más disfrutas operar y describe los motivos..."
                style={{
                  width: '100%', minHeight: '100px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', fontSize: '0.95rem', outline: 'none', resize: 'vertical'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>2. ¿Qué estrategia consideráis más segura (menor riesgo) y por qué?</label>
              <textarea 
                placeholder="Indica la estrategia que percibes como más conservadora y justifica tu elección..."
                style={{
                  width: '100%', minHeight: '100px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', fontSize: '0.95rem', outline: 'none', resize: 'vertical'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>
          </div>

          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>Compartir puntos de vista nos ayuda a lograr una mejor comprensión colectiva. Una vez que hayas reflexionado, mira el video respuesta.</em>
          </p>
        </div>
      ),
      options: [
        "He completado mi reflexión y quiero ver la video-respuesta."
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Video-Respuesta: Perspectivas de Estrategias</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Es fundamental revisar las respuestas de vuestros compañeros y entender su perspectiva. Aquí tienes el video dedicado a este análisis:
            </p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/d47d146561b74f83b13c23010652df3e?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    }
  ],
  avanzado: [
    {
      id: 1,
      title: "Temporalidad de Ejecución: Estrategia Blue",
      desc: "Marco temporal adecuado para operar la estrategia Blue en diferentes estilos.",
      question: "¿Cuál es el marco temporal adecuado para operar la estrategia \"Blue\"?",
      options: [
        "Day Trading: Diario, Swing Trading: Mensual.",
        "Day Trading: 4 horas, Swing Trading: 1 Semana.",
        "Day Trading: 1 hora, Swing Trading: Diario.",
        "Day Trading: 5 min, Swing Trading: 1 hora."
      ],
      correctAnswer: 3,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Estrategia Blue (A, B o C)</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              La respuesta correcta es <strong>5 minutos para Day Trading y 1 hora para Swing Trading</strong>. 
            </p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '0.5rem' }}>
              Esta estrategia se centra en capturar la <strong>onda impulsiva número 3</strong>, que es la más significativa. Esto se logra inicialmente analizando la ruptura de la EMA50 (Diaria para Swing Trading y Horaria para Day Trading).
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--card-bg)', padding: '1.25rem', borderRadius: '8px', borderTop: '4px solid #00a8ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Activity size={18} style={{ color: '#00a8ff' }} />
                <h5 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>Swing Trading</h5>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li><strong>Análisis:</strong> Ruptura EMA50 Diaria</li>
                <li><strong>Ejecución:</strong> Temporalidad de 1 Hora</li>
              </ul>
            </div>

            <div style={{ backgroundColor: 'var(--card-bg)', padding: '1.25rem', borderRadius: '8px', borderTop: '4px solid #ff5e00' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <PlayCircle size={18} style={{ color: '#ff5e00' }} />
                <h5 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>Day Trading</h5>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li><strong>Análisis:</strong> Ruptura EMA50 Horaria</li>
                <li><strong>Ejecución:</strong> Temporalidad de 5 Minutos</li>
              </ul>
            </div>
          </div>

          <div style={{ padding: '1.25rem', backgroundColor: 'rgba(0, 168, 255, 0.05)', borderRadius: '8px', border: '1px dashed #00a8ff' }}>
             <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '0.5rem' }}>Proceso de Entrada:</p>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
               La entrada se ejecuta tras la <strong>ruptura de la diagonal</strong> y, si se presenta, de la <strong>EMA50 en temporalidades inferiores</strong> (1h para Swing / 5m para Day).
             </p>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Plan de Trading: Cimiento y Crecimiento",
      desc: "Reflexión profunda sobre la importancia y componentes de un Plan de Trading sólido.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Cimentando vuestro Conocimiento</h3>
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
             Ante las dudas surgidas sobre el <strong>Plan de Trading</strong>, aprovecharemos este ejercicio para compartir perspectivas entre veteranos y recién llegados.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>1. ¿Qué representa el Plan de Trading para ti?</label>
              <textarea 
                placeholder="Define tu percepción del Plan de Trading (ej: hoja de ruta, escudo emocional...)"
                style={{
                  width: '100%', minHeight: '80px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', fontSize: '0.95rem', outline: 'none', resize: 'vertical'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>2. Menciona tres componentes esenciales que debe incluir.</label>
              <textarea 
                placeholder="Enumera los 3 elementos que consideras innegociables en tu plan..."
                style={{
                  width: '100%', minHeight: '80px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', fontSize: '0.95rem', outline: 'none', resize: 'vertical'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>3. Para veteranos: ¿Qué mejoras has notado desde que lo sigues?</label>
              <textarea 
                placeholder="Comparte la diferencia en tu operativa antes y después del Plan de Trading..."
                style={{
                  width: '100%', minHeight: '100px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-family)', fontSize: '0.95rem', outline: 'none', resize: 'vertical'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
              />
            </div>
          </div>

          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>Recuerda que profundizaremos en este tema en el directo de mañana. Pulsa abajo para ver una breve resolución.</em>
          </p>
        </div>
      ),
      options: [
        "He completado mi reflexión y quiero ver la video-solución."
      ],
      correctAnswer: 0,
      explanation: (
        <div className="explanation-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 0.5rem 0' }}>Video-Solución: Introducción al TradingPlan</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              Aquí tienes un breve video introductorio. Mañana en el directo terminaremos de pulir todos los detalles del Plan de Trading:
            </p>
          </div>
          
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', backgroundColor: 'var(--bg-color)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
               <iframe 
                  src="https://www.loom.com/embed/71c223228305447a986fdb57f0676ba7?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true" 
                  frameBorder="0" 
                  webkitAllowFullScreen={true}
                  mozAllowFullScreen={true}
                  allowFullScreen={true}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
               ></iframe>
            </div>
          </div>
        </div>
      )
    }
  ]
};

const levels = [
  { id: 'basico', name: 'Básico', tag: 'N1', desc: 'Introducción a conceptos fundamentales' },
  { id: 'intermedio', name: 'Intermedio', tag: 'N2', desc: 'Estrategias y análisis técnico' },
  { id: 'avanzado', name: 'Avanzado', tag: 'N3', desc: 'Gestión de riesgo avanzada y psicología' }
];

function App() {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const startLevel = (levelId) => {
    setSelectedLevel(levelId);
    setSelectedTopicId(null);
  };

  const startTopic = (topicId) => {
    setSelectedTopicId(topicId);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setShowResult(false);
    setShowExplanation(false);
    setScore(0);
  };

  const handleOptionSelect = (index) => {
    setSelectedOption(index);
  };

  const handleNextQuestion = () => {
    if (!showExplanation) {
      const isCorrect = selectedOption === currentQuestions[currentQuestionIndex].correctAnswer;
      if (isCorrect) setScore(score + 1);
      setShowExplanation(true);
    } else {
      if (currentQuestionIndex < currentQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedOption(null);
        setShowExplanation(false);
      } else {
        setShowResult(true);
        setShowExplanation(false);
      }
    }
  };

  const returnToDashboard = () => {
    setSelectedLevel(null);
    setSelectedTopicId(null);
  };

  const returnToTopics = () => {
    setSelectedTopicId(null);
  };

  // The active "exercises" flow now only maps array with the single selected topic
  const activeLevelQuestions = selectedLevel ? questions[selectedLevel] : [];
  const currentQuestions = selectedTopicId ? activeLevelQuestions.filter(q => q.id === selectedTopicId) : [];

  return (
    <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      {/* Dashboard View */}
      {!selectedLevel && (
        <>
          <header style={{ marginBottom: '3rem' }}>
            <h1 className="header-title" style={{ color: 'var(--accent-color)', fontWeight: 600, fontSize: '2.5rem' }}>
              <span className="header-logo">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-45deg)' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </span>
              Trading Mastery
            </h1>
            <p className="header-desc" style={{ fontSize: '1.1rem', color: '#88746c', maxWidth: '600px', fontWeight: 500 }}>
              "Trading Mastery" es una formación diseñada para desarrollar habilidades y conocimientos
              necesarios para convertirte en un trader exitoso. A través de un enfoque en tres pilares
              esenciales: Contexto Profesional, Conocimientos y Habilidades, y Ser Trader, esta formación te
              proporcionará las herramientas necesarias para operar con confianza y consistencia en los
              mercados financieros.
            </p>
          </header>

          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Fases</h2>

            <div className="progress-container" style={{ position: 'absolute', right: 0, top: '-2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span className="progress-text" style={{ fontSize: '0.9rem', color: '#a03b1c', fontWeight: 600 }}>Progreso</span>
              <span className="progress-percentage" style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--accent-color)', lineHeight: 0.9 }}>
                0<span className="progress-percent-symbol" style={{ fontSize: '2rem', verticalAlign: 'baseline' }}>%</span>
              </span>
            </div>
          </div>

          <div className="level-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {levels.map((level) => (
              <div
                key={level.id}
                className="level-card"
                onClick={() => startLevel(level.id)}
                style={{ padding: '1.5rem', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div className="level-card-header" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span className="level-badge" style={{ color: 'var(--accent-color)' }}>{level.tag}</span>
                  <ArrowDownCircle size={20} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <p style={{ color: '#88746c', fontSize: '0.85rem', marginBottom: '0.25rem', fontWeight: 600 }}>0/1 Módulos</p>
                  <h3 className="level-title" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{level.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Topics View */}
      {selectedLevel && !selectedTopicId && (
        <div className="exercise-section" style={{ padding: 0, background: 'transparent', border: 'none' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <button
              onClick={returnToDashboard}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ArrowLeft size={20} /> Volver al Inicio
            </button>
          </div>
          
          <div style={{ marginBottom: '2.5rem' }}>
             <h2 style={{ fontSize: '2rem', color: 'var(--accent-color)', fontWeight: 700, marginBottom: '0.5rem' }}>Selecciona un tema para practicar</h2>
             <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Explora los ejercicios disponibles para el nivel {levels.find(l => l.id === selectedLevel)?.name}.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {activeLevelQuestions.map((topic) => (
              <div 
                key={topic.id} 
                onClick={() => startTopic(topic.id)}
                style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '1.5rem', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--accent-color)'; e.currentTarget.style.boxShadow = '0 10px 20px -10px rgba(0, 0, 0, 0.5)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(255, 94, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', flexShrink: 0 }}>
                   <BookOpen size={24} />
                </div>
                <div style={{ flex: 1 }}>
                   <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.4rem', fontWeight: 600 }}>{topic.title}</h3>
                   <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>{topic.desc}</p>
                </div>
                <div style={{ alignSelf: 'center', color: 'var(--accent-color)', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                   Practicar <PlayCircle size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exercises View */}
      {selectedTopicId && !showResult && currentQuestions.length > 0 && (
        <div className="exercise-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <button
              onClick={returnToTopics}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ArrowLeft size={20} /> Volver a Temas
            </button>
            <div className="exercise-header" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Nivel {levels.find(l => l.id === selectedLevel)?.name}: </span>
              <span className="exercise-title text-accent">{currentQuestions[0].title}</span>
            </div>
          </div>

          <div className="question-text">
            {currentQuestions[currentQuestionIndex].question}
          </div>

          <div className="options-container">
            {currentQuestions[currentQuestionIndex].options.map((option, index) => {
              let optionClass = `option-box ${selectedOption === index ? 'selected' : ''}`;
              if (showExplanation) {
                 if (index === currentQuestions[currentQuestionIndex].correctAnswer) {
                    optionClass += ' correct';
                 } else if (selectedOption === index) {
                    optionClass += ' incorrect';
                 }
              }
              return (
                <div
                  key={index}
                  className={optionClass}
                  onClick={() => !showExplanation && handleOptionSelect(index)}
                  style={{ cursor: showExplanation ? 'default' : 'pointer' }}
                >
                  <div className="radio-circle">
                    <div className="radio-inner"></div>
                  </div>
                  <span className="option-text">{option}</span>
                </div>
              );
            })}
          </div>

          {showExplanation && (
            <div className="explanation-box" style={{ marginTop: '2.5rem', padding: '2rem', backgroundColor: 'var(--card-hover)', borderRadius: '12px', border: '1px solid var(--card-border)', animation: 'fadeIn 0.5s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                 {selectedOption === currentQuestions[currentQuestionIndex].correctAnswer ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e', fontWeight: 'bold', fontSize: '1.25rem' }}>
                       <CheckCircle2 size={24} /> ¡Respuesta Correcta!
                    </div>
                 ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 'bold', fontSize: '1.25rem' }}>
                       <CircleDot size={24} /> Respuesta Incorrecta
                    </div>
                 )}
              </div>
              {currentQuestions[currentQuestionIndex].explanation || (
                 <p style={{ color: 'var(--text-secondary)' }}>La respuesta correcta es: {currentQuestions[currentQuestionIndex].options[currentQuestions[currentQuestionIndex].correctAnswer]}</p>
              )}
            </div>
          )}

          <button
            className="btn-primary"
            disabled={selectedOption === null}
            onClick={handleNextQuestion}
          >
            {!showExplanation 
               ? 'Comprobar Respuesta' 
               : (currentQuestionIndex < currentQuestions.length - 1 ? 'Siguiente Pregunta' : 'Finalizar Ejercicio')
            }
          </button>
        </div>
      )}

      {/* Results View */}
      {showResult && (
        <div className="exercise-section" style={{ textAlign: 'center', padding: '4rem 0' }}>
          <CheckCircle2 color="var(--accent-color)" size={64} style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>¡Ejercicio Completado!</h2>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Tu puntuación: <strong style={{ color: 'var(--text-primary)' }}>{score}</strong> de {currentQuestions.length}
          </p>
          <button className="btn-primary" onClick={returnToTopics}>
            Volver a Temas
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
