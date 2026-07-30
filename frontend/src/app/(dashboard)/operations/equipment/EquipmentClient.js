'use client';
import { useState, useEffect, useRef } from 'react';
import { Modal, Select, Badge, SearchBar, EmptyState } from '@/components/UI';
import { useAuth } from '@/context/AuthContext';
import { equipmentApi } from '@/lib/api';
import {
  Wrench, Activity, AlertTriangle, CheckCircle2,
  Plus, Trash2, Edit3, Sliders, AlertCircle,
  ChevronDown, ChevronUp, ChevronsUpDown, Info, ShoppingBag
} from 'lucide-react';

export default function EquipmentClient({ initialEquipment }) {
  const { user } = useAuth();
  const [equipmentList, setEquipmentList] = useState(initialEquipment || []);
  const [loading, setLoading] = useState(!initialEquipment);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const [showAdd, setShowAdd] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ equipmentName: '', category: 'Cardio', quantity: 1, status: 'Available', notes: '' });
  const [deleteConfirmState, setDeleteConfirmState] = useState(null);
  const [viewingAsset, setViewingAsset] = useState(null);
  const [quantityError, setQuantityError] = useState('');
  const [expandedEquipmentId, setExpandedEquipmentId] = useState(null);

  // Categories dynamically loaded from settings
  const settingsCategories = user?.equipmentCategories || ['Cardio', 'Strength', 'Free Weights', 'Accessories'];

  // Fetch all equipment on mount
  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const res = await equipmentApi.getAll();
      if (res.success) {
        setEquipmentList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (initialEquipment && initialEquipment.length > 0) return;
    }
    fetchEquipment();
  }, []);

  const handleQuantityChange = (val) => {
    if (val === '') {
      setForm(prev => ({ ...prev, quantity: '' }));
      setQuantityError("Quantity must be 1 or more");
      return;
    }

    // Only allow numeric characters
    const cleanVal = val.replace(/[^0-9]/g, '');
    if (cleanVal === '') {
      setForm(prev => ({ ...prev, quantity: '' }));
      setQuantityError("Quantity must be 1 or more");
      return;
    }

    const num = parseInt(cleanVal, 10);
    if (num <= 0) {
      setForm(prev => ({ ...prev, quantity: 0 }));
      setQuantityError("Quantity must be 1 or more");
    } else {
      setForm(prev => ({ ...prev, quantity: num }));
      setQuantityError("");
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.equipmentName || !form.category) {
      return;
    }

    const qtyNum = Number(form.quantity);
    if (!form.quantity || isNaN(qtyNum) || qtyNum <= 0) {
      setQuantityError("Quantity must be 1 or more");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        equipmentName: form.equipmentName,
        category: form.category,
        quantity: qtyNum,
        status: form.status,
        notes: form.notes || ''
      };

      let res;
      if (isEditing) {
        res = await equipmentApi.update(isEditing, payload);
      } else {
        res = await equipmentApi.create(payload);
      }

      if (res.success) {
        await fetchEquipment();
        setShowAdd(false);
        setIsEditing(null);
        setForm({ equipmentName: '', category: 'Cardio', quantity: 1, status: 'Available', notes: '' });
        setQuantityError('');
      }
    } catch (err) {
      console.error('Failed to save equipment:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, name) => {
    setDeleteConfirmState({
      title: "Delete Equipment",
      message: `Are you sure you want to delete "${name}"? This action will soft-delete the equipment from your system.`,
      onConfirm: async () => {
        try {
          const res = await equipmentApi.delete(id);
          if (res.success) {
            await fetchEquipment();
            setViewingAsset(null);
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const toggleStatus = async (id, nextStatus) => {
    try {
      const res = await equipmentApi.updateStatus(id, nextStatus);
      if (res.success) {
        await fetchEquipment();
        if (viewingAsset && viewingAsset._id === id) {
          setViewingAsset(prev => ({ ...prev, status: nextStatus }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter & Sort items locally for seamless UX
  const filteredItems = equipmentList.filter(item => {
    return item.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
      item.notes.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => {
    const isDesc = sortBy.startsWith('-');
    const key = isDesc ? sortBy.substring(1) : sortBy;

    let comparison = 0;
    if (key === 'name') comparison = a.equipmentName.localeCompare(b.equipmentName);
    else if (key === 'category') comparison = a.category.localeCompare(b.category);
    else if (key === 'status') comparison = a.status.localeCompare(b.status);
    else if (key === 'quantity') comparison = a.quantity - b.quantity;

    return isDesc ? -comparison : comparison;
  });

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortBy(`-${key}`);
    } else if (sortBy === `-${key}`) {
      setSortBy('name');
    } else {
      setSortBy(key);
    }
  };

  // Calculate dynamic quantity-based sums for cards
  const totalQty = equipmentList.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const availableQty = equipmentList.filter(item => item.status === 'Available').reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const maintenanceQty = equipmentList.filter(item => item.status === 'Under Maintenance').reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const notAvailableQty = equipmentList.filter(item => item.status === 'Not Available').reduce((acc, curr) => acc + (curr.quantity || 0), 0);



  const statusColors = {
    'Available': 'success',
    'Under Maintenance': 'warning',
    'Not Available': 'danger'
  };

  const SortHeader = ({ label, sortKey, className = "" }) => {
    const isActive = sortBy === sortKey || sortBy === `-${sortKey}`;
    const isDesc = sortBy === `-${sortKey}`;

    return (
      <th
        className={`px-6 py-3 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] cursor-pointer hover:text-white transition-colors group ${className}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center gap-1.5">
          {label}
          <div className={`transition-all ${isActive ? 'text-accent opacity-100' : 'opacity-30 group-hover:opacity-60'}`}>
            {isActive ? (
              isDesc ? <ChevronDown size={12} strokeWidth={3} /> : <ChevronUp size={12} strokeWidth={3} />
            ) : (
              <ChevronsUpDown size={12} strokeWidth={3} />
            )}
          </div>
        </div>
      </th>
    );
  };

  return (
    <div className="pb-2">
      {/* Main Bundle Card */}
      <div className="bg-bg-card border border-white/5 rounded-xl shadow-2xl flex flex-col">

        {/* Top Header & Actions Row */}
        <div className="py-4 px-6 border-b border-white/5 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-text-primary tracking-tight">Equipment</h1>
              <div className="flex items-center gap-2 text-[10px] font-black text-text-muted uppercase tracking-widest mt-1 opacity-70">
                Listing <span className="text-white">{filteredItems.length}</span> total entries
              </div>
            </div>

            {/* Search & Actions block */}
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <SearchBar value={search} onChange={setSearch} placeholder="Search name..." />

              <button
                onClick={() => {
                  setIsEditing(null);
                  setForm({ equipmentName: '', category: settingsCategories[0] || 'Cardio', quantity: 1, status: 'Available', notes: '' });
                  setQuantityError('');
                  setShowAdd(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-black rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-accent/20 active:scale-95 whitespace-nowrap cursor-pointer animate-in fade-in"
              >
                <Plus size={14} /> Add Equipment
              </button>
            </div>
          </div>

          {/* Stats Bar (Displays precisely the 4 required quantity sum cards matching client styles) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in duration-200">
            <div
              className="col-span-1 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer flex flex-col group justify-between"
              onClick={() => { setSearch(''); }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="rounded-xl bg-white/5 flex items-center justify-center text-text-muted group-hover:text-white transition-colors w-6 h-6 p-1">
                  <Sliders size={14} className="text-accent" />
                </div>
                <span className="text-[8px] font-black text-text-secondary uppercase tracking-[0.2em]">Total Equipment</span>
              </div>
              <div className="flex items-end justify-between gap-2 mt-auto">
                <h3 className="text-lg font-black text-white tracking-tight leading-none whitespace-nowrap">{totalQty} </h3>
              </div>
            </div>

            <div
              className="col-span-1 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer flex flex-col group justify-between"
              onClick={() => { setSearch(''); }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="rounded-xl bg-white/5 flex items-center justify-center text-text-muted group-hover:text-white transition-colors w-6 h-6 p-1">
                  <CheckCircle2 size={14} className="text-success" />
                </div>
                <span className="text-[8px] font-black text-text-secondary uppercase tracking-[0.2em]">Available</span>
              </div>
              <div className="flex items-end justify-between gap-2 mt-auto">
                <h3 className="text-lg font-black text-white tracking-tight leading-none whitespace-nowrap">{availableQty} </h3>
              </div>
            </div>

            <div
              className="col-span-1 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer flex flex-col group justify-between"
              onClick={() => { setSearch(''); }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="rounded-xl bg-white/5 flex items-center justify-center text-text-muted group-hover:text-white transition-colors w-6 h-6 p-1">
                  <Wrench size={14} className="text-warning" />
                </div>
                <span className="text-[8px] font-black text-text-secondary uppercase tracking-[0.2em]">Under Maintenance</span>
              </div>
              <div className="flex items-end justify-between gap-2 mt-auto">
                <h3 className="text-lg font-black text-white tracking-tight leading-none whitespace-nowrap">{maintenanceQty}</h3>
              </div>
            </div>

            <div
              className="col-span-1 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer flex flex-col group justify-between"
              onClick={() => { setSearch(''); }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="rounded-xl bg-white/5 flex items-center justify-center text-text-muted group-hover:text-white transition-colors w-6 h-6 p-1">
                  <AlertTriangle size={14} className="text-danger" />
                </div>
                <span className="text-[8px] font-black text-text-secondary uppercase tracking-[0.2em]">Not Available</span>
              </div>
              <div className="flex items-end justify-between gap-2 mt-auto">
                <h3 className="text-lg font-black text-white tracking-tight leading-none whitespace-nowrap">{notAvailableQty}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Datatable view matching client page styles exactly */}
        {loading ? null : filteredItems.length === 0 ? (
          <EmptyState icon={<Wrench size={48} className="text-text-muted opacity-50" />} title="No equipment found" description="Add your first equipment to get started" />
        ) : (
          <>
            <div className="hidden md:block max-h-[292px] overflow-y-auto relative rounded-2xl border border-white/5">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0a0a0a] z-10 border-b border-white/5 shadow-md">
                <tr className="bg-white/[0.02]">
                  <th className="px-8 py-3 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] w-12">#</th>
                  <SortHeader label="Equipment Name" sortKey="name" />
                  <SortHeader label="Category" sortKey="category" />
                  <SortHeader label="Quantity" sortKey="quantity" />
                  <SortHeader label="Status" sortKey="status" />
                  <th className="px-6 py-3 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Notes</th>
                  <th className="px-6 py-3 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map((item, idx) => (
                  <tr
                    key={item._id}
                    onClick={() => setViewingAsset(item)}
                    className="group hover:bg-white/[0.02] transition-all cursor-pointer border-b border-white/5"
                  >
                    <td className="px-8 py-2.5">
                      <span className="text-[11px] font-black text-text-muted group-hover:text-accent transition-colors">{idx + 1}</span>
                    </td>
                    <td className="px-6 py-2.5">
                      <p className="text-xs font-black text-white group-hover:text-accent transition-colors">{item.equipmentName}</p>
                    </td>
                    <td className="px-6 py-2.5">
                      <span className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-2.5">
                      <span className="text-[11px] font-bold text-white font-mono">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-2.5">
                      <Badge variant={statusColors[item.status]} size="sm">
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-2.5 max-w-[200px]">
                      <p className="text-[11px] font-bold text-text-secondary leading-normal truncate italic">
                        {item.notes ? `"${item.notes}"` : 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Status Quick Toggles */}
                        <button
                          onClick={() => toggleStatus(item._id, 'Available')}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border ${item.status === 'Available' ? 'bg-success/20 border-success/30 text-success' : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10'
                            }`}
                          title="Set Available"
                        >
                          <CheckCircle2 size={12} />
                        </button>
                        <button
                          onClick={() => toggleStatus(item._id, 'Under Maintenance')}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border ${item.status === 'Under Maintenance' ? 'bg-warning/20 border-warning/30 text-warning' : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10'
                            }`}
                          title="Set Under Maintenance"
                        >
                          <Wrench size={12} />
                        </button>
                        <button
                          onClick={() => toggleStatus(item._id, 'Not Available')}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border ${item.status === 'Not Available' ? 'bg-danger/20 border-danger/30 text-danger' : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10'
                            }`}
                          title="Set Not Available"
                        >
                          <AlertTriangle size={12} />
                        </button>

                        <div className="w-px h-5 bg-white/5 mx-1" />

                        {/* Edit Action */}
                        <button
                          onClick={() => {
                            setIsEditing(item._id);
                            setForm({ equipmentName: item.equipmentName, category: item.category, quantity: item.quantity, status: item.status, notes: item.notes });
                            setQuantityError('');
                            setShowAdd(true);
                          }}
                          className="w-7 h-7 rounded-lg bg-info/10 border border-info/20 hover:bg-info text-info hover:text-white flex items-center justify-center transition-all"
                          title="Edit Equipment"
                        >
                          <Edit3 size={12} />
                        </button>
                        {/* Delete Action */}
                        <button
                          onClick={() => handleDelete(item._id, item.equipmentName)}
                          className="w-7 h-7 rounded-lg bg-danger/10 border border-danger/20 hover:bg-danger text-danger hover:text-white flex items-center justify-center transition-all"
                          title="Delete Equipment"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Collapsible Cards View */}
          {filteredItems.length === 0 ? (
            <div className="block md:hidden text-center py-12 text-text-muted font-bold text-xs uppercase tracking-widest opacity-60">
              No equipment assets match the selected filters.
            </div>
          ) : (
            <div className="block md:hidden space-y-3 max-h-[360px] overflow-y-auto pb-4 pr-1">
              {filteredItems.map((item, idx) => {
                const isExpanded = expandedEquipmentId === item._id;
                const initials = item.equipmentName ? item.equipmentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'EQ';
                const statusColor = item.status === 'Available' ? 'success' : item.status === 'Under Maintenance' ? 'warning' : 'danger';

                return (
                  <div
                    key={item._id}
                    className={`border border-white/5 rounded-2xl transition-all ${
                      isExpanded ? 'bg-white/[0.03] shadow-lg' : 'bg-white/[0.01]'
                    }`}
                  >
                    {/* Card Header (Collapsed State) */}
                    <div
                      onClick={() => setViewingAsset(item)}
                      className="p-4 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] shadow-lg border bg-gradient-to-br from-white/10 to-white/5 text-white border-white/5">
                          {initials}
                        </div>
                        <div>
                          <p className="text-xs font-black text-white">{item.equipmentName}</p>
                          <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mt-0.5">
                            {item.category} • Qty: {item.quantity}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Badge variant={statusColor} size="sm">
                          {item.status}
                        </Badge>
                        <button
                          onClick={() => setExpandedEquipmentId(isExpanded ? null : item._id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 text-text-muted hover:text-white"
                        >
                          {isExpanded ? <ChevronUp size={14} className="text-accent" /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Card Body (Expanded State) */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3">
                        {/* Separator */}
                        <div className="h-px bg-white/5 w-full" />
                        
                        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[10px]">
                          <div>
                            <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Quantity</span>
                            <span className="text-white font-extrabold">{item.quantity}</span>
                          </div>
                          <div>
                            <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Category</span>
                            <span className="text-white font-extrabold">{item.category}</span>
                          </div>
                          {item.notes && (
                            <div className="col-span-2">
                              <span className="text-text-muted font-bold block uppercase tracking-wider text-[8px] mb-0.5">Notes</span>
                              <span className="text-white font-extrabold block max-w-full truncate">{item.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* Separator */}
                        <div className="h-px bg-white/5 w-full" />

                        {/* Action Toolbar */}
                        <div className="flex items-center gap-2 pt-1">
                          {/* Status Quick Toggles */}
                          <div className="flex items-center gap-1.5 flex-1">
                            <button
                              onClick={() => toggleStatus(item._id, 'Available')}
                              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all border text-[9px] font-black uppercase tracking-widest ${
                                item.status === 'Available' ? 'bg-success/20 border-success/30 text-success' : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10'
                              }`}
                              title="Set Available"
                            >
                              Available
                            </button>
                            <button
                              onClick={() => toggleStatus(item._id, 'Under Maintenance')}
                              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all border text-[9px] font-black uppercase tracking-widest ${
                                item.status === 'Under Maintenance' ? 'bg-warning/20 border-warning/30 text-warning' : 'bg-white/5 border-white/5 text-text-muted hover:bg-white/10'
                              }`}
                              title="Set Under Maintenance"
                            >
                              Maintenance
                            </button>
                          </div>

                          <div className="w-px h-6 bg-white/5 mx-1" />

                          <button
                            onClick={() => {
                              setIsEditing(item._id);
                              setForm({
                                equipmentName: item.equipmentName,
                                category: item.category,
                                quantity: item.quantity,
                                status: item.status,
                                notes: item.notes || ''
                              });
                              setShowAdd(true);
                            }}
                            className="w-9 h-7 flex items-center justify-center rounded-lg bg-accent/15 text-accent hover:bg-accent hover:text-black border border-accent/20 transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Plus size={12} className="rotate-45" />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="w-9 h-7 flex items-center justify-center rounded-lg bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20 transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </>
        )}
      </div>

      {/* Asset Details Popup Modal */}
      {viewingAsset && (
        <Modal
          isOpen={!!viewingAsset}
          onClose={() => setViewingAsset(null)}
          title="Equipment Details"
          size="md"
        >
          <div className="space-y-4">
            {/* Header Card */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 w-full">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-lg border ${viewingAsset.status === 'Not Available' ? 'bg-gradient-to-br from-red-500/20 to-red-500/5 text-red-200 border-red-500/10' :
                  viewingAsset.status === 'Under Maintenance' ? 'bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-200 border-amber-500/10' :
                    'bg-gradient-to-br from-green-500/20 to-green-500/5 text-green-200 border-green-500/10'
                  }`}>
                  <Wrench size={16} className={
                    viewingAsset.status === 'Not Available' ? 'text-danger' :
                      viewingAsset.status === 'Under Maintenance' ? 'text-warning' :
                        'text-success'
                  } />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>{viewingAsset.equipmentName}</span>
                  </h3>
                  <span className="text-[9px] font-black text-accent uppercase tracking-widest leading-none">{viewingAsset.category}</span>
                </div>
              </div>
              <Badge variant={statusColors[viewingAsset.status]} size="xs" className="font-black uppercase text-[8px] tracking-wider py-0.5 px-1.5 border border-white/5 leading-none shrink-0">
                {viewingAsset.status}
              </Badge>
            </div>

            {/* Details Section */}
            <div className="space-y-2.5 text-[11px]">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="font-bold text-text-muted uppercase tracking-wider">Category</span>
                <span className="font-extrabold text-white uppercase tracking-wider">{viewingAsset.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="font-bold text-text-muted uppercase tracking-wider">Quantity</span>
                <span className="font-extrabold text-white font-mono uppercase tracking-wider">{viewingAsset.quantity}</span>
              </div>
              <div className="flex flex-col gap-1 py-1">
                <span className="font-bold text-text-muted uppercase tracking-wider">Notes</span>
                <p className="font-medium text-text-secondary italic text-xs leading-relaxed bg-white/[0.01] border border-white/5 rounded-xl p-3 mt-1 min-h-[60px]">
                  {viewingAsset.notes ? `"${viewingAsset.notes}"` : 'No notes recorded for this equipment.'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(viewingAsset._id);
                  setForm({
                    equipmentName: viewingAsset.equipmentName,
                    category: viewingAsset.category,
                    quantity: viewingAsset.quantity,
                    status: viewingAsset.status,
                    notes: viewingAsset.notes
                  });
                  setQuantityError('');
                  setShowAdd(true);
                  setViewingAsset(null);
                }}
                className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-accent text-black hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 active:scale-95"
              >
                Edit Asset
              </button>
              <button
                type="button"
                onClick={() => setViewingAsset(null)}
                className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Asset Modal */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setIsEditing(null); setQuantityError(''); }} title={isEditing ? 'Edit Equipment' : 'Add New Equipment'} size="sm" overflowVisible={true}>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Equipment Name *</p>
              <input
                placeholder="Equipment Name"
                value={form.equipmentName}
                onChange={e => setForm({ ...form, equipmentName: e.target.value })}
                required
                className="!py-2 !px-3 !text-[11px] !font-normal !bg-white/[0.02] border border-white/5 !rounded-xl focus:border-accent/30 transition-all outline-none text-white w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Category *</p>
                <Select
                  value={form.category}
                  searchable={false}
                  options={[
                    ...settingsCategories.map(c => ({ label: c, value: c })),
                    { label: 'Other', value: 'Other' }
                  ]}
                  onChange={val => setForm({ ...form, category: val })}
                  className="add-member-select"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Quantity *</p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  placeholder="Quantity *"
                  value={form.quantity}
                  onChange={e => handleQuantityChange(e.target.value)}
                  className="!py-2 !px-3 !text-[11px] !font-normal !bg-white/[0.02] border border-white/5 !rounded-xl focus:border-accent/30 transition-all outline-none text-white font-mono w-full"
                />
                {quantityError && (
                  <p className="text-[10px] text-danger font-bold mt-1 ml-1 animate-in fade-in">
                    {quantityError}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Status *</p>
              <Select
                value={form.status}
                searchable={false}
                options={[
                  { label: 'Available', value: 'Available' },
                  { label: 'Under Maintenance', value: 'Under Maintenance' },
                  { label: 'Not Available', value: 'Not Available' }
                ]}
                onChange={val => setForm({ ...form, status: val })}
                className="add-member-select"
              />
            </div>

            <div className="space-y-1">
              <p className="text-[12px] uppercase tracking-wider text-text-muted font-normal ml-1">Notes</p>
              <textarea
                placeholder="Asset Notes (Recent repairs, maintenance schedule, parts orders...)"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-white/[0.02] border border-white/5 rounded-xl text-[11px] text-white focus:border-accent/30 transition-all outline-none resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1.5">
            <button
              type="button"
              onClick={() => { setShowAdd(false); setIsEditing(null); }}
              className="flex-1 py-2.5 !text-[14px] !font-normal tracking-wide rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95 border border-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-primary !py-2.5 !text-[14px] !font-normal tracking-wide shadow-lg shadow-accent/15 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
            >
              {saving ? 'Processing...' : (isEditing ? 'Update Equipment' : 'Add Equipment')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmState}
        onClose={() => setDeleteConfirmState(null)}
        title={deleteConfirmState?.title || "Confirm Action"}
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-danger/5 border border-danger/10 text-danger">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[12px] font-black uppercase tracking-wider">Warning: Delete Action</h4>
              <p className="text-[12px] text-text-secondary font-medium mt-1 leading-relaxed">
                {deleteConfirmState?.message}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmState(null)}
              className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-primary active:bg-white/20 active:scale-95 border border-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                const onConfirm = deleteConfirmState?.onConfirm;
                setDeleteConfirmState(null);
                if (onConfirm) await onConfirm();
              }}
              className="flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 bg-danger/15 text-danger hover:bg-danger/25 active:scale-95 border border-danger/20"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
