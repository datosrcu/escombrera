import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Camera, RefreshCw, Check, Upload, Package, Truck, User, Building2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [activeType, setActiveType] = useState('Ingreso');
  const [actorType, setActorType] = useState('Empresa Privada'); // "Empresa Privada", "Dependencia Municipal", "Particular"
  const [categories, setCategories] = useState([]);
  const [entities, setEntities] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [material, setMaterial] = useState('Ramas');
  const [volumen, setVolumen] = useState(5);
  const [vehiculo, setVehiculo] = useState('Camión');
  const [newEntityName, setNewEntityName] = useState('');
  const [isAddingEntity, setIsAddingEntity] = useState(false);
  const [dailyStats, setDailyStats] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [photo, setPhoto] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      const cat = categories.find(c => c.nombre === actorType);
      if (cat) {
        fetchEntities(cat.id);
        
        // Default vehicles based on actor
        if (actorType === 'Empresa Privada') {
          setVehiculo('Camión');
          setVolumen(5);
        } else if (actorType === 'Particular') {
          setVehiculo('Camioneta');
          setVolumen(5);
        } else {
          setVehiculo('Camión');
          setVolumen(5);
        }
      }
    }
  }, [actorType, categories]);

  // Default volume logic when vehicle changes
  useEffect(() => {
    if (vehiculo === 'Batea') setVolumen(20);
    else setVolumen(5);
  }, [vehiculo]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/categorias`);
      setCategories(res.data);
    } catch (err) {
      console.error("Error fetching categories", err);
    }
  };

  const fetchEntities = async (catId) => {
    try {
      const res = await axios.get(`${API_URL}/entidades/${catId}`);
      setEntities(res.data);
      if (res.data.length > 0) {
        setSelectedEntityId(res.data[0].id);
      } else {
        setSelectedEntityId('');
      }
    } catch (err) {
      console.error("Error fetching entities", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard/hoy`);
      setDailyStats(res.data);
    } catch (err) {
      console.error("Error fetching stats", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/movimientos/historial`);
      setHistory(res.data);
      setShowHistory(true);
    } catch (err) {
      console.error("Error fetching history", err);
    }
  };

  const handleAddEntity = async () => {
    if (!newEntityName) return;
    const cat = categories.find(c => c.nombre === actorType);
    try {
      const res = await axios.post(`${API_URL}/entidades`, {
        categoria_id: cat.id,
        nombre: newEntityName
      });
      setEntities([...entities, res.data]);
      setSelectedEntityId(res.data.id);
      setNewEntityName('');
      setIsAddingEntity(false);
    } catch (err) {
      console.error("Error adding entity", err);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    setPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera", err);
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        setPhoto(blob);
        stopCamera();
      }, 'image/jpeg');
    }
  };

  const stopCamera = () => {
    const video = videoRef.current;
    if (video && video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEntityId && actorType !== 'Particular') {
      alert("Por favor seleccione o agregue una entidad");
      return;
    }

    const formData = new FormData();
    formData.append('entidad_id', selectedEntityId);
    formData.append('tipo_movimiento', activeType);
    formData.append('material', material);
    formData.append('volumen', volumen);
    formData.append('vehiculo_tipo', vehiculo);
    if (photo) {
      formData.append('foto', photo, 'capture.jpg');
    }

    try {
      await axios.post(`${API_URL}/movimientos`, formData);
      alert(`${activeType} registrado correctamente`);
      // Reset form
      setPhoto(null);
      fetchStats();
    } catch (err) {
      console.error("Error submitting movement", err);
      alert("Error al registrar el movimiento");
    }
  };

  return (
    <div className="app-container">
      <header>
        <div>
          <h1>Gestión de Escombrera</h1>
          <p style={{ color: 'var(--text-muted)' }}>Registro Municipal de Residuos</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={fetchHistory}>
            Ver Registros Históricos
          </button>
          <div className="pill-container">
            {['Ingreso', 'Egreso'].map(t => (
              <button 
                key={t}
                className={`btn ${activeType === t ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* History Modal Overlay */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="history-overlay"
          >
            <div className="history-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Registro Histórico de Movimientos</h2>
                <button className="btn btn-outline" onClick={() => setShowHistory(false)}>Cerrar</button>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Actor / Entidad</th>
                      <th>Vehículo</th>
                      <th>Material</th>
                      <th>Volumen</th>
                      <th>Evidencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(row => (
                      <tr key={row.id}>
                        <td>{new Date(row.fecha).toLocaleString()}</td>
                        <td>
                          <span className={`badge badge-${row.tipo_movimiento.toLowerCase()}`}>
                            {row.tipo_movimiento}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{row.entidad_nombre}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.categoria_nombre}</div>
                        </td>
                        <td>{row.vehiculo_tipo}</td>
                        <td>{row.material}</td>
                        <td>{row.volumen} m³</td>
                        <td>
                          {row.foto_path ? (
                            <img 
                              src={`http://localhost:3001/uploads/${row.foto_path}`} 
                              alt="Evidencia" 
                              className="thumbnail"
                              onClick={() => window.open(`http://localhost:3001/uploads/${row.foto_path}`, '_blank')}
                            />
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Stats */}
      <div className="dashboard-grid">
        {['Ramas', 'Tierra', 'Escombros'].map(mat => {
          const stat = dailyStats.find(s => s.material === mat);
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={mat} 
              className="card stat-card"
            >
              <span className="stat-label">{mat} (Hoy)</span>
              <span className="stat-value">{stat ? stat.total : 0} <small style={{ fontSize: '1rem' }}>m³</small></span>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '10px' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((stat ? stat.total : 0) * 5, 100)}%` }}
                  style={{ height: '100%', background: 'var(--primary)', borderRadius: '2px' }} 
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="form-section">
        {/* Step 1: Actor Selection */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Truck size={24} /> Datos del Vehículo
          </h2>
          
          <div className="type-selector">
            <div 
              className={`type-btn ${actorType === 'Empresa Privada' ? 'active' : ''}`}
              onClick={() => setActorType('Empresa Privada')}
            >
              <Building2 size={24} style={{ margin: '0 auto 0.5rem' }} />
              <span>Privada</span>
            </div>
            <div 
              className={`type-btn ${actorType === 'Dependencia Municipal' ? 'active' : ''}`}
              onClick={() => setActorType('Dependencia Municipal')}
            >
              <MapPin size={24} style={{ margin: '0 auto 0.5rem' }} />
              <span>Municipal</span>
            </div>
            <div 
              className={`type-btn ${actorType === 'Particular' ? 'active' : ''}`}
              onClick={() => setActorType('Particular')}
            >
              <User size={24} style={{ margin: '0 auto 0.5rem' }} />
              <span>Particular</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {actorType !== 'Particular' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="form-group"
              >
                <label>{actorType === 'Empresa Privada' ? 'Seleccionar Empresa' : 'Dependencia'}</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    value={selectedEntityId} 
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {entities.map(e => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => setIsAddingEntity(true)}
                    title="Agregar Nuevo"
                  >
                    +
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isAddingEntity && (
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Nombre de Nueva Entidad</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={newEntityName} 
                  onChange={(e) => setNewEntityName(e.target.value)}
                  placeholder="Ej: Constructora ABC"
                />
                <button className="btn btn-primary" onClick={handleAddEntity}>
                  <Check size={18} />
                </button>
                <button className="btn btn-outline" onClick={() => setIsAddingEntity(false)}>
                  X
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Tipo de Vehículo</label>
            <div className="pill-container">
              {(actorType === 'Empresa Privada' || actorType === 'Dependencia Municipal') && (
                <>
                  <div className={`pill ${vehiculo === 'Camión' ? 'active' : ''}`} onClick={() => setVehiculo('Camión')}>Camión</div>
                  <div className={`pill ${vehiculo === 'Batea' ? 'active' : ''}`} onClick={() => setVehiculo('Batea')}>Batea</div>
                </>
              )}
              {(actorType === 'Particular' || actorType === 'Dependencia Municipal') && (
                <>
                  <div className={`pill ${vehiculo === 'Auto' ? 'active' : ''}`} onClick={() => setVehiculo('Auto')}>Auto</div>
                  <div className={`pill ${vehiculo === 'Camioneta' ? 'active' : ''}`} onClick={() => setVehiculo('Camioneta')}>Camioneta</div>
                </>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Tipo de Material</label>
            <div className="pill-container">
              {['Ramas', 'Tierra', 'Escombros'].map(m => (
                <div 
                  key={m} 
                  className={`pill ${material === m ? 'active' : ''}`}
                  onClick={() => setMaterial(m)}
                >
                  {m}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Volumen (m³)</label>
            <div className="pill-container">
              {[1, 2, 3, 4, 5, 20].map(v => (
                <div 
                  key={v} 
                  className={`pill ${volumen === v ? 'active' : ''}`}
                  onClick={() => setVolumen(v)}
                >
                  {v} m³
                </div>
              ))}
              <input 
                type="number" 
                value={volumen} 
                onChange={(e) => setVolumen(e.target.value)}
                style={{ width: '80px', padding: '0.25rem 0.5rem', borderRadius: '0.5rem' }}
              />
            </div>
          </div>
        </div>

        {/* Step 2: Camera and Submit */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={24} /> Evidencia Fotográfica
          </h2>

          <div className="camera-container">
            {showCamera ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted />
                <div className="camera-controls">
                  <button className="btn btn-primary" onClick={takePhoto}>
                    Capturar Foto
                  </button>
                  <button className="btn btn-outline" onClick={stopCamera}>
                    Cancelar
                  </button>
                </div>
              </>
            ) : photo ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img src={URL.createObjectURL(photo)} alt="Preview" className="photo-preview" />
                <button 
                  className="btn btn-outline" 
                  style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)' }}
                  onClick={startCamera}
                >
                  <RefreshCw size={18} /> Re-tomar
                </button>
              </div>
            ) : (
              <div 
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', cursor: 'pointer' }}
                onClick={startCamera}
              >
                <Camera size={48} color="var(--text-muted)" />
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Click para activar cámara</p>
              </div>
            )}
          </div>
          
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <button 
            className={`btn btn-full btn-success`} 
            style={{ marginTop: '1.5rem', height: '3.5rem', fontSize: '1.2rem' }}
            onClick={handleSubmit}
          >
            <Upload size={24} /> Confirmar {activeType}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
