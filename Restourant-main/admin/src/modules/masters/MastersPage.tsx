import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../api/client';
import { appCache } from '../../api/cache';
import { usePermission } from '../../context/PermissionContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { ConfirmDialog, DataTable, Modal, PermissionGate } from '../../components/PermissionGate';
import { MenuCategory, MenuItem } from '../../types';
import { ClipboardList, Edit2, FolderPlus, Plus, Trash2, UtensilsCrossed } from 'lucide-react';

type Tab = 'items' | 'categories';
type ModalKind = 'item' | 'category' | '';

const emptyItem = (categoryId = '', displayOrder = 1) => ({
  name: '', code: '', description: '', categoryId, price: 0, costPrice: 0,
  preparationTimeMinutes: 15, displayOrder, isVeg: true, isAvailable: true
});

export const MastersPage: React.FC = () => {
  const { can } = usePermission();
  const cachedItems = appCache.get('/masters/menu-items')?.data || appCache.get('/masters/menu-items');
  const cachedCategories = appCache.get('/masters/menu-categories')?.data || appCache.get('/masters/menu-categories');
  const [items, setItems] = useState<MenuItem[]>(() => Array.isArray(cachedItems) ? cachedItems : []);
  const [categories, setCategories] = useState<MenuCategory[]>(() => Array.isArray(cachedCategories) ? cachedCategories : []);
  const [tab, setTab] = useState<Tab>('items');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'SOLD_OUT'>('ALL');
  const [modalKind, setModalKind] = useState<ModalKind>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; kind: ModalKind; name: string } | null>(null);

  const loadMenu = async (forceFresh = false) => {
    try {
      const config = forceFresh ? { forceFresh: true } : undefined;
      const [itemResult, categoryResult]: any = await Promise.all([
        apiClient.get('/masters/menu-items', config), apiClient.get('/masters/menu-categories', config)
      ]);
      if (itemResult?.success && Array.isArray(itemResult.data)) setItems(itemResult.data);
      if (categoryResult?.success && Array.isArray(categoryResult.data)) setCategories(categoryResult.data);
    } catch (error) { console.error('Unable to load menu bar data', error); }
  };

  useEffect(() => { loadMenu(true); }, []);
  useAutoRefresh(() => loadMenu(true), { entities: ['masters', 'menu', 'categories'], intervalMs: 3000, refreshOnFocus: true });

  const activeCategories = useMemo(() => categories.filter(category => category.isActive !== false), [categories]);
  const filteredItems = useMemo(() => items.filter(item =>
    (categoryFilter === 'ALL' || item.categoryId === categoryFilter) &&
    (availabilityFilter === 'ALL' || (availabilityFilter === 'AVAILABLE' ? item.isAvailable : !item.isAvailable))
  ), [items, categoryFilter, availabilityFilter]);
  const categoryName = (id: string) => categories.find(category => category.id === id)?.name || 'Uncategorised';
  const nextItemOrder = items.length ? Math.max(...items.map(item => Number(item.displayOrder) || 0)) + 1 : 1;
  const nextCategoryOrder = categories.length ? Math.max(...categories.map(category => Number(category.displayOrder) || 0)) + 1 : 1;

  const openModal = (kind: Exclude<ModalKind, ''>, record?: MenuItem | MenuCategory) => {
    setModalKind(kind); setEditingId(record?.id || null);
    if (record) setForm({ ...record });
    else if (kind === 'item') setForm(emptyItem(activeCategories[0]?.id || categories[0]?.id || '', nextItemOrder));
    else setForm({ name: '', code: '', description: '', displayOrder: nextCategoryOrder, isActive: true });
  };
  const closeModal = () => { setModalKind(''); setEditingId(null); setForm({}); };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const isItem = modalKind === 'item';
    const endpoint = isItem ? '/masters/menu-items' : '/masters/menu-categories';
    const payload = isItem
      ? { ...form, name: form.name?.trim(), code: form.code?.trim().toUpperCase(), description: form.description?.trim() || '', price: Number(form.price), costPrice: Number(form.costPrice || 0), displayOrder: Number(form.displayOrder || 1), preparationTimeMinutes: Number(form.preparationTimeMinutes || 0) }
      : { ...form, name: form.name?.trim(), code: form.code?.trim().toUpperCase(), description: form.description?.trim() || '', displayOrder: Number(form.displayOrder || 1), isActive: form.isActive !== false };
    try {
      if (editingId) await apiClient.put(`${endpoint}/${editingId}`, payload); else await apiClient.post(endpoint, payload);
      closeModal(); loadMenu(true);
    } catch (error: any) { alert(error.message || 'Unable to save this menu record.'); }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      const endpoint = deleteTarget.kind === 'item' ? '/masters/menu-items' : '/masters/menu-categories';
      await apiClient.delete(`${endpoint}/${deleteTarget.id}`); setDeleteTarget(null); loadMenu(true);
    } catch (error: any) { alert(error.message || 'Unable to delete this record.'); }
  };

  const toggleAvailability = async (id: string, isAvailable: boolean) => {
    try {
      await apiClient.patch(`/masters/menu-items/${id}/availability`, { isAvailable });
      setItems(current => current.map(item => item.id === id ? { ...item, isAvailable } : item));
    } catch (error: any) { alert(error.message || 'Unable to change availability.'); }
  };

  const title = modalKind === 'item' ? `${editingId ? 'Edit' : 'Add'} Food Item` : `${editingId ? 'Edit' : 'Add'} Category`;
  const productCount = items.filter(item => item.isAvailable).length;

  return <div className="d-flex flex-column gap-4">
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div><div className="d-flex align-items-center gap-2 mb-1"><UtensilsCrossed size={22} className="text-primary" /><h4 className="fw-bold mb-0 text-dark">Menu Bar</h4></div><p className="text-muted small mb-0">Create, organise and control the food items your team can sell.</p></div>
      {can('masters.menu.create') && <div className="d-flex gap-2"><button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={() => openModal('category')}><FolderPlus size={16} /> Add Category</button><button className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm" onClick={() => openModal('item')}><Plus size={16} /> Add Food Item</button></div>}
    </div>
    <div className="row g-3">
      <Metric icon={<ClipboardList size={21} />} tone="primary" label="Food items" value={items.length} />
      <Metric icon={<UtensilsCrossed size={21} />} tone="success" label="Available now" value={productCount} />
      <Metric icon={<FolderPlus size={21} />} tone="warning" label="Menu categories" value={categories.length} />
    </div>
    <ul className="nav nav-pills bg-white p-2 rounded shadow-sm border gap-1 scrollable-pills-container"><li className="nav-item"><button className={`nav-link btn-sm text-nowrap ${tab === 'items' ? 'active fw-bold' : ''}`} onClick={() => setTab('items')}>Food Items ({items.length})</button></li><li className="nav-item"><button className={`nav-link btn-sm text-nowrap ${tab === 'categories' ? 'active fw-bold' : ''}`} onClick={() => setTab('categories')}>Categories ({categories.length})</button></li></ul>
    {tab === 'items' && <><div className="card border-0 shadow-sm"><div className="card-body py-3 d-flex flex-column flex-lg-row align-items-lg-center gap-3"><div className="small fw-bold text-dark me-lg-2">Filter food items</div><div className="d-flex flex-column flex-sm-row gap-2 flex-grow-1"><select className="form-select form-select-sm" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} style={{ maxWidth: 260 }}><option value="ALL">All categories ({items.length})</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name} ({items.filter(item => item.categoryId === category.id).length})</option>)}</select><select className="form-select form-select-sm" value={availabilityFilter} onChange={event => setAvailabilityFilter(event.target.value as 'ALL' | 'AVAILABLE' | 'SOLD_OUT')} style={{ maxWidth: 190 }}><option value="ALL">All availability</option><option value="AVAILABLE">Available now</option><option value="SOLD_OUT">Sold out</option></select>{(categoryFilter !== 'ALL' || availabilityFilter !== 'ALL') && <button className="btn btn-outline-secondary btn-sm" onClick={() => { setCategoryFilter('ALL'); setAvailabilityFilter('ALL'); }}>Clear filters</button>}</div><span className="small text-muted text-nowrap">{filteredItems.length} item{filteredItems.length === 1 ? '' : 's'} shown</span></div></div>
    <DataTable<MenuItem>
      columns={[
        { header: 'Code', accessor: row => <span className="font-monospace small">{row.code}</span>, width: 110 },
        { header: 'Food Item', accessor: row => <div><span className={`badge me-2 ${row.isVeg ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.65rem' }}>{row.isVeg ? 'VEG' : 'NON-VEG'}</span><span className="fw-bold">{row.name}</span>{row.description && <div className="small text-muted text-truncate" style={{ maxWidth: 240 }}>{row.description}</div>}</div> },
        { header: 'Category', accessor: row => categoryName(row.categoryId) },
        { header: 'Price', accessor: row => <span className="fw-bold">₹{Number(row.price || 0).toLocaleString('en-IN')}</span>, width: 120 },
        { header: 'Prep time', accessor: row => `${row.preparationTimeMinutes || 0} min`, width: 110 },
        { header: 'Availability', accessor: row => <PermissionGate permission="masters.menu.availability" fallback={<span className={`badge ${row.isAvailable ? 'bg-success' : 'bg-secondary'}`}>{row.isAvailable ? 'Available' : 'Sold out'}</span>}><div className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={row.isAvailable} onChange={event => toggleAvailability(row.id, event.target.checked)} aria-label={`Set ${row.name} availability`} /></div></PermissionGate>, width: 120 }
      ]} data={filteredItems} searchPlaceholder="Search food item, code or category..." searchField={row => `${row.name} ${row.code} ${row.description || ''} ${categoryName(row.categoryId)}`}
      actions={row => <>{can('masters.menu.edit') && <button className="btn btn-outline-primary btn-sm p-1" onClick={() => openModal('item', row)} title={`Edit ${row.name}`}><Edit2 size={14} /></button>}{can('masters.menu.delete') && <button className="btn btn-outline-danger btn-sm p-1" onClick={() => setDeleteTarget({ id: row.id, kind: 'item', name: row.name })} title={`Delete ${row.name}`}><Trash2 size={14} /></button>}</>}
    /></>}
    {tab === 'categories' && <DataTable<MenuCategory>
      columns={[
        { header: 'Code', accessor: row => <span className="badge bg-dark font-monospace">{row.code}</span>, width: 120 },
        { header: 'Category', accessor: row => <div><span className="fw-bold text-dark">{row.name}</span>{row.description && <div className="small text-muted text-truncate" style={{ maxWidth: 340 }}>{row.description}</div>}</div> },
        { header: 'Products', accessor: row => <span className="badge bg-primary">{items.filter(item => item.categoryId === row.id).length} items</span>, width: 110 },
        { header: 'Order', accessor: row => <span className="badge bg-light text-dark border">#{row.displayOrder}</span>, width: 90 },
        { header: 'Status', accessor: row => <span className={`badge ${row.isActive !== false ? 'bg-success' : 'bg-secondary'}`}>{row.isActive !== false ? 'Active' : 'Inactive'}</span>, width: 100 }
      ]} data={categories} searchPlaceholder="Search categories..." searchField={row => `${row.name} ${row.code} ${row.description || ''}`}
      actions={row => <>{can('masters.menu.edit') && <button className="btn btn-outline-primary btn-sm p-1" onClick={() => openModal('category', row)} title={`Edit ${row.name}`}><Edit2 size={14} /></button>}{can('masters.menu.delete') && <button className="btn btn-outline-danger btn-sm p-1" onClick={() => setDeleteTarget({ id: row.id, kind: 'category', name: row.name })} title={`Delete ${row.name}`}><Trash2 size={14} /></button>}</>}
    />}
    <Modal isOpen={!!modalKind} onClose={closeModal} title={title} size="lg"><form onSubmit={save} className="d-flex flex-column gap-3">
      {modalKind === 'item' && <ItemForm form={form} setForm={setForm} categories={categories} disabled={!categories.length} />}
      {modalKind === 'category' && <CategoryForm form={form} setForm={setForm} />}
      <div className="d-flex justify-content-end gap-2 border-top pt-3 mt-1"><button type="button" className="btn btn-light" onClick={closeModal}>Cancel</button><button type="submit" className="btn btn-primary" disabled={modalKind === 'item' && !categories.length}>{editingId ? 'Save changes' : `Add ${modalKind === 'item' ? 'food item' : 'category'}`}</button></div>
    </form></Modal>
    <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={remove} title={`Delete ${deleteTarget?.kind === 'item' ? 'Food Item' : 'Category'}?`} message={`Are you sure you want to permanently delete “${deleteTarget?.name || ''}”? This action cannot be undone.`} />
  </div>;
};

const Metric: React.FC<{ icon: React.ReactNode; tone: string; label: string; value: number }> = ({ icon, tone, label, value }) => <div className="col-12 col-sm-4"><div className="card border-0 shadow-sm h-100"><div className="card-body py-3 d-flex align-items-center gap-3"><div className={`rounded-circle bg-${tone}-subtle text-${tone} p-2`}>{icon}</div><div><div className="text-muted small">{label}</div><div className="fw-bold fs-5">{value}</div></div></div></div></div>;

const ItemForm: React.FC<{ form: any; setForm: (value: any) => void; categories: MenuCategory[]; disabled: boolean }> = ({ form, setForm, categories, disabled }) => <>
  {disabled && <div className="alert alert-warning small mb-0">Create a category first, then add food items to it.</div>}
  <div className="row g-3"><Field label="Food item name" required className="col-md-8"><input className="form-control" required value={form.name || ''} placeholder="e.g. Paneer Tikka" onChange={e => setForm({ ...form, name: e.target.value })} /></Field><Field label="Item code" required className="col-md-4"><input className="form-control text-uppercase" required value={form.code || ''} placeholder="e.g. PT-01" onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field></div>
  <Field label="Description" optional><textarea className="form-control" rows={2} value={form.description || ''} placeholder="A short description for staff and menus" onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
  <div className="row g-3"><Field label="Category" required className="col-md-4"><select className="form-select" required disabled={disabled} value={form.categoryId || ''} onChange={e => setForm({ ...form, categoryId: e.target.value })}><option value="" disabled>Select category</option>{categories.map(category => <option key={category.id} value={category.id} disabled={category.isActive === false}>{category.name}{category.isActive === false ? ' (inactive)' : ''}</option>)}</select></Field><NumberField label="Selling price (₹)" required className="col-md-4" value={form.price} onChange={(value: string) => setForm({ ...form, price: value })} step="0.01" /><NumberField label="Cost price (₹)" className="col-md-4" value={form.costPrice} onChange={(value: string) => setForm({ ...form, costPrice: value })} step="0.01" /></div>
  <div className="row g-3"><NumberField label="Preparation time (minutes)" className="col-md-4" value={form.preparationTimeMinutes} onChange={(value: string) => setForm({ ...form, preparationTimeMinutes: value })} /><NumberField label="Display order" className="col-md-3" value={form.displayOrder} onChange={(value: string) => setForm({ ...form, displayOrder: value })} min="1" /><div className="col-md-5 d-flex align-items-end gap-4 pb-2"><Switch id="isVeg" label="Vegetarian" checked={form.isVeg !== false} onChange={(checked: boolean) => setForm({ ...form, isVeg: checked })} /><Switch id="isAvailable" label="Available" checked={form.isAvailable !== false} onChange={(checked: boolean) => setForm({ ...form, isAvailable: checked })} /></div></div>
</>;

const CategoryForm: React.FC<{ form: any; setForm: (value: any) => void }> = ({ form, setForm }) => <><div className="row g-3"><Field label="Category name" required className="col-md-8"><input className="form-control" required value={form.name || ''} placeholder="e.g. Starters, Main Course or Beverages" onChange={e => setForm({ ...form, name: e.target.value })} /></Field><Field label="Category code" required className="col-md-4"><input className="form-control text-uppercase" required value={form.code || ''} placeholder="e.g. STARTER" onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field></div><Field label="Description" optional><textarea className="form-control" rows={2} value={form.description || ''} placeholder="Describe the food items grouped here" onChange={e => setForm({ ...form, description: e.target.value })} /></Field><div className="row g-3"><NumberField label="Display order" className="col-md-4" value={form.displayOrder} min="1" onChange={(value: string) => setForm({ ...form, displayOrder: value })} /><div className="col-md-8 d-flex align-items-end pb-2"><Switch id="categoryActive" label="Active category" checked={form.isActive !== false} onChange={(checked: boolean) => setForm({ ...form, isActive: checked })} /></div></div></>;

const Field: React.FC<{ label: string; children: React.ReactNode; required?: boolean; optional?: boolean; className?: string }> = ({ label, children, required, optional, className = '' }) => <div className={className}><label className="form-label small fw-bold">{label} {required && <span className="text-danger">*</span>}{optional && <span className="text-muted fw-normal">(optional)</span>}</label>{children}</div>;
const NumberField: React.FC<{ label: string; value: any; onChange: (value: string) => void; className?: string; required?: boolean; min?: string; step?: string }> = ({ label, value, onChange, className, required, min = '0', step = '1' }) => <Field label={label} required={required} className={className}><input type="number" min={min} step={step} className="form-control" required={required} value={value ?? 0} onChange={e => onChange(e.target.value)} /></Field>;
const Switch: React.FC<{ id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ id, label, checked, onChange }) => <div className="form-check form-switch"><input className="form-check-input" id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><label className="form-check-label small fw-bold" htmlFor={id}>{label}</label></div>;
