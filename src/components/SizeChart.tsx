import { shirtSizes } from '../lib/constants';

export function SizeChart() {
  return (
    <section className="panel size-panel">
      <div className="section-title">
        <h2>Tabel marimi uniforme scolare</h2>
        <p>Alege marimea in functie de dimensiunile copilului.</p>
      </div>
      <div className="table-scroll compact">
        <table>
          <thead>
            <tr>
              <th>Nr. tricou</th>
              <th>Latime bust</th>
              <th>Lungime tricou</th>
              <th>Lungime maneca lunga</th>
            </tr>
          </thead>
          <tbody>
            {shirtSizes.map((row) => (
              <tr key={row.size}>
                <td>{row.size}</td>
                <td>{row.bust}</td>
                <td>{row.length}</td>
                <td>{row.sleeve}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
