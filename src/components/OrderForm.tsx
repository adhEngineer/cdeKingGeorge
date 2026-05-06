import { FormEvent, useMemo, useState } from 'react';
import { Download, Save } from 'lucide-react';
import { products, setPrice, shirtSizes } from '../lib/constants';
import { downloadBlob, generateOrderPdf } from '../lib/pdf';
import { supabase } from '../lib/supabase';
import type { OrderFormData, OrderItemInput, Profile } from '../lib/types';

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

export function OrderForm({ profile }: OrderFormProps) {
  const [form, setForm] = useState<OrderFormData>({
    student_name: profile?.student_name ?? '',
    class_group: profile?.class_group ?? '',
    parent_name: profile?.parent_name ?? '',
    order_date: today,
    signature_name: profile?.parent_name ?? '',
    items: initialItems,
  });
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastPdf, setLastPdf] = useState<{ blob: Blob; fileName: string } | null>(null);

  const estimatedTotal = useMemo(() => {
    const pieces = form.items.reduce((total, item) => {
      const product = products.find((entry) => entry.id === item.product_type);
      return total + (product?.unitPrice ?? 0) * item.quantity_piece;
    }, 0);
    const sets = form.items.reduce((total, item) => total + item.quantity_set, 0) * setPrice;
    return pieces + sets;
  }, [form.items]);

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
        form.items.map((item) => ({
          order_id: order.id,
          ...item,
        })),
      );
      if (itemError) throw itemError;

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
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Comanda nu a putut fi salvata.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="panel order-form" onSubmit={submit}>
      <div className="section-title">
        <h1>Comanda uniforme 2025-2026</h1>
        <p>Completeaza tabelul, verifica marimea si descarca formularul semnat.</p>
      </div>

      <div className="form-grid">
        <label>
          Nume si prenume elev
          <input value={form.student_name} onChange={(event) => setForm({ ...form, student_name: event.target.value })} required />
        </label>
        <label>
          Clasa/Grupa
          <input value={form.class_group} onChange={(event) => setForm({ ...form, class_group: event.target.value })} required />
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
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={item.quantity_set}
                      onChange={(event) => updateItem(index, { quantity_set: Number(event.target.value) })}
                    />
                  </td>
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
  );
}
