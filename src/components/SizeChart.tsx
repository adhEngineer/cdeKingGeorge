import { shirtSizes } from '../lib/constants';

export function SizeChart() {
  return (
    <section className="panel size-panel">
      <div className="section-title">
        <h2>Tabel marimi uniforme scolare</h2>
        <p>Alege marimea in functie de dimensiunile copilului.</p>
      </div>
      <div className="measurement-layout">
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
        <figure className="shirt-sketch">
          <img src={`${import.meta.env.BASE_URL}schita-tricou.png`} alt="Schita tricoului pentru masurare" />
        </figure>
      </div>
      <div className="recommendations">
        <h3>Recomandari utilizare produse comandate, conform producator:</h3>
        <ol>
          <li>
            Produsele confectionate si personalizate la cerere sunt exceptate de la dreptul de retragere/retur, in conformitate cu
            ART.16 lit.c) prevazut in O.U.G. nr. 34/2014: "Furnizarea de produse confectionate dupa specificatiile prezentate de
            Consumator/Beneficiar sau personalizate in mod clar".
          </li>
          <li>
            Pentru o pastrare cat mai indelungata a uniformei scolare va recomandam sa spalati toate produsele la temperatura de 30
            grade, nu le fierbeti si nu calcati la temperaturi ridicate!
          </li>
          <li>
            Se recomanda respectarea specificatiilor de pe eticheta produsului. Nerespectarea acestora poate cauza defecte care nu se pot
            reclama, deoarece au aparut in urma modului de utilizare necorespunzator si nerecomandat de catre Producator.
          </li>
        </ol>
      </div>
    </section>
  );
}
