import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, Image as ImageIcon, X, Sun, Moon, LogOut, RefreshCcw, Loader2, GripVertical } from 'lucide-react';
import { getAllAddons, createAddon, updateAddon, deleteAddon, uploadAddonImage, reorderAddons } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import toast, { Toaster } from 'react-hot-toast';

const AdminAddonsPanel = () => {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [reordering, setReordering] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/secure-owner-portal-2026');
      return;
    }
    fetchAddons();
  }, []);

  const fetchAddons = async () => {
    try {
      setLoading(true);
      const response = await getAllAddons();
      setAddons(response.data);
    } catch (error) {
      toast.error('Failed to load add-ons');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAddons();
    setRefreshing(false);
    toast.success('Add-ons refreshed');
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size too large (Max 5MB)');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async () => {
    if (!imageFile) return null;

    try {
      setUploading(true);
      const formDataUpload = new FormData();
      formDataUpload.append('image', imageFile);
      const response = await uploadAddonImage(formDataUpload);
      return response.data.image_url;
    } catch (error) {
      toast.error('Failed to upload image');
      console.error(error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast.error('Please fill required fields (name, price)');
      return;
    }

    let imageUrl = formData.image_url;

    // Upload image if new file selected
    if (imageFile) {
      imageUrl = await uploadImage();
      if (!imageUrl) return;
    }

    const addonData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      image_url: imageUrl,
    };

    try {
      if (editingId) {
        await updateAddon(editingId, addonData);
        toast.success('Add-on updated successfully');
      } else {
        await createAddon(addonData);
        toast.success('Add-on created successfully');
      }
      resetForm();
      fetchAddons();
    } catch (error) {
      toast.error('Failed to save add-on');
      console.error(error);
    }
  };

  const handleEdit = (addon) => {
    setEditingId(addon.id);
    setFormData({
      name: addon.name,
      description: addon.description || '',
      price: addon.price,
      image_url: addon.image_url || '',
    });
    setImagePreview(addon.image_url || '');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this add-on?')) {
      try {
        await deleteAddon(id);
        toast.success('Add-on deleted');
        fetchAddons();
      } catch (error) {
        toast.error('Failed to delete add-on');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      image_url: '',
    });
    setImageFile(null);
    setImagePreview('');
    setEditingId(null);
    setShowModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    

  // Drag and Drop Handlers
  const handleDragStart = (e, addon) => {
    setDraggedId(addon.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetAddon) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetAddon.id) return;

    const draggedIndex = addons.findIndex(a => a.id === draggedId);
    const targetIndex = addons.findIndex(a => a.id === targetAddon.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new array with reordered items
    const newAddons = [...addons];
    const [draggedAddon] = newAddons.splice(draggedIndex, 1);
    newAddons.splice(targetIndex, 0, draggedAddon);

    // Optimistic update
    setAddons(newAddons);
    setDraggedId(null);

    // Send to backend
    try {
      setReordering(true);
      const orderedIds = newAddons.map(a => a.id);
      await reorderAddons(orderedIds);
      toast.success('Add-ons reordered successfully');
    } catch (error) {
      toast.error('Failed to reorder add-ons');
      // Revert on error
      fetchAddons();
    } finally {
      setReordering(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };toast.success('Logged out');
    navigate('/secure-owner-portal-2026');
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Toaster position="top-center" />

      {/* Header */}
      <header className={`fixed top-0 w-full z-50 backdrop-blur-xl border-b transition-colors ${
        isDark ? 'bg-black/80 border-white/10' : 'bg-white/85 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full overflow-hidden border-2 ${isDark ? 'border-white/20' : 'border-gray-200'}`}>
              <img src="/Gallery/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-light tracking-wide">Add-Ons Management</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} ${refreshing ? 'animate-spin' : ''}`}
           >
            <div className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-blue-900/30 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
              <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                💡 Tip: Drag and drop add-ons to rearrange their order on the homepage
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {addons.map((addon) => (
                <div
                  key={addon.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, addon)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, addon)}
                  onDragEnd={handleDragEnd}
                  className={`rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all border cursor-move group ${
                    isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
                  } ${draggedId === addon.id ? 'opacity-50 scale-95' : ''} ${
                    draggedId && draggedId !== addon.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {/* Drag Handle */}
                  <div className={`absolute top-2 left-2 z-10 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                    isDark ? 'bg-gray-800/80' : 'bg-white/80'
                  }`}>
                    <GripVertical size={16} className="text-gray-500" />
                  </div>

                  {/* Image */}
                  <div className={`h-48 flex items-center justify-center overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    {addon.image_url ? (
                      <img src={addon.image_url} alt={addon.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className={`w-12 h-12 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{addon.name}</h3>
                      {addon.description && (
                        <p className={`text-sm line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {addon.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-inherit">
                      <p className="text-2xl font-light">₹{parseFloat(addon.price).toFixed(2)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(addon)}
                        disabled={reordering}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-all"
                      >
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(addon.id)}
                        disabled={reordering}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map((addon) => (
              <div
                key={addon.id}
                className={`rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow border ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
              >
                {/* Image */}
                <div className={`h-48 flex items-center justify-center overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  {addon.image_url ? (
                    <img src={addon.image_url} alt={addon.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className={`w-12 h-12 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                  )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{addon.name}</h3>
                    {addon.description && (
                      <p className={`text-sm line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {addon.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-inherit">
                    <p className="text-2xl font-light">₹{parseFloat(addon.price).toFixed(2)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEdit(addon)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                    >
                      <Edit2 className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(addon.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className={`rounded-2xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'}`}>
              
              {/* Modal Header */}
              <div className={`sticky top-0 flex justify-between items-center p-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <h2 className="text-2xl font-light uppercase tracking-widest">
                  {editingId ? 'Edit Add-On' : 'Add New Add-On'}
                </h2>
                <button onClick={resetForm} className={`p-1 rounded-lg transition-all ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-widest mb-3">
                    Add-On Image
                  </label>
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview('');
                          setImageFile(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                      isDark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Click to upload image</p>
                      <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-widest mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Eyelashes"
                    className={`w-full p-4 rounded-lg border transition-colors focus:outline-none focus:border-red-500 ${
                      isDark
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., High-quality strip lashes to add instant volume"
                    rows="3"
                    className={`w-full p-4 rounded-lg border transition-colors focus:outline-none focus:border-red-500 ${
                      isDark
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-bold uppercase tracking-widest mb-2">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g., 200"
                    className={`w-full p-4 rounded-lg border transition-colors focus:outline-none focus:border-red-500 ${
                      isDark
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className={`flex-1 py-3 rounded-lg font-bold uppercase tracking-widest transition ${
                      isDark
                        ? 'bg-gray-800 text-white hover:bg-gray-700'
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 py-3 bg-red-500 text-white rounded-lg font-bold uppercase tracking-widest hover:bg-red-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                      </>
                    ) : (
                      editingId ? 'Update Add-On' : 'Create Add-On'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminAddonsPanel;
