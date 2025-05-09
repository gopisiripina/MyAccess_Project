import React from 'react';
import PropTypes from 'prop-types';

const UserModal = ({
  showModal,
  isEditMode,
  formData,
  loading,
  error,
  imagePreview,
  selectedImage,
  handleInputChange,
  handleImageChange,
  handleSubmit,
  closeModal,
  renderRoleOptions
}) => {
  if (!showModal) return null;

  const modalTitle = isEditMode
    ? `Edit ${formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}`
    : `Add ${formData.role === 'admin' ? 'Admin' : 'User'}`;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{modalTitle}</h3>
          <button 
            className="close-button" 
            onClick={closeModal}
          >
            ×
          </button>
        </div>
        
        {error && <div className="modal-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group image-upload-container">
            <label>Profile Image</label>
            <div className="image-preview-wrapper">
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Profile preview" 
                  className="image-preview" 
                />
              ) : (
                <div className="image-placeholder">
                  <span>No Image</span>
                </div>
              )}
            </div>
            <input
              type="file"
              id="profileImage"
              name="profileImage"
              accept="image/*"
              onChange={handleImageChange}
              className="image-input"
            />
            <label htmlFor="profileImage" className="image-input-label">
              Choose Image
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          {!isEditMode && (
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="mobile">Mobile</label>
            <input
              type="text"
              id="mobile"
              name="mobile"
              value={formData.mobile}
              onChange={handleInputChange}
            />
          </div>

          {renderRoleOptions && (
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
              >
                {renderRoleOptions()}
              </select>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <div className="toggle-switch-container">
              <label className="switch">
                <input
                  type="checkbox"
                  id="priority"
                  name="priority"
                  checked={formData.priority === true}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: 'priority',
                      value: e.target.checked
                    }
                  })}
                />
                <span className="slider round"></span>
              </label>
              <span className="toggle-label">
                {formData.priority ? 'High Priority' : 'Normal Priority'}
              </span>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              onClick={closeModal}
              disabled={loading}
              className="cancel-button"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className={loading ? "submit-button loading-button" : "submit-button"}
            >
              {loading ? (
                <span className="button-loading-content">
                  <span className="button-spinner"></span>
                  <span>{isEditMode ? 'Updating...' : 'Adding...'}</span>
                </span>
              ) : (
                isEditMode ? 'Update' : 'Add'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

UserModal.propTypes = {
  showModal: PropTypes.bool.isRequired,
  isEditMode: PropTypes.bool.isRequired,
  formData: PropTypes.shape({
    email: PropTypes.string.isRequired,
    password: PropTypes.string,
    role: PropTypes.string.isRequired,
    name: PropTypes.string,
    mobile: PropTypes.string,
    profileImage: PropTypes.string,
    profileImageId: PropTypes.string,
    priority: PropTypes.bool
  }).isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  imagePreview: PropTypes.string,
  selectedImage: PropTypes.object,
  handleInputChange: PropTypes.func.isRequired,
  handleImageChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  closeModal: PropTypes.func.isRequired,
  renderRoleOptions: PropTypes.func
};

export default UserModal;