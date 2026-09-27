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
type MealPeriod = 'LUNCH' | 'DINNER';

export const MastersPage: React.FC = () => {
  const { can } = usePermission();
  const cachedItems = appCache.get('/masters/menu-items')?.data || appCache.get('/masters/menu-items');
  const cachedCategories = appCache.get('/masters/menu-categories')?.data || appCache.get('/masters/menu-categories');
  const [items, setItems] = useState<MenuItem[]>(() => Array.isArray(cachedItems) ? cachedItems : []);
  const [categories, setCategories] = useState<MenuCategory[]>(() => Array.isArray(cachedCategories) ? cachedCategories : []);
  const [tab, setTab] = useState<Tab>('items');

  // Strict Meal Timing filter: ONLY LUNCH or DINNER (no 'ALL')
  const [mealTimingFilter, setMealTimingFilter] = useState<MealPeriod>('LUNCH');
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
        apiClient.get('/masters/menu-items', config),
        apiClient.get('/masters/menu-categories', config)
      ]);
      if (itemResult?.success && Array.isArray(itemResult.data)) setItems(itemResult.data);
      if (categoryResult?.success && Array.isArray(categoryResult.data)) setCategories(categoryResult.data);
    } catch (error) {
      console.error('Unable to load menu bar data', error);
    }
  };

  useEffect(() => { loadMenu(true); }, []);
  useAutoRefresh(() => loadMenu(true), { entities: ['masters', 'menu', 'categories'], intervalMs: 3000, refreshOnFocus: true });

  // Filter categories strictly by meal timing
  const timingCategories = useMemo(() => {
    return categories.filter(category => (category.mealPeriod || 'LUNCH') === mealTimingFilter);
  }, [categories, mealTimingFilter]);

  // Filter items strictly by meal timing and other filters
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const itemCat = categories.find(c => c.id === item.categoryId);
      const itemMeal = item.mealPeriod || itemCat?.mealPeriod || 'LUNCH';
      if (itemMeal !== mealTimingFilter) return false;

      if (categoryFilter !== 'ALL' && item.categoryId !== categoryFilter) return false;
      if (availabilityFilter === 'AVAILABLE' && !item.isAvailable) return false;
      if (availabilityFilter === 'SOLD_OUT' && item.isAvailable) return false;
      return true;
    });
  }, [items, categories, mealTimingFilter, categoryFilter, availabilityFilter]);

  const categoryName = (id: string) => categories.find(category => category.id === id)?.name || 'Uncategorised';
  const nextItemOrder = items.length ? Math.max(...items.map(item => Number(item.displayOrder) || 0)) + 1 : 1;
  const nextCategoryOrder = categories.length ? Math.max(...categories.map(category => Number(category.displayOrder) || 0)) + 1 : 1;

  const handleMealTimingChange = (timing: MealPeriod) => {
    setMealTimingFilter(timing);
    setCategoryFilter('ALL');
  };

  const openModal = (kind: Exclude<ModalKind, ''>, record?: MenuItem | MenuCategory) => {
    setModalKind(kind);
    setEditingId(record?.id || null);
    if (record) {
      const recMealPeriod = (record as any).mealPeriod ||
        (kind === 'item' ? (categories.find(c => c.id === (record as MenuItem).categoryId)?.mealPeriod || 'LUNCH') : 'LUNCH');
      setForm({ ...record, mealPeriod: recMealPeriod });
    } else if (kind === 'item') {
      const activeCatsForTiming = categories.filter(c => (c.mealPeriod || 'LUNCH') === mealTimingFilter && c.isActive !== false);
      setForm({
        name: '',
        code: '',
        description: '',
        categoryId: activeCatsForTiming[0]?.id || '',
        mealPeriod: mealTimingFilter,
        price: 0,
        costPrice: 0,
        preparationTimeMinutes: 10,
        displayOrder: nextItemOrder,
        isVeg: true,
        isAvailable: true
      });
    } else {
      setForm({
        name: '',
        code: '',
        description: '',
        mealPeriod: mealTimingFilter,
        displayOrder: nextCategoryOrder,
        isActive: true
      });
    }
  };

  const closeModal = () => {
    setModalKind('');
    setEditingId(null);
    setForm({});
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const isItem = modalKind === 'item';
    const endpoint = isItem ? '/masters/menu-items' : '/masters/menu-categories';
    const payload = isItem
      ? {
          ...form,
          name: form.name?.trim(),
          code: form.code?.trim().toUpperCase(),
          description: form.description?.trim() || '',
          mealPeriod: form.mealPeriod || 'LUNCH',
          price: Number(form.price || 0),
          costPrice: Number(form.costPrice || 0),
          displayOrder: Number(form.displayOrder || nextItemOrder),
          preparationTimeMinutes: Number(form.preparationTimeMinutes || 10)
        }
      : {
          ...form,
          name: form.name?.trim(),
          code: form.code?.trim().toUpperCase(),
          description: form.description?.trim() || '',
          mealPeriod: form.mealPeriod || 'LUNCH',
          displayOrder: Number(form.displayOrder || nextCategoryOrder),
          isActive: form.isActive !== false
        };
    try {
      if (editingId) {
        await apiClient.put(`${endpoint}/${editingId}`, payload);
      } else {
        await apiClient.post(endpoint, payload);
      }
      closeModal();
      loadMenu(true);
    } catch (error: any) {
      alert(error.message || 'Unable to save this menu record.');
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      const endpoint = deleteTarget.kind === 'item' ? '/masters/menu-items' : '/masters/menu-categories';
      await apiClient.delete(`${endpoint}/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadMenu(true);
    } catch (error: any) {
      alert(error.message || 'Unable to delete this record.');
    }
  };

  const toggleAvailability = async (id: string, isAvailable: boolean) => {
    try {
      await apiClient.patch(`/masters/menu-items/${id}/availability`, { isAvailable });
      setItems(current => current.map(item => item.id === id ? { ...item, isAvailable } : item));
    } catch (error: any) {
      alert(error.message || 'Unable to change availability.');
    }
  };

  const title = modalKind === 'item'
    ? `${editingId ? 'Edit' : 'Add'} Food Item`
    : `${editingId ? 'Edit' : 'Add'} Category`;

  const availableInTiming = filteredItems.filter(item => item.isAvailable).length;

  return (
    <div className="d-flex flex-column gap-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <UtensilsCrossed size={22} className="text-primary" />
            <h4 className="fw-bold mb-0 text-dark">Menu Bar</h4>
          </div>
          <p className="text-muted small mb-0">Create, organise and manage restaurant categories and food items.</p>
        </div>
        {can('masters.menu.create') && (
          <div className="d-flex gap-2">
            <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1.5 shadow-xs" onClick={() => openModal('category')}>
              <FolderPlus size={16} /> Add Category
            </button>
            <button className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 shadow-sm" onClick={() => openModal('item')}>
              <Plus size={16} /> Add Food Item
            </button>
          </div>
        )}
      </div>

      {/* Clean, Modern Segmented Control: STRICT LUNCH vs DINNER */}
      <div className="card border-0 shadow-sm bg-white">
        <div className="card-body p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <span className="fw-bold text-dark small">સમય (Timing):</span>
            <div className="d-inline-flex bg-light p-1 rounded-3 border" role="group">
              <button
                type="button"
                className={`btn btn-sm px-4 py-1.5 fw-bold rounded-2 transition-all ${
                  mealTimingFilter === 'LUNCH'
                    ? 'btn-white bg-white text-primary shadow-xs'
                    : 'text-muted border-0 bg-transparent'
                }`}
                onClick={() => handleMealTimingChange('LUNCH')}
              >
                <span>બપોર (Lunch)</span>
                <span className={`badge ms-2 rounded-pill ${mealTimingFilter === 'LUNCH' ? 'bg-primary text-white' : 'bg-secondary-subtle text-muted'}`}>
                  {categories.filter(c => (c.mealPeriod || 'LUNCH') === 'LUNCH').length}
                </span>
              </button>
              <button
                type="button"
                className={`btn btn-sm px-4 py-1.5 fw-bold rounded-2 transition-all ${
                  mealTimingFilter === 'DINNER'
                    ? 'btn-white bg-white text-dark shadow-xs'
                    : 'text-muted border-0 bg-transparent'
                }`}
                onClick={() => handleMealTimingChange('DINNER')}
              >
                <span>સાંજ (Dinner)</span>
                <span className={`badge ms-2 rounded-pill ${mealTimingFilter === 'DINNER' ? 'bg-dark text-white' : 'bg-secondary-subtle text-muted'}`}>
                  {categories.filter(c => c.mealPeriod === 'DINNER').length}
                </span>
              </button>
            </div>
          </div>

          <div className="text-muted small">
            હાલમાં <strong className="text-dark">{mealTimingFilter === 'LUNCH' ? 'બપોર (Lunch)' : 'સાંજ (Dinner)'}</strong> નું મેનુ દર્શાવેલ છે
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="row g-3">
        <Metric
          icon={<ClipboardList size={20} />}
          tone="primary"
          label={mealTimingFilter === 'LUNCH' ? 'Lunch Food Items' : 'Dinner Food Items'}
          value={filteredItems.length}
        />
        <Metric
          icon={<UtensilsCrossed size={20} />}
          tone="success"
          label="Available now"
          value={availableInTiming}
        />
        <Metric
          icon={<FolderPlus size={20} />}
          tone="warning"
          label={mealTimingFilter === 'LUNCH' ? 'Lunch Categories' : 'Dinner Categories'}
          value={timingCategories.length}
        />
      </div>

      {/* Main Tabs (Food Items / Categories) */}
      <ul className="nav nav-pills bg-white p-2 rounded shadow-sm border gap-1 scrollable-pills-container">
        <li className="nav-item">
          <button
            className={`nav-link btn-sm text-nowrap ${tab === 'items' ? 'active fw-bold' : ''}`}
            onClick={() => setTab('items')}
          >
            Food Items ({filteredItems.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link btn-sm text-nowrap ${tab === 'categories' ? 'active fw-bold' : ''}`}
            onClick={() => setTab('categories')}
          >
            Categories ({timingCategories.length})
          </button>
        </li>
      </ul>

      {/* Food Items Tab */}
      {tab === 'items' && (
        <>
          <div className="card border-0 shadow-sm">
            <div className="card-body py-3 d-flex flex-column flex-lg-row align-items-lg-center gap-3">
              <div className="small fw-bold text-dark me-lg-2">
                Filter {mealTimingFilter === 'LUNCH' ? 'Lunch' : 'Dinner'} items
              </div>
              <div className="d-flex flex-column flex-sm-row gap-2 flex-grow-1">
                <select
                  className="form-select form-select-sm"
                  value={categoryFilter}
                  onChange={event => setCategoryFilter(event.target.value)}
                  style={{ maxWidth: 260 }}
                >
                  <option value="ALL">All {mealTimingFilter === 'LUNCH' ? 'Lunch' : 'Dinner'} categories ({timingCategories.length})</option>
                  {timingCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({items.filter(item => item.categoryId === category.id).length})
                    </option>
                  ))}
                </select>
                <select
                  className="form-select form-select-sm"
                  value={availabilityFilter}
                  onChange={event => setAvailabilityFilter(event.target.value as 'ALL' | 'AVAILABLE' | 'SOLD_OUT')}
                  style={{ maxWidth: 190 }}
                >
                  <option value="ALL">All availability</option>
                  <option value="AVAILABLE">Available now</option>
                  <option value="SOLD_OUT">Sold out</option>
                </select>
                {(categoryFilter !== 'ALL' || availabilityFilter !== 'ALL') && (
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => { setCategoryFilter('ALL'); setAvailabilityFilter('ALL'); }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <span className="small text-muted text-nowrap">
                {filteredItems.length} item{filteredItems.length === 1 ? '' : 's'} shown
              </span>
            </div>
          </div>

          <DataTable<MenuItem>
            columns={[
              {
                header: 'Code',
                accessor: row => <span className="font-monospace small">{row.code}</span>,
                width: 100
              },
              {
                header: 'Food Item',
                accessor: row => (
                  <div>
                    <span className={`badge me-2 ${row.isVeg ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '0.65rem' }}>
                      {row.isVeg ? 'VEG' : 'NON-VEG'}
                    </span>
                    <span className="fw-bold">{row.name}</span>
                    {row.description && <div className="small text-muted text-truncate" style={{ maxWidth: 280 }}>{row.description}</div>}
                  </div>
                )
              },
              {
                header: 'Category',
                accessor: row => categoryName(row.categoryId)
              },
              {
                header: 'Timing',
                accessor: row => {
                  const cat = categories.find(c => c.id === row.categoryId);
                  const isDinner = (row.mealPeriod || cat?.mealPeriod) === 'DINNER';
                  return (
                    <span className={`badge ${isDinner ? 'bg-dark text-white' : 'bg-light text-dark border'}`} style={{ fontSize: '0.72rem' }}>
                      {isDinner ? 'Dinner (સાંજ)' : 'Lunch (બપોર)'}
                    </span>
                  );
                },
                width: 130
              },
              {
                header: 'Availability',
                accessor: row => (
                  <PermissionGate
                    permission="masters.menu.availability"
                    fallback={<span className={`badge ${row.isAvailable ? 'bg-success' : 'bg-secondary'}`}>{row.isAvailable ? 'Available' : 'Sold out'}</span>}
                  >
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={row.isAvailable}
                        onChange={event => toggleAvailability(row.id, event.target.checked)}
                        aria-label={`Set ${row.name} availability`}
                      />
                    </div>
                  </PermissionGate>
                ),
                width: 120
              }
            ]}
            data={filteredItems}
            searchPlaceholder="Search food item, code or category..."
            searchField={row => `${row.name} ${row.code} ${row.description || ''} ${categoryName(row.categoryId)}`}
            actions={row => (
              <>
                {can('masters.menu.edit') && (
                  <button className="btn btn-outline-primary btn-sm p-1" onClick={() => openModal('item', row)} title={`Edit ${row.name}`}>
                    <Edit2 size={14} />
                  </button>
                )}
                {can('masters.menu.delete') && (
                  <button className="btn btn-outline-danger btn-sm p-1" onClick={() => setDeleteTarget({ id: row.id, kind: 'item', name: row.name })} title={`Delete ${row.name}`}>
                    <Trash2 size={14} />
                  </button>
                )}
              </>
            )}
          />
        </>
      )}

      {/* Categories Tab */}
      {tab === 'categories' && (
        <DataTable<MenuCategory>
          columns={[
            {
              header: 'Code',
              accessor: row => <span className="badge bg-dark font-monospace">{row.code}</span>,
              width: 120
            },
            {
              header: 'Category',
              accessor: row => (
                <div>
                  <span className="fw-bold text-dark">{row.name}</span>
                  {row.description && <div className="small text-muted text-truncate" style={{ maxWidth: 340 }}>{row.description}</div>}
                </div>
              )
            },
            {
              header: 'Timing',
              accessor: row => {
                const isDinner = row.mealPeriod === 'DINNER';
                return (
                  <span className={`badge ${isDinner ? 'bg-dark text-white' : 'bg-light text-dark border'}`} style={{ fontSize: '0.72rem' }}>
                    {isDinner ? 'Dinner (સાંજ)' : 'Lunch (બપોર)'}
                  </span>
                );
              },
              width: 130
            },
            {
              header: 'Products',
              accessor: row => (
                <span className="badge bg-primary">
                  {items.filter(item => item.categoryId === row.id).length} items
                </span>
              ),
              width: 110
            },
            {
              header: 'Status',
              accessor: row => (
                <span className={`badge ${row.isActive !== false ? 'bg-success' : 'bg-secondary'}`}>
                  {row.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              ),
              width: 100
            }
          ]}
          data={timingCategories}
          searchPlaceholder="Search categories..."
          searchField={row => `${row.name} ${row.code} ${row.description || ''}`}
          actions={row => (
            <>
              {can('masters.menu.edit') && (
                <button className="btn btn-outline-primary btn-sm p-1" onClick={() => openModal('category', row)} title={`Edit ${row.name}`}>
                  <Edit2 size={14} />
                </button>
              )}
              {can('masters.menu.delete') && (
                <button className="btn btn-outline-danger btn-sm p-1" onClick={() => setDeleteTarget({ id: row.id, kind: 'category', name: row.name })} title={`Delete ${row.name}`}>
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
        />
      )}

      {/* Modal Dialog */}
      <Modal isOpen={!!modalKind} onClose={closeModal} title={title} size="lg">
        <form onSubmit={save} className="d-flex flex-column gap-3">
          {modalKind === 'item' && (
            <ItemForm
              form={form}
              setForm={setForm}
              allCategories={categories}
            />
          )}
          {modalKind === 'category' && (
            <CategoryForm
              form={form}
              setForm={setForm}
            />
          )}
          <div className="d-flex justify-content-end gap-2 border-top pt-3 mt-1">
            <button type="button" className="btn btn-light btn-sm" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={modalKind === 'item' && !categories.some(c => (c.mealPeriod || 'LUNCH') === (form.mealPeriod || 'LUNCH') && c.isActive !== false)}
            >
              {editingId ? 'Save changes' : `Add ${modalKind === 'item' ? 'food item' : 'category'}`}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title={`Delete ${deleteTarget?.kind === 'item' ? 'Food Item' : 'Category'}?`}
        message={`Are you sure you want to permanently delete “${deleteTarget?.name || ''}”? This action cannot be undone.`}
      />
    </div>
  );
};

const Metric: React.FC<{ icon: React.ReactNode; tone: string; label: string; value: number }> = ({ icon, tone, label, value }) => (
  <div className="col-12 col-sm-4">
    <div className="card border-0 shadow-sm h-100">
      <div className="card-body py-3 d-flex align-items-center gap-3">
        <div className={`rounded-circle bg-${tone}-subtle text-${tone} p-2`}>{icon}</div>
        <div>
          <div className="text-muted small">{label}</div>
          <div className="fw-bold fs-5">{value}</div>
        </div>
      </div>
    </div>
  </div>
);

// ITEM FORM: Clean, professional UI. Strictly filtered by selected meal timing. Price, Cost Price, Prep Time, Display Order completely removed!
const ItemForm: React.FC<{
  form: any;
  setForm: (value: any) => void;
  allCategories: MenuCategory[];
}> = ({ form, setForm, allCategories }) => {
  const currentTiming: MealPeriod = form.mealPeriod || 'LUNCH';

  // Strictly filter categories matching currentTiming
  const matchingCategories = useMemo(() => {
    return allCategories.filter(category => (category.mealPeriod || 'LUNCH') === currentTiming);
  }, [allCategories, currentTiming]);

  const activeMatchingCategories = useMemo(() => {
    return matchingCategories.filter(category => category.isActive !== false);
  }, [matchingCategories]);

  // Handle timing change: switches mealPeriod and automatically sets categoryId to first valid category
  const handleTimingSelect = (timing: MealPeriod) => {
    const validCats = allCategories.filter(c => (c.mealPeriod || 'LUNCH') === timing && c.isActive !== false);
    setForm({
      ...form,
      mealPeriod: timing,
      categoryId: validCats[0]?.id || ''
    });
  };

  return (
    <>
      {/* Clean Segmented Control for Meal Timing */}
      <div className="p-3 bg-light rounded-3 border">
        <label className="form-label small fw-bold mb-2 text-dark">
          જમવાનો સમય (Meal Timing) <span className="text-danger">*</span>
        </label>
        <div className="d-flex gap-2">
          <button
            type="button"
            className={`btn btn-sm py-2 px-4 fw-bold flex-grow-1 transition-all ${
              currentTiming === 'LUNCH'
                ? 'btn-primary text-white shadow-xs'
                : 'btn-outline-secondary bg-white'
            }`}
            onClick={() => handleTimingSelect('LUNCH')}
          >
            બપોર (Lunch)
          </button>
          <button
            type="button"
            className={`btn btn-sm py-2 px-4 fw-bold flex-grow-1 transition-all ${
              currentTiming === 'DINNER'
                ? 'btn-dark text-white shadow-xs'
                : 'btn-outline-secondary bg-white'
            }`}
            onClick={() => handleTimingSelect('DINNER')}
          >
            સાંજ (Dinner)
          </button>
        </div>
        <div className="small text-muted mt-2">
          {currentTiming === 'LUNCH'
            ? 'આ વાનગી બપોરના મેનુ માટે ઉમેરાશે અને ફક્ત બપોરની કેટેગરીમાં દેખાશે.'
            : 'આ વાનગી સાંજના મેનુ માટે ઉમેરાશે અને ફક્ત સાંજની કેટેગરીમાં દેખાશે.'}
        </div>
      </div>

      {/* Category Dropdown - STRICTLY MATCHING SELECTED TIMING */}
      <Field label="કેટેગરી (Category)" required>
        {activeMatchingCategories.length === 0 ? (
          <div className="alert alert-warning small mb-0 py-2">
            {currentTiming === 'LUNCH' ? 'બપોર (Lunch)' : 'સાંજ (Dinner)'} માટે કોઈ સક્રિય કેટેગરી નથી. કૃપા કરીને પહેલા કેટેગરી ઉમેરો.
          </div>
        ) : (
          <select
            className="form-select"
            required
            value={form.categoryId || ''}
            onChange={e => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="" disabled>Select {currentTiming === 'LUNCH' ? 'Lunch' : 'Dinner'} Category</option>
            {matchingCategories.map(category => (
              <option key={category.id} value={category.id} disabled={category.isActive === false}>
                {category.name}{category.isActive === false ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        )}
      </Field>

      {/* Food Item Name & Code */}
      <div className="row g-3">
        <Field label="Food item name" required className="col-md-8">
          <input
            className="form-control"
            required
            value={form.name || ''}
            placeholder="e.g. Sev Tameta, Paneer Bhurji"
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Item code" required className="col-md-4">
          <input
            className="form-control text-uppercase"
            required
            value={form.code || ''}
            placeholder="e.g. ST-01"
            onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
          />
        </Field>
      </div>

      {/* Description */}
      <Field label="Description" optional>
        <textarea
          className="form-control"
          rows={2}
          value={form.description || ''}
          placeholder="A short description for staff and menus"
          onChange={e => setForm({ ...form, description: e.target.value })}
        />
      </Field>

      {/* Switches for Veg and Available */}
      <div className="d-flex align-items-center gap-4 pt-2 border-top">
        <Switch
          id="isVeg"
          label="Vegetarian"
          checked={form.isVeg !== false}
          onChange={(checked: boolean) => setForm({ ...form, isVeg: checked })}
        />
        <Switch
          id="isAvailable"
          label="Available"
          checked={form.isAvailable !== false}
          onChange={(checked: boolean) => setForm({ ...form, isAvailable: checked })}
        />
      </div>
    </>
  );
};

// CATEGORY FORM: Timing selector (Lunch / Dinner), Name, Code, Description, Active switch. Clean, professional UI. Display Order removed!
const CategoryForm: React.FC<{ form: any; setForm: (value: any) => void }> = ({ form, setForm }) => {
  const currentTiming: MealPeriod = form.mealPeriod || 'LUNCH';

  return (
    <>
      {/* Clean Segmented Control for Category Timing */}
      <div className="p-3 bg-light rounded-3 border">
        <label className="form-label small fw-bold mb-2 text-dark">
          કેટેગરીનો સમય (Category Timing) <span className="text-danger">*</span>
        </label>
        <div className="d-flex gap-2">
          <button
            type="button"
            className={`btn btn-sm py-2 px-4 fw-bold flex-grow-1 transition-all ${
              currentTiming === 'LUNCH'
                ? 'btn-primary text-white shadow-xs'
                : 'btn-outline-secondary bg-white'
            }`}
            onClick={() => setForm({ ...form, mealPeriod: 'LUNCH' })}
          >
            બપોર (Lunch)
          </button>
          <button
            type="button"
            className={`btn btn-sm py-2 px-4 fw-bold flex-grow-1 transition-all ${
              currentTiming === 'DINNER'
                ? 'btn-dark text-white shadow-xs'
                : 'btn-outline-secondary bg-white'
            }`}
            onClick={() => setForm({ ...form, mealPeriod: 'DINNER' })}
          >
            સાંજ (Dinner)
          </button>
        </div>
      </div>

      <div className="row g-3">
        <Field label="Category name" required className="col-md-8">
          <input
            className="form-control"
            required
            value={form.name || ''}
            placeholder="e.g. Sabji, Dal-Bhat, Roti, Farsan"
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Category code" required className="col-md-4">
          <input
            className="form-control text-uppercase"
            required
            value={form.code || ''}
            placeholder="e.g. SBJ-01"
            onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
          />
        </Field>
      </div>

      <Field label="Description" optional>
        <textarea
          className="form-control"
          rows={2}
          value={form.description || ''}
          placeholder="Describe the food items grouped here"
          onChange={e => setForm({ ...form, description: e.target.value })}
        />
      </Field>

      <div className="d-flex align-items-center pt-2 border-top">
        <Switch
          id="categoryActive"
          label="Active category"
          checked={form.isActive !== false}
          onChange={(checked: boolean) => setForm({ ...form, isActive: checked })}
        />
      </div>
    </>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode; required?: boolean; optional?: boolean; className?: string }> = ({
  label,
  children,
  required,
  optional,
  className = ''
}) => (
  <div className={className}>
    <label className="form-label small fw-bold">
      {label} {required && <span className="text-danger">*</span>}
      {optional && <span className="text-muted fw-normal">(optional)</span>}
    </label>
    {children}
  </div>
);

const Switch: React.FC<{ id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({
  id,
  label,
  checked,
  onChange
}) => (
  <div className="form-check form-switch">
    <input
      className="form-check-input"
      id={id}
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
    />
    <label className="form-check-label small fw-bold" htmlFor={id}>
      {label}
    </label>
  </div>
);
