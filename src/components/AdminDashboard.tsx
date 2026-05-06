import { useEffect, useMemo, useState } from 'react';
import { Download, FileArchive, RefreshCw, Search, Sheet } from 'lucide-react';
import { exportOrderPdfs, exportOrdersXlsx } from '../lib/export';
import { supabase } from '../lib/supabase';
import type { Order, Profile } from '../lib/types';

type AdminDashboardProps = {
  profile: Profile | null;
};

export function AdminDashboard({ profile }: AdminDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadOrders = async () => {
    if (!supabase || profile?.role !== 'admin') return;
    setIsLoading(true);
    setStatus('');
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*), order_files(storage_path, file_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data ?? []) as Order[]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Nu am putut incarca comenzile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [profile?.id, profile?.role]);

  const classOptions = useMemo(
    () => Array.from(new Set(orders.map((order) => order.class_group).filter(Boolean))).sort(),
    [orders],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesQuery = normalized
        ? [order.student_name, order.parent_name, order.class_group, order.signature_name].some((value) =>
            value.toLowerCase().includes(normalized),
          )
        : true;
      const matchesClass = classFilter ? order.class_group === classFilter : true;
      return matchesQuery && matchesClass;
    });
  }, [orders, query, classFilter]);

  const downloadSinglePdf = async (order: Order) => {
    if (!supabase) return;
    const file = order.order_files?.[0];
    if (!file) {
      setStatus('Comanda selectata nu are PDF atasat.');
      return;
    }
    const { data, error } = await supabase.storage.from('order-pdfs').download(file.storage_path);
    if (error) {
      setStatus(error.message);
      return;
    }
    const url = URL.createObjectURL(data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.file_name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (profile?.role !== 'admin') {
    return (
      <section className="panel admin-panel">
        <div className="section-title">
          <h1>Admin comenzi</h1>
          <p>Accesul este disponibil doar pentru utilizatorii cu rol admin in Supabase.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel admin-panel">
      <div className="admin-header">
        <div className="section-title">
          <h1>Admin comenzi</h1>
          <p>{filtered.length} comenzi afisate din {orders.length} salvate.</p>
        </div>
        <div className="actions">
          <button className="secondary-button" onClick={loadOrders} disabled={isLoading}>
            <RefreshCw size={18} />
            Actualizeaza
          </button>
          <button
            className="secondary-button"
            onClick={async () => {
              try {
                await exportOrdersXlsx(filtered);
              } catch (error) {
                setStatus(error instanceof Error ? error.message : 'Nu am putut exporta XLSX.');
              }
            }}
          >
            <Sheet size={18} />
            Export XLSX
          </button>
          <button
            className="secondary-button"
            onClick={async () => {
              try {
                await exportOrderPdfs(filtered);
              } catch (error) {
                setStatus(error instanceof Error ? error.message : 'Nu am putut exporta PDF-urile.');
              }
            }}
          >
            <FileArchive size={18} />
            Export PDF
          </button>
        </div>
      </div>

      <div className="filters">
        <label className="search-field">
          <Search size={16} />
          <input placeholder="Cauta elev, parinte, clasa..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
          <option value="">Toate clasele</option>
          {classOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {status && <div className="notice">{status}</div>}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Elev</th>
              <th>Clasa</th>
              <th>Parinte</th>
              <th>Produse</th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id}>
                <td>{new Date(order.created_at).toLocaleDateString('ro-RO')}</td>
                <td>{order.student_name}</td>
                <td>{order.class_group}</td>
                <td>{order.parent_name}</td>
                <td>
                  {order.order_items?.map((item) => (
                    <span className="line-item" key={`${order.id}-${item.product_type}`}>
                      {item.product_type === 'short_sleeve' ? 'Scurta' : 'Lunga'} {item.shirt_size}, buc {item.quantity_piece}
                    </span>
                  ))}
                  <span className="line-item">Set: {Math.max(0, ...(order.order_items ?? []).map((item) => Number(item.quantity_set ?? 0)))}</span>
                </td>
                <td>
                  <button className="icon-button" title="Descarca PDF" onClick={() => void downloadSinglePdf(order)}>
                    <Download size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
