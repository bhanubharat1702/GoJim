'use client';
import { useState, useEffect , useRef} from 'react';
import { expenseCategoriesApi } from '@/lib/api';
import { PageHeader, Loader } from '@/components/UI';
import {
  FolderPlus, Trash2, Edit3, Plus, Check, X,
  Folder, ArrowRight, Tag, AlertTriangle
} from 'lucide-react';

export default function ExpenseCategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Form states
  const [newCatName, setNewCatName] = useState('');
  const [newTitleName, setNewTitleName] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchCategories = async (selectFirst = false) => {
    setLoading(true);
    try {
      const res = await expenseCategoriesApi.getAll();
      if (res.success) {
        setCategories(res.data);
        if (res.data.length > 0) {
          // If selectedCategory is already set, update it with fresh data
          if (selectedCategory) {
            const updated = res.data.find(c => c._id === selectedCategory._id);
            setSelectedCategory(updated || res.data[0]);
          } else if (selectFirst) {
            setSelectedCategory(res.data[0]);
          }
        } else {
          setSelectedCategory(null);
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchCategories(true);
  }, []);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setSaving(true);
    try {
      const res = await expenseCategoriesApi.create({
        name: newCatName.trim(),
        titles: ['Other']
      });
      if (res.success) {
        showToast('📁 Category created successfully!', 'success');
        setNewCatName('');
        await fetchCategories();
        setSelectedCategory(res.data);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategoryName = async (id) => {
    if (!editingCatName.trim()) return;
    setSaving(true);
    try {
      const res = await expenseCategoriesApi.update(id, { name: editingCatName.trim() });
      if (res.success) {
        showToast('✏️ Category renamed successfully!', 'success');
        setEditingCatId(null);
        setEditingCatName('');
        await fetchCategories();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`⚠️ Are you sure you want to delete the category "${name}"? This will delete all its associated sub-titles. Existing expenses recorded with this category will not be deleted but won't be mapped.`)) {
      return;
    }
    setSaving(true);
    try {
      const res = await expenseCategoriesApi.delete(id);
      if (res.success) {
        showToast('🗑️ Category deleted successfully!', 'success');
        if (selectedCategory?._id === id) {
          setSelectedCategory(null);
        }
        await fetchCategories(true);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTitle = async (e) => {
    e.preventDefault();
    if (!selectedCategory || !newTitleName.trim()) return;
    const titleTrimmed = newTitleName.trim();
    if (selectedCategory.titles.includes(titleTrimmed)) {
      showToast('Title already exists in this category!', 'warning');
      return;
    }
    setSaving(true);
    try {
      const updatedTitles = [...selectedCategory.titles, titleTrimmed];
      const res = await expenseCategoriesApi.update(selectedCategory._id, { titles: updatedTitles });
      if (res.success) {
        showToast('🏷️ Expense title added!', 'success');
        setNewTitleName('');
        await fetchCategories();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTitle = async (titleToDelete) => {
    if (!selectedCategory) return;
    if (titleToDelete === 'Other') {
      showToast('The "Other" title option cannot be removed.', 'warning');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove the title "${titleToDelete}"?`)) {
      return;
    }
    setSaving(true);
    try {
      const updatedTitles = selectedCategory.titles.filter(t => t !== titleToDelete);
      const res = await expenseCategoriesApi.update(selectedCategory._id, { titles: updatedTitles });
      if (res.success) {
        showToast('🗑️ Title removed successfully!', 'success');
        await fetchCategories();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999999] flex flex-col gap-3 pointer-events-none w-[90%] max-w-[400px]">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] font-bold uppercase tracking-wider text-[10px] backdrop-blur-md text-white border transition-all duration-300 transform scale-100 ${
              toast.type === 'success' ? 'border-success/30 text-success bg-[#0d0d0d]/95' :
              toast.type === 'error' ? 'border-danger/30 text-danger bg-[#0d0d0d]/95' :
              'border-yellow-500/30 text-yellow-500 bg-[#0d0d0d]/95'
            }`}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <span className="leading-relaxed break-words">{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer ml-4 shrink-0 text-white font-black text-xs bg-transparent border-none"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <PageHeader
        title="Expense Categories"
        subtitle="Manage custom categories and dependent title choices for your expense tracking"
      />

      {loading && categories.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Category Management (5 Columns) */}
          <div className="lg:col-span-5 bg-bg-secondary/40 backdrop-blur-md border border-border/40 rounded-3xl p-6 space-y-6">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
              <Folder size={16} className="text-accent" /> Categories
            </h3>

            {/* Create Category Form */}
            <form onSubmit={handleCreateCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="New Category Name (e.g. Office)"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                className="flex-1 bg-bg-card border border-border/50 rounded-2xl px-4 py-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-all"
                disabled={saving}
              />
              <button
                type="submit"
                className="bg-accent hover:bg-[#a3e635] text-black px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 border-none cursor-pointer"
                disabled={saving}
              >
                <FolderPlus size={14} /> Add
              </button>
            </form>

            {/* Categories List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
              {categories.map(cat => {
                const isSelected = selectedCategory?._id === cat._id;
                const isEditing = editingCatId === cat._id;

                return (
                  <div
                    key={cat._id}
                    onClick={() => !isEditing && setSelectedCategory(cat)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-accent/10 border-accent/40 text-accent shadow-inner'
                        : 'bg-bg-card/30 border-border/20 text-text-secondary hover:bg-bg-card/60 hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Folder size={14} className={isSelected ? 'text-accent' : 'text-text-muted'} />
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={e => setEditingCatName(e.target.value)}
                            className="bg-bg-card border border-accent/40 rounded-xl px-2.5 py-1 text-xs text-text-primary outline-none w-full"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateCategoryName(cat._id)}
                            className="p-1.5 rounded-lg bg-success/20 hover:bg-success/30 text-success transition-all border-none cursor-pointer"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setEditingCatId(null)}
                            className="p-1.5 rounded-lg bg-danger/20 hover:bg-danger/30 text-danger transition-all border-none cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold truncate">{cat.name}</span>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingCatId(cat._id);
                            setEditingCatName(cat.name);
                          }}
                          className="p-1.5 rounded-xl hover:bg-bg-card text-text-muted hover:text-accent transition-all border-none bg-transparent cursor-pointer"
                          title="Rename Category"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat._id, cat.name)}
                          className="p-1.5 rounded-xl hover:bg-danger/10 text-text-muted hover:text-danger transition-all border-none bg-transparent cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 size={12} />
                        </button>
                        <ArrowRight size={14} className={`text-text-muted transition-transform ml-1 ${isSelected ? 'translate-x-1 text-accent' : 'opacity-0'}`} />
                      </div>
                    )}
                  </div>
                );
              })}

              {categories.length === 0 && (
                <div className="text-center py-10 opacity-40">
                  <p className="text-xs">No custom categories found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Dependent Titles (7 Columns) */}
          <div className="lg:col-span-7 bg-bg-secondary/40 backdrop-blur-md border border-border/40 rounded-3xl p-6 space-y-6 min-h-[400px]">
            {selectedCategory ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] bg-accent/10 px-2.5 py-0.5 rounded-full text-accent font-black uppercase tracking-wider">
                      Selected Category
                    </span>
                  </div>
                  <h3 className="text-base font-black text-text-primary uppercase tracking-[0.2em] truncate">
                    Titles for "{selectedCategory.name}"
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    These options populate the Expense Title dropdown when "{selectedCategory.name}" is selected.
                  </p>
                </div>

                {/* Add Title Form */}
                <form onSubmit={handleAddTitle} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`New Title (e.g. Wifi bill, Office desk)`}
                    value={newTitleName}
                    onChange={e => setNewTitleName(e.target.value)}
                    className="flex-1 bg-bg-card border border-border/50 rounded-2xl px-4 py-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-all"
                    disabled={saving}
                  />
                  <button
                    type="submit"
                    className="bg-accent hover:bg-[#a3e635] text-black px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 border-none cursor-pointer"
                    disabled={saving}
                  >
                    <Plus size={14} /> Add
                  </button>
                </form>

                {/* Dependent Titles List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
                  {selectedCategory.titles.map((title, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3.5 bg-bg-card/30 border border-border/20 rounded-2xl text-xs text-text-secondary"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Tag size={12} className="text-text-muted shrink-0" />
                        <span className="font-medium truncate">{title}</span>
                      </div>

                      {title !== 'Other' && (
                        <button
                          onClick={() => handleDeleteTitle(title)}
                          className="p-1.5 rounded-xl hover:bg-danger/10 text-text-muted hover:text-danger transition-all border-none bg-transparent cursor-pointer"
                          title="Remove Title"
                          disabled={saving}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}

                  {selectedCategory.titles.length === 0 && (
                    <div className="col-span-full text-center py-10 opacity-40">
                      <p className="text-xs">No sub-titles configured for this category.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Folder size={32} className="text-text-muted mb-3" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">No Category Selected</h4>
                <p className="text-xs mt-1">Select a category from the left panel to configure its titles.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
