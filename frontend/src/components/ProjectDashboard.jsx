import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiHome, FiZap, FiSettings, FiTruck } from 'react-icons/fi';
import { WiDaySunny, WiRain, WiSnow } from 'react-icons/wi';
import '../styles/projectdashboard.css';

const ProjectDashboard = () => {
  const { projectId } = useParams();
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        const role = localStorage.getItem('userRole');
        
        const config = {
          headers: {
            'userid': userId,
            'role': role
          }
        };

        const response = await axios.get(
          `http://localhost:5000/api/projects/${projectId}/dashboard`,
          config
        );
        
        setProjectData(response.data);
        setError('');
      } catch (err) {
        console.error('Error fetching project data:', err);
        setError('Failed to load project dashboard. Please try again.');
        navigate('/projects'); // Changed to navigate to projects list
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId, navigate]);

  const getProjectIcon = () => {
    if (projectData?.name?.includes('Smart Home')) return <FiHome className="project-icon" />;
    if (projectData?.name?.includes('Industrial')) return <FiSettings className="project-icon" />;
    if (projectData?.name?.includes('Fleet')) return <FiTruck className="project-icon" />;
    return <FiZap className="project-icon" />;
  };

  const getStatusIcon = (status) => {
    if (status === 'ON') return <WiDaySunny className="status-icon online" />;
    if (status === 'OFF') return <WiRain className="status-icon offline" />;
    return <WiSnow className="status-icon warning" />;
  };

  if (loading) return (
    <div className="dashboard-loading">
      <div className="loading-spinner"></div>
      <p>Loading project data...</p>
    </div>
  );

  if (error) return (
    <div className="dashboard-error">
      <div className="error-icon">!</div>
      <p>{error}</p>
      <button 
        className="back-button"
        onClick={() => navigate('/dashboard?tab=devices')}
      >
        <FiArrowLeft />Back to Projects
      </button>
    </div>
  );

  return (
    <div className="project-dashboard">
      <div className="project-header">
        <button 
          className="back-button"
          onClick={() => navigate('/projects')} // Fixed navigation to projects list
        >
          <FiArrowLeft /> Back to Projects
        </button>
        
        <div className="project-info">
          {getProjectIcon()}
          <div>
            <h1>{projectData?.name || 'Project Dashboard'}</h1>
            <p className="project-description">{projectData?.description || 'No description available'}</p>
          </div>
        </div>
      </div>
      
      {projectData && (
        <div className="dashboard-content">
          {/* Smart Home Dashboard */}
          {projectData.name?.includes('Smart Home') && (
            <section className="dashboard-section">
              <h2><FiHome /> Smart Home Devices</h2>
              <div className="cards-grid">
                {projectData.devices && Object.entries(projectData.devices).map(([deviceId, device]) => (
                  <div key={deviceId} className={`device-card ${device.status === 'ON' ? 'online' : 'offline'}`}>
                    <div className="card-header">
                      <h3>{deviceId.replace(/_/g, ' ')}</h3>
                      <div className="status-indicator">
                        {getStatusIcon(device.status)}
                        <span>{device.status}</span>
                      </div>
                    </div>
                    <div className="card-body">
                      {device.energy_usage && (
                        <div className="metric">
                          <span>Energy Usage</span>
                          <span className="value">{device.energy_usage}</span>
                        </div>
                      )}
                      {device.temperature && (
                        <div className="metric">
                          <span>Temperature</span>
                          <span className="value">{device.temperature}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Industrial Monitoring Dashboard */}
          {projectData.name?.includes('Industrial') && (
            <section className="dashboard-section">
              <h2><FiSettings /> Industrial Monitoring</h2>
              <div className="cards-grid">
                {projectData.sensors && Object.entries(projectData.sensors).map(([sensorId, sensor]) => (
                  <div key={sensorId} className={`sensor-card ${sensor.status.toLowerCase()}`}>
                    <div className="card-header">
                      <h3>{sensorId}</h3>
                      <div className="sensor-type">{sensor.type}</div>
                    </div>
                    <div className="card-body">
                      <div className="metric">
                        <span>Current Value</span>
                        <span className="value">{sensor.value}</span>
                      </div>
                      <div className={`status ${sensor.status.toLowerCase()}`}>
                        {sensor.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Fleet Tracking Dashboard */}
          {projectData.name?.includes('Fleet') && (
            <section className="dashboard-section">
              <h2><FiTruck /> Fleet Tracking</h2>
              <div className="cards-grid">
                {projectData.vehicles && Object.entries(projectData.vehicles).map(([vehicleId, vehicle]) => (
                  <div key={vehicleId} className="vehicle-card">
                    <div className="card-header">
                      <h3>{vehicleId}</h3>
                      <div className="vehicle-status">
                        <span>Operational</span>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="metric">
                        <span>Location</span>
                        <span className="value">{vehicle.location?.lat}, {vehicle.location?.lng}</span>
                      </div>
                      <div className="metric">
                        <span>Fuel Level</span>
                        <div className="fuel-gauge">
                          <div 
                            className="fuel-level" 
                            style={{ width: `${parseInt(vehicle.fuel)}%` }}
                          ></div>
                        </div>
                        <span className="value">{vehicle.fuel}</span>
                      </div>
                      <div className="metric">
                        <span>Speed</span>
                        <span className="value">{vehicle.speed}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectDashboard;