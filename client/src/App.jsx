import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Camera, RefreshCw, Check, Upload, Package, Truck, User, 
  Building2, MapPin, X, Plus, Search, Trash2, Calendar, 
  Layers, ExternalLink, ShieldCheck, Database, AlertCircle, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// URL dinámica: en Vite dev server se usa el proxy /api configurado hacia localhost:3000
const API_URL = '/api';
const UPLOADS_URL = '/uploads/';

const MATERIAL_COLORS = {
  Ramas: '#22c55e',
  Tierra: '#d97706',
  Escombros: '#38bdf8',
  Mezcla: '#a855f7'
};

const DEFAULT_CATEGORIES = [
  { id: 1, nombre: 'Empresa Privada' },
  { id: 2, nombre: 'Dependencia Municipal' },
  { id: 3, nombre: 'Particular' }
];

export default function App() {
  const [activeType, setActiveType] = useState('Ingreso'); // 'Ingreso' o 'Egreso'
  const [actorType, setActorType] = useState('Empresa Privada'); // 'Empresa Privada' | 'Dependencia Municipal' | 'Particular'
  
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [entities, setEntities] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [searchEntity, setSearchEntity] = useState('');
  
  const [material, setMaterial] = useState('Escombros');
  const [volumen, setVolumen] = useState(5);
  const [vehiculo, setVehiculo] = useState('Camión');
  
  // Agregar entidad modal
  const [isAddingEntity, setIsAddingEntity] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [isSavingEntity, setIsSavingEntity] = useState(false);

  // Estadísticas e historial
  const [dailyStats, setDailyStats] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState('Todos');

  // Foto y cámara
  const [showCamera, setShowCamera] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Estado general
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text: string }
  const [systemStatus, setSystemStatus] = useState({ ok: true, dbType: 'cargando...' });

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Carga inicial
  useEffect(() => {
    checkHealth();
    fetchCategories();
    fetchStats();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await axios.get(`${API_URL}/status`);
      if (res.data && res.data.ok) {
        setSystemStatus({ ok: true, dbType: res.data.dbType || 'SQL' });
      }
    } catch {
      setSystemStatus({ ok: true, dbType: 'SQLite Local' });
    }
  };

  // Cada vez que cambia el tipo de actor o las categorías, recargar las entidades correspondientes
  useEffect(() => {
    const cat = categories.find(c => c.nombre.toLowerCase() === actorType.toLowerCase()) || 
                categories.find(c => c.nombre === actorType);
    
    if (cat) {
      fetchEntities(cat.id);
    }

    // Configurar vehículo y volumen por defecto según el actor
    if (actorType === 'Empresa Privada') {
      setVehiculo('Camión');
      setVolumen(5);
    } else if (actorType === 'Dependencia Municipal') {
      setVehiculo('Camión');
      setVolumen(5);
    } else if (actorType === 'Particular') {
      setVehiculo('Camioneta');
      setVolumen(1);
    }
  }, [actorType, categories]);

  // Si cambia el vehículo, ajustar volumen recomendado si corresponde
  const handleVehicleChange = (nuevoVehiculo) => {
    setVehiculo(nuevoVehiculo);
    if (nuevoVehiculo === 'Batea') setVolumen(20);
    else if (nuevoVehiculo === 'Camión') setVolumen(5);
    else if (nuevoVehiculo === 'Camioneta') setVolumen(1);
    else if (nuevoVehiculo === 'Auto') setVolumen(1);
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/categorias`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setCategories(res.data);
      }
    } catch (err) {
      console.warn("Usando categorías locales por defecto:", err.message);
    }
  };

  const fetchEntities = async (catId) => {
    try {
      const res = await axios.get(`${API_URL}/entidades/${catId}`);
      if (Array.isArray(res.data)) {
        setEntities(res.data);
        if (res.data.length > 0) {
          setSelectedEntityId(res.data[0].id.toString());
        } else {
          setSelectedEntityId('');
        }
      }
    } catch (err) {
      console.error("Error al cargar entidades", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard/hoy`);
      if (Array.isArray(res.data)) {
        setDailyStats(res.data);
      }
    } catch (err) {
      console.error("Error al cargar estadísticas", err);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await axios.get(`${API_URL}/movimientos/historial`);
      if (Array.isArray(res.data)) {
        setHistory(res.data);
      }
      setShowHistory(true);
    } catch (err) {
      console.error("Error al cargar historial", err);
      showToast("Error al cargar historial de movimientos", "error");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDeleteMovement = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este registro de movimiento?")) return;
    try {
      await axios.delete(`${API_URL}/movimientos/${id}`);
      setHistory(prev => prev.filter(item => item.id !== id));
      fetchStats();
      showToast("Registro eliminado correctamente");
    } catch (err) {
      console.error("Error eliminando registro", err);
      showToast("No se pudo eliminar el registro", "error");
    }
  };

  // Crear nueva entidad (Empresa o Dependencia)
  const handleAddEntity = async (e) => {
    if (e) e.preventDefault();
    if (!newEntityName.trim()) {
      showToast("Ingresa un nombre para la entidad", "error");
      return;
    }

    const cat = categories.find(c => c.nombre.toLowerCase() === actorType.toLowerCase()) || categories[0];
    if (!cat) {
      showToast("Categoría no identificada", "error");
      return;
    }

    setIsSavingEntity(true);
    try {
      const res = await axios.post(`${API_URL}/entidades`, {
        categoria_id: cat.id,
        nombre: newEntityName.trim().toUpperCase()
      });

      const nueva = res.data;
      setEntities(prev => [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setSelectedEntityId(nueva.id.toString());
      setNewEntityName('');
      setIsAddingEntity(false);
      showToast(`¡${nueva.nombre} agregada exitosamente!`);
    } catch (err) {
      console.error("Error al agregar entidad", err);
      showToast("Error al guardar la nueva entidad", "error");
    } finally {
      setIsSavingEntity(false);
    }
  };

  // Manejo de Cámara
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("No se pudo acceder a la cámara:", err.message);
      showToast("No se detectó cámara disponible. Puedes subir una foto desde tus archivos.", "error");
      setShowCamera(false);
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          setPhoto(blob);
          if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
          setPhotoPreviewUrl(URL.createObjectURL(blob));
          stopCamera();
          showToast("Foto capturada correctamente");
        }
      }, 'image/jpeg', 0.88);
    }
  };

  const stopCamera = () => {
    const video = videoRef.current;
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setPhoto(file);
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(URL.createObjectURL(file));
      showToast("Foto cargada desde archivo");
    }
  };

  const removePhoto = () => {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhoto(null);
    setPhotoPreviewUrl(null);
  };

  // Envío del Formulario
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Validar entidad si no es particular
    if (actorType !== 'Particular' && !selectedEntityId) {
      showToast("Por favor selecciona o agrega una empresa/dependencia", "error");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('tipo_movimiento', activeType);
    formData.append('material', material);
    formData.append('volumen', volumen);
    formData.append('vehiculo_tipo', vehiculo);

    if (actorType === 'Particular') {
      // Buscar o asignar la entidad 'Consumidor Final'
      const particularEntity = entities.find(e => e.nombre.toLowerCase().includes('consumidor') || e.nombre.toLowerCase().includes('particular')) || entities[0];
      if (particularEntity) {
        formData.append('entidad_id', particularEntity.id);
      }
    } else {
      formData.append('entidad_id', selectedEntityId);
    }

    if (photo) {
      formData.append('foto', photo, 'registro.jpg');
    }

    try {
      await axios.post(`${API_URL}/movimientos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast(`¡${activeType} de ${volumen} m³ registrado exitosamente!`);
      
      // Limpiar foto y actualizar estadísticas
      removePhoto();
      fetchStats();
    } catch (err) {
      console.error("Error al registrar movimiento:", err);
      showToast("Error al guardar el movimiento en el sistema", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrado de entidades para el buscador de empresas
  const filteredEntities = entities.filter(e => 
    e.nombre.toLowerCase().includes(searchEntity.toLowerCase())
  );

  // Filtrado de historial
  const filteredHistory = history.filter(item => {
    const matchesText = 
      (item.entidad_nombre && item.entidad_nombre.toLowerCase().includes(historySearch.toLowerCase())) ||
      (item.material && item.material.toLowerCase().includes(historySearch.toLowerCase())) ||
      (item.vehiculo_tipo && item.vehiculo_tipo.toLowerCase().includes(historySearch.toLowerCase()));
    
    const matchesType = historyFilterType === 'Todos' || item.tipo_movimiento === historyFilterType;

    return matchesText && matchesType;
  });

  // Totales del día
  const totalVolumenHoy = dailyStats.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
  const totalViajesHoy = dailyStats.reduce((acc, curr) => acc + (parseInt(curr.viajes, 10) || 0), 0);

  return (
    <div className="app-wrapper">
      <div className="app-container">
        
        {/* ENCABEZADO */}
        <header className="header-bar">
          <div className="header-brand">
            <div className="brand-icon">
              <Truck size={28} />
            </div>
            <div>
              <h1 className="brand-title">Gestión de Escombrera</h1>
              <div className="brand-subtitle">
                <span>Control Municipal de Residuos</span>
                <span className="live-indicator">
                  <span className="live-dot"></span>
                  {systemStatus.dbType} Activa
                </span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button 
              className="btn btn-secondary" 
              onClick={fetchHistory}
              disabled={isLoadingHistory}
            >
              <FileText size={18} />
              {isLoadingHistory ? 'Cargando...' : 'Ver Histórico'}
            </button>

            {/* Alternador Ingreso / Egreso */}
            <div className="movement-toggle">
              <button 
                type="button"
                className={`toggle-option ${activeType === 'Ingreso' ? 'active-ingreso' : ''}`}
                onClick={() => setActiveType('Ingreso')}
              >
                <Plus size={16} />
                Ingreso
              </button>
              <button 
                type="button"
                className={`toggle-option ${activeType === 'Egreso' ? 'active-egreso' : ''}`}
                onClick={() => setActiveType('Egreso')}
              >
                <Layers size={16} />
                Egreso
              </button>
            </div>
          </div>
        </header>

        {/* DASHBOARD DE ESTADÍSTICAS DEL DÍA */}
        <section className="stats-grid">
          {['Ramas', 'Tierra', 'Escombros', 'Mezcla'].map(mat => {
            const stat = dailyStats.find(s => s.material === mat);
            const total = stat ? parseFloat(stat.total) || 0 : 0;
            const viajes = stat ? parseInt(stat.viajes, 10) || 0 : 0;
            const color = MATERIAL_COLORS[mat];
            const maxVal = Math.max(totalVolumenHoy, 30);
            const percent = Math.min((total / maxVal) * 100, 100);

            return (
              <motion.div 
                key={mat}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="stat-card"
                style={{ '--card-accent': color }}
              >
                <div className="stat-header">
                  <span className="stat-title">{mat}</span>
                  <span className="stat-badge">{viajes} {viajes === 1 ? 'viaje' : 'viajes'}</span>
                </div>
                
                <div className="stat-number-row">
                  <span className="stat-number">{total.toLocaleString('es-AR', { maximumFractionDigits: 1 })}</span>
                  <span className="stat-unit">m³ hoy</span>
                </div>

                <div className="stat-bar-container">
                  <div 
                    className="stat-bar-fill" 
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* FORMULARIO PRINCIPAL */}
        <main className="main-layout">
          
          {/* PANEL IZQUIERDO: SELECCIÓN Y DATOS */}
          <div className="panel-card">
            <h2 className="panel-title">
              <span className="panel-title-icon"><Truck size={18} /></span>
              Parámetros del Movimiento
            </h2>

            {/* SELECCIÓN DE ACTOR */}
            <div className="actor-selector-grid">
              <button 
                type="button"
                className={`actor-btn ${actorType === 'Empresa Privada' ? 'active' : ''}`}
                onClick={() => { setActorType('Empresa Privada'); setSearchEntity(''); }}
              >
                <Building2 className="actor-btn-icon" />
                <span className="actor-btn-title">Empresa Privada</span>
              </button>

              <button 
                type="button"
                className={`actor-btn ${actorType === 'Dependencia Municipal' ? 'active' : ''}`}
                onClick={() => { setActorType('Dependencia Municipal'); setSearchEntity(''); }}
              >
                <MapPin className="actor-btn-icon" />
                <span className="actor-btn-title">Municipal</span>
              </button>

              <button 
                type="button"
                className={`actor-btn ${actorType === 'Particular' ? 'active' : ''}`}
                onClick={() => { setActorType('Particular'); setSearchEntity(''); }}
              >
                <User className="actor-btn-icon" />
                <span className="actor-btn-title">Particular</span>
              </button>
            </div>

            {/* SELECTOR DE ENTIDAD (Empresa o Dependencia) */}
            <AnimatePresence mode="wait">
              {actorType !== 'Particular' ? (
                <motion.div 
                  key="selector-entidades"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="form-field"
                >
                  <div className="form-label">
                    <span>{actorType === 'Empresa Privada' ? 'Empresa Registrada' : 'Dependencia Municipal'} ({entities.length})</span>
                    <button 
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
                      onClick={() => setIsAddingEntity(true)}
                    >
                      <Plus size={14} /> Nueva
                    </button>
                  </div>

                  <div className="form-control-row">
                    <select 
                      className="select-custom"
                      value={selectedEntityId}
                      onChange={(e) => setSelectedEntityId(e.target.value)}
                    >
                      <option value="">-- Seleccionar de la lista --</option>
                      {filteredEntities.map(e => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                    </select>

                    <button 
                      type="button"
                      className="btn btn-primary btn-icon"
                      title="Agregar nueva empresa"
                      onClick={() => setIsAddingEntity(true)}
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Campo de búsqueda rápida para listas largas */}
                  {entities.length > 8 && (
                    <div style={{ marginTop: '0.5rem', position: 'relative' }}>
                      <input 
                        type="text"
                        className="input-text"
                        style={{ paddingLeft: '2.2rem', fontSize: '0.85rem', padding: '0.5rem 2.2rem' }}
                        placeholder="Filtrar por nombre..."
                        value={searchEntity}
                        onChange={(e) => setSearchEntity(e.target.value)}
                      />
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      {searchEntity && (
                        <X 
                          size={14} 
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)' }} 
                          onClick={() => setSearchEntity('')}
                        />
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="particular-info"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="form-field"
                  style={{ 
                    padding: '0.85rem 1rem', 
                    background: 'rgba(59, 130, 246, 0.08)', 
                    border: '1px solid rgba(59, 130, 246, 0.2)', 
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                >
                  <User size={20} color="var(--primary)" />
                  <span style={{ fontSize: '0.9rem', color: '#93c5fd' }}>
                    Registro bajo modalidad de <strong>Particular / Consumidor Final</strong>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SELECCIÓN DE VEHÍCULO */}
            <div className="form-field">
              <label className="form-label">Tipo de Transporte</label>
              <div className="pills-grid">
                {(actorType === 'Empresa Privada' || actorType === 'Dependencia Municipal') ? (
                  <>
                    <button 
                      type="button"
                      className={`choice-pill ${vehiculo === 'Camión' ? 'active' : ''}`}
                      onClick={() => handleVehicleChange('Camión')}
                    >
                      <Truck size={16} /> Camión (5 m³)
                    </button>
                    <button 
                      type="button"
                      className={`choice-pill ${vehiculo === 'Batea' ? 'active' : ''}`}
                      onClick={() => handleVehicleChange('Batea')}
                    >
                      <Package size={16} /> Batea (20 m³)
                    </button>
                    <button 
                      type="button"
                      className={`choice-pill ${vehiculo === 'Camioneta' ? 'active' : ''}`}
                      onClick={() => handleVehicleChange('Camioneta')}
                    >
                      Camioneta (1 m³)
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      type="button"
                      className={`choice-pill ${vehiculo === 'Auto' ? 'active' : ''}`}
                      onClick={() => handleVehicleChange('Auto')}
                    >
                      Auto (1 m³)
                    </button>
                    <button 
                      type="button"
                      className={`choice-pill ${vehiculo === 'Camioneta' ? 'active' : ''}`}
                      onClick={() => handleVehicleChange('Camioneta')}
                    >
                      Camioneta (1 m³)
                    </button>
                    <button 
                      type="button"
                      className={`choice-pill ${vehiculo === 'Camión' ? 'active' : ''}`}
                      onClick={() => handleVehicleChange('Camión')}
                    >
                      <Truck size={16} /> Camión (5 m³)
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* SELECCIÓN DE MATERIAL */}
            <div className="form-field">
              <label className="form-label">Material a Registrar</label>
              <div className="pills-grid">
                {['Ramas', 'Tierra', 'Escombros', 'Mezcla'].map(mat => (
                  <button 
                    type="button"
                    key={mat}
                    className={`choice-pill ${material === mat ? 'active' : ''}`}
                    style={{ '--pill-color': MATERIAL_COLORS[mat] }}
                    onClick={() => setMaterial(mat)}
                  >
                    <span 
                      style={{ 
                        width: '9px', 
                        height: '9px', 
                        borderRadius: '50%', 
                        background: MATERIAL_COLORS[mat],
                        display: 'inline-block' 
                      }} 
                    />
                    {mat}
                  </button>
                ))}
              </div>
            </div>

            {/* SELECCIÓN DE VOLUMEN */}
            <div className="form-field">
              <label className="form-label">Volumen Estimado (m³)</label>
              <div className="pills-grid" style={{ alignItems: 'center' }}>
                {[1, 2, 3, 5, 10, 20].map(v => (
                  <button 
                    type="button"
                    key={v}
                    className={`choice-pill ${parseFloat(volumen) === v ? 'active' : ''}`}
                    onClick={() => setVolumen(v)}
                  >
                    {v} m³
                  </button>
                ))}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                  <input 
                    type="number"
                    min="0.5"
                    step="0.5"
                    className="input-text volume-input-box"
                    value={volumen}
                    onChange={(e) => setVolumen(e.target.value)}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>m³</span>
                </div>
              </div>
            </div>

            {/* RESUMEN PREVIO */}
            <div className="summary-strip">
              <div className="summary-item">
                <span style={{ color: 'var(--text-muted)' }}>Operación:</span>
                <span className={`tag-badge tag-${activeType.toLowerCase()}`}>{activeType}</span>
              </div>
              <div className="summary-item">
                <span style={{ color: 'var(--text-muted)' }}>Carga:</span>
                <span className="summary-value">{volumen} m³</span>
                <span style={{ color: MATERIAL_COLORS[material], fontWeight: 700 }}>({material})</span>
              </div>
            </div>

          </div>

          {/* PANEL DERECHO: EVIDENCIA Y CONFIRMACIÓN */}
          <div className="panel-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className="panel-title">
              <span className="panel-title-icon"><Camera size={18} /></span>
              Evidencia Fotográfica
            </h2>

            {/* CONTENEDOR DE CÁMARA / PREVIEW */}
            <div className={`camera-box ${photoPreviewUrl ? 'has-preview' : ''}`}>
              {showCamera ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="video-element" />
                  <div className="camera-overlay-actions">
                    <button type="button" className="btn btn-primary" onClick={takePhoto}>
                      <Camera size={18} /> Capturar
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={stopCamera}>
                      Cancelar
                    </button>
                  </div>
                </>
              ) : photoPreviewUrl ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <img src={photoPreviewUrl} alt="Vista previa" className="preview-img" />
                  <button 
                    type="button" 
                    className="remove-photo-badge" 
                    onClick={removePhoto}
                    title="Quitar foto"
                  >
                    <Trash2 size={14} /> Quitar
                  </button>
                </div>
              ) : (
                <div className="camera-placeholder" onClick={startCamera}>
                  <div className="camera-placeholder-icon">
                    <Camera size={26} />
                  </div>
                  <strong style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    Activar Cámara en Vivo
                  </strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Toca para capturar evidencia fotográfica
                  </span>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* BOTONES DE FOTO ALTERNATIVOS */}
            <div className="evidence-options-row">
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={startCamera}
                disabled={showCamera}
              >
                <Camera size={16} /> Usar Cámara
              </button>

              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <Upload size={16} /> Subir Archivo
              </button>

              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleFileUpload}
              />
            </div>

            {/* BOTÓN DE CONFIRMACIÓN */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
              <button 
                type="button"
                className={`btn-submit ${activeType === 'Ingreso' ? 'btn-submit-ingreso' : 'btn-submit-egreso'}`}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={20} className="spin" /> Guardando Registro...
                  </>
                ) : (
                  <>
                    <Check size={22} />
                    Confirmar {activeType} de {volumen} m³
                  </>
                )}
              </button>
            </div>

          </div>

        </main>

        {/* MODAL: AGREGAR NUEVA ENTIDAD */}
        <AnimatePresence>
          {isAddingEntity && (
            <div className="modal-overlay">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="modal-content"
                style={{ maxWidth: '480px' }}
              >
                <div className="modal-header">
                  <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={20} color="var(--primary)" />
                    Agregar Nueva {actorType === 'Empresa Privada' ? 'Empresa' : 'Dependencia'}
                  </h3>
                  <button 
                    className="btn btn-secondary btn-icon" 
                    onClick={() => setIsAddingEntity(false)}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleAddEntity} className="modal-body">
                  <div className="form-field">
                    <label className="form-label">Nombre oficial o razón social</label>
                    <input 
                      type="text"
                      autoFocus
                      className="input-text"
                      placeholder={actorType === 'Empresa Privada' ? 'Ej: VOLQUETES EL SOL' : 'Ej: Alumbrado Público'}
                      value={newEntityName}
                      onChange={(e) => setNewEntityName(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ flex: 1 }}
                      onClick={() => setIsAddingEntity(false)}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ flex: 1 }}
                      disabled={isSavingEntity}
                    >
                      {isSavingEntity ? 'Guardando...' : 'Guardar y Seleccionar'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: HISTORIAL DE REGISTROS */}
        <AnimatePresence>
          {showHistory && (
            <div className="modal-overlay">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="modal-content"
              >
                <div className="modal-header">
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Registro Histórico de Movimientos</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {filteredHistory.length} registros encontrados
                    </p>
                  </div>
                  <button className="btn btn-secondary" onClick={() => setShowHistory(false)}>
                    Cerrar
                  </button>
                </div>

                <div className="modal-body">
                  {/* FILTROS */}
                  <div className="modal-filters">
                    <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                      <input 
                        type="text" 
                        className="input-text"
                        style={{ paddingLeft: '2.4rem' }}
                        placeholder="Buscar por empresa, material, transporte..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                      />
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>

                    <div className="movement-toggle" style={{ height: '42px' }}>
                      {['Todos', 'Ingreso', 'Egreso'].map(t => (
                        <button 
                          key={t}
                          type="button"
                          className={`toggle-option ${historyFilterType === t ? (t === 'Egreso' ? 'active-egreso' : 'active-ingreso') : ''}`}
                          onClick={() => setHistoryFilterType(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <button className="btn btn-secondary" onClick={fetchHistory}>
                      <RefreshCw size={16} /> Actualizar
                    </button>
                  </div>

                  {/* TABLA */}
                  <div className="table-responsive">
                    <table className="styled-table">
                      <thead>
                        <tr>
                          <th>Fecha y Hora</th>
                          <th>Tipo</th>
                          <th>Actor / Razón Social</th>
                          <th>Transporte</th>
                          <th>Material</th>
                          <th>Volumen</th>
                          <th>Evidencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                              No se encontraron registros de movimientos.
                            </td>
                          </tr>
                        ) : (
                          filteredHistory.map(row => (
                            <tr key={row.id}>
                              <td style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                                {new Date(row.fecha).toLocaleString('es-AR', {
                                  day: '2-digit', month: '2-digit', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </td>
                              <td>
                                <span className={`tag-badge tag-${row.tipo_movimiento.toLowerCase()}`}>
                                  {row.tipo_movimiento}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {row.entidad_nombre}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                  {row.categoria_nombre}
                                </div>
                              </td>
                              <td>{row.vehiculo_tipo}</td>
                              <td>
                                <span className={`tag-badge tag-material-${row.material.toLowerCase()}`}>
                                  {row.material}
                                </span>
                              </td>
                              <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                {row.volumen} m³
                              </td>
                              <td>
                                {row.foto_path ? (
                                  <img 
                                    src={`${UPLOADS_URL}${row.foto_path}`}
                                    alt="Foto"
                                    className="table-thumb"
                                    onClick={() => setLightboxImg(`${UPLOADS_URL}${row.foto_path}`)}
                                  />
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* LIGHTBOX: FOTO AMPLIADA */}
        <AnimatePresence>
          {lightboxImg && (
            <div 
              className="modal-overlay" 
              onClick={() => setLightboxImg(null)}
              style={{ zIndex: 3000 }}
            >
              <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                <img 
                  src={lightboxImg} 
                  alt="Evidencia ampliada" 
                  style={{ width: '100%', height: 'auto', maxHeight: '85vh', borderRadius: '16px', objectFit: 'contain' }}
                />
                <button 
                  className="btn btn-secondary btn-icon"
                  style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.7)' }}
                  onClick={() => setLightboxImg(null)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* NOTIFICACIÓN TOAST */}
        <div className="toast-container">
          <AnimatePresence>
            {toast && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}
              >
                {toast.type === 'error' ? (
                  <AlertCircle size={20} className="toast-icon" />
                ) : (
                  <ShieldCheck size={20} className="toast-icon" />
                )}
                <span>{toast.text}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
