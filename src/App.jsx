import React, { useState, useRef, useEffect } from 'react';
import { ArrowDownCircle, ArrowRight, ArrowLeft, CheckCircle2, CircleDot, PenTool, Eraser, Minus, Type, Layers, Undo, Activity, Maximize, Minimize, BookOpen, PlayCircle } from 'lucide-react';
import './index.css';

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
        const y = y1 + diffY * lvl;
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
      return; // Handled by blur/enter on the input
    }
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    
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
          // 6 points total
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
    }
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || !currentElement) return;
    const { x, y } = getCoordinates(e);
    
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
    }
  };

  const stopDrawing = (e) => {
    e.preventDefault();
    if (tool === 'elliot') return; // let mousedown handle the progression for elliot waves
    if (isDrawing && currentElement) {
      setElements(prev => [...prev, currentElement]);
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
    const elem = containerRef.current.parentElement; // The whole DrawingCanvas component wrapper
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

  const ToolBtn = ({ t, icon: Icon, label }) => (
    <button
      onClick={() => handleToolChange(t)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid', borderColor: tool === t ? 'var(--card-border)' : 'transparent', background: tool === t ? 'rgba(255, 94, 0, 0.05)' : 'transparent',
        color: tool === t ? 'var(--accent-color)' : 'var(--text-secondary)', padding: '0.5rem 0.8rem', borderRadius: '6px', cursor: 'pointer',
        fontSize: '0.9rem', transition: 'all 0.2s', fontWeight: tool === t ? 600 : 500
      }}
      title={label}
      onMouseEnter={(e) => tool !== t && (e.currentTarget.style.backgroundColor = 'var(--card-hover)')}
      onMouseLeave={(e) => tool !== t && (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <Icon size={16} /> <span style={{display: 'none', '@media (min-width: 768px)': {display: 'inline'}}}>{label}</span>
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* TradingView-style Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'var(--card-bg)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
        
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <ToolBtn t="line" icon={Minus} label="Línea Recta" />
          <ToolBtn t="fibo" icon={Layers} label="Fibonacci" />
          <ToolBtn t="elliot" icon={Activity} label="Ondas Elliot" />
          <ToolBtn t="pen" icon={PenTool} label="Resaltador" />
          <ToolBtn t="text" icon={Type} label="Texto" />
          
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
          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>Es fundamental recordar que la delimitación de estos niveles es subjetiva. Por lo tanto, se requiere justificar la elección de cada una de las líneas trazadas en el gráfico.</em>
          </p>
        </div>
      ),
      options: [
        "He completado el trazado en mi propio gráfico y estoy listo para revisar la solución."
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
      title: "Teoría de las Ondas de Elliott",
      desc: "Análisis detallado y aplicación interactiva en el gráfico mensual de GBPUSD.",
      question: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ color: 'var(--accent-color)', fontSize: '1.4rem', margin: 0 }}>Análisis Detallado de Ondas de Elliott en GBPUSD (Gráfico Mensual)</h3>
          <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
            El propósito de este material es ofrecer una explicación exhaustiva y desarrollada sobre la aplicación de la Teoría de Ondas de Elliott al par de divisas GBPUSD, utilizando el gráfico mensual como marco temporal.
          </p>
          <DrawingCanvas src="/gbpusd.png" alt="Gráfico Mensual GBPUSD" />
          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
            <em>Utiliza la herramienta interactiva de Ondas de Elliott para trazar las 5 ondas impulsivas sobre el gráfico y evalúa si lograste detectar correctamente el ciclo.</em>
          </p>
        </div>
      ),
      options: [
        "Finalicé mi análisis y estoy listo para ver el video correctivo."
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
    }
  ],
  intermedio: [
    {
      id: 1,
      title: "Repaso de Estilos de Trading",
      desc: "Profundizando en los estilos de trading y experiencias frente al mercado.",
      question: "¿Qué estilo de trading requiere mayor concentración y experiencia?",
      options: [
        "Scalping",
        "Day trading",
        "Swing trading",
        "Position trading"
      ],
      correctAnswer: 0
    }
  ],
  avanzado: [
    {
      id: 1,
      title: "Indicadores de Volatilidad",
      desc: "Análisis técnico utilizando indicadores para comprender la volatilidad en activos.",
      question: "¿Qué indicador técnico se utiliza para medir la volatilidad de un activo?",
      options: [
        "Media Móvil Simple (SMA)",
        "Bandas de Bollinger",
        "Índice de Fuerza Relativa (RSI)",
        "Volumen de operaciones"
      ],
      correctAnswer: 1
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
