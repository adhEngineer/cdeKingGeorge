import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Download, FileText, RefreshCw, Save } from 'lucide-react';
import { products, setPrice, shirtSizes } from '../lib/constants';
import { downloadBlob, generateOrderPdf } from '../lib/pdf';
import { supabase } from '../lib/supabase';
import type { Order, OrderFormData, OrderItemInput, Profile } from '../lib/types';

type OrderFormProps = {
  profile: Profile | null;
};

const today = new Date().toISOString().slice(0, 10);

const initialItems: OrderItemInput[] = products.map((product) => ({
  product_type: product.id,
  shirt_size: '38',
  quantity_set: 0,
  quantity_piece: 0,
}));

const classGroupOptions = [
  'Gradinita',
  'Primar (clasele Pregatitoare - IV)',
  'Gimnaziu (clasele V-VIII)',
  'Liceu (clasele IX-XII)',
];

export function OrderForm({ profile }: OrderFormProps) {
  const [form, setForm] = useState<OrderFormData>({
    student_name: profile?.student_name ?? '',
    class_group: normalizeClassGroup(profile?.class_group ?? ''),
    parent_name: profile?.parent_name ?? '',
    order_date: today,
    signature_name: profile?.parent_name ?? '',
    set_quantity: 0,
    items: initialItems,
  });
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lastPdf, setLastPdf] = useState<{ blob: Blob; fileName: string } | null>(null);

  const loadOrders = async () => {
    if (!supabase || !profile) return;
    setIsLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*), order_files(storage_path, file_name)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const nextOrders = (data ?? []) as Order[];
      setOrders(nextOrders);

      const latest = nextOrders[0];
      if (latest) {
        setForm({
          student_name: latest.student_name,
          class_group: normalizeClassGroup(latest.class_group),
          parent_name: latest.parent_name,
          order_date: today,
          signature_name: latest.signature_name || latest.parent_name,
          set_quantity: getOrderSetQuantity(latest.order_items ?? []),
          items: mergeItems(latest.order_items ?? initialItems),
        });
      } else {
        setForm((current) => ({
          ...current,
          student_name: profile.student_name || current.student_name,
          class_group: normalizeClassGroup(profile.class_group) || current.class_group,
          parent_name: profile.parent_name || current.parent_name,
          signature_name: profile.parent_name || current.signature_name,
        }));
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Nu am putut incarca comenzile tale.');
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [profile?.id]);

  const estimatedTotal = useMemo(() => {
    const pieces = form.items.reduce((total, item) => {
      const product = products.find((entry) => entry.id === item.product_type);
      return total + (product?.unitPrice ?? 0) * item.quantity_piece;
    }, 0);
    const sets = form.set_quantity * setPrice;
    return pieces + sets;
  }, [form.items, form.set_quantity]);

  const uniformColor = getUniformColor(form.class_group);

  const updateItem = (index: number, patch: Partial<OrderItemInput>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  const buildPdf = async () => {
    const blob = await generateOrderPdf(form);
    const safeStudent = form.student_name.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'elev';
    const fileName = `comanda-uniforme-${safeStudent}-${Date.now()}.pdf`;
    setLastPdf({ blob, fileName });
    return { blob, fileName };
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('');
    setIsSaving(true);

    try {
      if (!form.class_group) {
        setStatus('Alege Clasa/Grupa pentru anul scolar urmator.');
        return;
      }

      const pdf = await buildPdf();

      if (!supabase || !profile) {
        downloadBlob(pdf.blob, pdf.fileName);
        setStatus('PDF generat local. Configureaza Supabase pentru salvarea in baza de date.');
        return;
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: profile.id,
          student_name: form.student_name,
          class_group: form.class_group,
          parent_name: form.parent_name,
          order_date: form.order_date,
          signature_name: form.signature_name,
        })
        .select('id')
        .single();
      if (orderError) throw orderError;

      const { error: itemError } = await supabase.from('order_items').insert(
        form.items.map((item, index) => ({
          order_id: order.id,
          ...item,
          quantity_set: index === 0 ? form.set_quantity : 0,
        })),
      );
      if (itemError) throw itemError;

      await supabase
        .from('profiles')
        .update({
          parent_name: form.parent_name,
          student_name: form.student_name,
          class_group: form.class_group,
        })
        .eq('id', profile.id);

      const storagePath = `${profile.id}/${order.id}/${pdf.fileName}`;
      const { error: uploadError } = await supabase.storage.from('order-pdfs').upload(storagePath, pdf.blob, {
        contentType: 'application/pdf',
      });
      if (uploadError) throw uploadError;

      const { error: fileError } = await supabase.from('order_files').insert({
        order_id: order.id,
        storage_path: storagePath,
        file_name: pdf.fileName,
      });
      if (fileError) throw fileError;

      downloadBlob(pdf.blob, pdf.fileName);
      setStatus('Comanda a fost salvata si PDF-ul a fost descarcat.');
      await loadOrders();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Comanda nu a putut fi salvata.');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadOrder = async (order: Order) => {
    setStatus('');
    try {
      const pdfData: OrderFormData = {
        student_name: order.student_name,
        class_group: order.class_group,
        parent_name: order.parent_name,
        order_date: order.order_date,
        signature_name: order.signature_name,
        set_quantity: getOrderSetQuantity(order.order_items ?? []),
        items: mergeItems(order.order_items ?? initialItems),
      };
      const blob = await generateOrderPdf(pdfData);
      downloadBlob(blob, `comanda-uniforme-${order.student_name}-${order.order_date}.pdf`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Nu am putut descarca aceasta comanda.');
    }
  };

  return (
    <section className="order-stack">
      <form className="panel order-form" onSubmit={submit}>
      <div className="section-title">
        <h1>Comanda uniforme 2026-2027</h1>
        <p>Completeaza tabelul, verifica marimea si descarca formularul semnat.</p>
      </div>

      <div className="form-grid">
        <label>
          Nume si prenume elev
          <input value={form.student_name} onChange={(event) => setForm({ ...form, student_name: event.target.value })} required />
        </label>
        <label className="class-group-field">
          Clasa/Grupa
          <select value={form.class_group} onChange={(event) => setForm({ ...form, class_group: event.target.value })} required>
            <option value="">Alege clasa/grupa</option>
            {classGroupOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="class-warning">Alege clasa pentru anul scolar urmator, nu clasa in care este acum copilul.</span>
          <span className="uniform-color-field" aria-label={`Culoarea uniformei: ${uniformColor.label}`}>
            <span className={`uniform-swatch ${uniformColor.key}`} />
            <strong>{uniformColor.label}</strong>
          </span>
        </label>
        <label>
          Parinte / Reprezentant legal
          <input value={form.parent_name} onChange={(event) => setForm({ ...form, parent_name: event.target.value })} required />
        </label>
        <label>
          Data comenzii
          <input type="date" value={form.order_date} onChange={(event) => setForm({ ...form, order_date: event.target.value })} required />
        </label>
      </div>

      <div className="table-scroll order-table">
        <table>
          <thead>
            <tr>
              <th>Produs</th>
              <th>Nr. tricou</th>
              <th>Cantitate set</th>
              <th>Cantitate buc.</th>
            </tr>
          </thead>
          <tbody>
            {form.items.map((item, index) => {
              const product = products.find((entry) => entry.id === item.product_type);
              return (
                <tr key={item.product_type}>
                  <td>{product?.label}</td>
                  <td>
                    <select value={item.shirt_size} onChange={(event) => updateItem(index, { shirt_size: event.target.value })}>
                      {shirtSizes.map((size) => (
                        <option key={size.size} value={size.size}>
                          {size.size}
                        </option>
                      ))}
                    </select>
                  </td>
                  {index === 0 && (
                  <td rowSpan={form.items.length}>
                    <input
                      type="number"
                      min="0"
                      value={form.set_quantity}
                      onChange={(event) => setForm({ ...form, set_quantity: Number(event.target.value) })}
                    />
                  </td>
                  )}
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={item.quantity_piece}
                      onChange={(event) => updateItem(index, { quantity_piece: Number(event.target.value) })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="size-warning">Alege dimensiunea tricourilor conform tabelului</p>

      <div className="signature-row">
        <label>
          Semnatura Beneficiar - nume tastat
          <input value={form.signature_name} onChange={(event) => setForm({ ...form, signature_name: event.target.value })} required />
        </label>
        <div className="total-box">
          <span>Total estimat</span>
          <strong>{estimatedTotal} lei</strong>
        </div>
      </div>

      <div className="notes">
        <strong>Nota:</strong> setul contine 2 tricouri cu maneca scurta si 2 tricouri cu maneca lunga, valoare {setPrice} lei/set.
        La bucata: maneca scurta 150 lei, maneca lunga 175 lei.
      </div>

      {status && <div className="notice">{status}</div>}

      <div className="actions">
        <button className="primary-button" type="submit" disabled={isSaving}>
          <Save size={18} />
          {isSaving ? 'Se salveaza...' : 'Salveaza comanda'}
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={async () => {
            const pdf = lastPdf ?? (await buildPdf());
            downloadBlob(pdf.blob, pdf.fileName);
          }}
        >
          <Download size={18} />
          Descarca PDF
        </button>
      </div>
      </form>

      <section className="panel history-panel">
        <div className="history-header">
          <div className="section-title">
            <h2>Comenzile mele</h2>
            <p>{orders.length ? `${orders.length} comenzi salvate pentru acest cont.` : 'Nu exista inca nicio comanda salvata.'}</p>
          </div>
          <button className="secondary-button" type="button" onClick={loadOrders} disabled={isLoadingOrders}>
            <RefreshCw size={17} />
            Actualizeaza
          </button>
        </div>

        {orders.length > 0 && (
          <div className="order-history-list">
            {orders.map((order) => (
              <article className="history-row" key={order.id}>
                <div className="history-icon">
                  <FileText size={18} />
                </div>
                <div>
                  <strong>{order.student_name}</strong>
                  <span>
                    {order.class_group} | set {getOrderSetQuantity(order.order_items ?? [])} | {new Date(order.created_at).toLocaleDateString('ro-RO')} | semnat de {order.signature_name}
                  </span>
                </div>
                <button className="secondary-button" type="button" onClick={() => void downloadOrder(order)}>
                  <Download size={17} />
                  PDF
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function mergeItems(items: OrderItemInput[]) {
  return initialItems.map((initial) => {
    const found = items.find((item) => item.product_type === initial.product_type);
    return found
      ? {
          product_type: found.product_type,
          shirt_size: found.shirt_size,
          quantity_set: 0,
          quantity_piece: Number(found.quantity_piece ?? 0),
        }
      : initial;
  });
}

function getOrderSetQuantity(items: OrderItemInput[]) {
  return Math.max(0, ...items.map((item) => Number(item.quantity_set ?? 0)));
}

function normalizeClassGroup(value: string) {
  return classGroupOptions.includes(value) ? value : '';
}

function getUniformColor(classGroup: string) {
  if (classGroup === 'Gradinita') {
    return { key: 'red', label: 'Rosie' };
  }
  if (classGroup === 'Primar (clasele Pregatitoare - IV)') {
    return { key: 'blue', label: 'Albastra' };
  }
  if (classGroup === 'Gimnaziu (clasele V-VIII)' || classGroup === 'Liceu (clasele IX-XII)') {
    return { key: 'white', label: 'Alba' };
  }
  return { key: 'empty', label: 'Selecteaza clasa/grupa' };
}
