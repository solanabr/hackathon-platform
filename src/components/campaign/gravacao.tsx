/* ---------------------------------------------------------------------------
 * GRAVAÇÃO — a impressão de segurança do bilhete
 *
 * Guilhoché, onda e selo. As três peças que fazem um pedaço de papel ser lido
 * como DOCUMENTO antes de a pessoa conseguir dizer por quê — e as três são a
 * mesma técnica da gravura desta casa: linha fina contínua, sem meio-tom, o
 * escuro nascendo do cruzamento e não da espessura.
 *
 * A geometria é calculada aqui, em TypeScript, e sai no HTML como `path`
 * comum: mesma decisão de `etching.tsx`. Zero filtro SVG, zero JS no cliente,
 * mesma forma no servidor e no navegador.
 *
 * O truque que mantém o HTML pequeno: uma rosácea r = R + A·cos(k·t) girada de
 * 2π/k é uma rosácea de fase deslocada. Então o tecido inteiro do guilhoché —
 * que parece meia dúzia de curvas trançadas — é UM path no `defs` e cinco
 * `use` girados. ~1 KB em vez de ~20 KB.
 * ------------------------------------------------------------------------- */

const arred = (v: number) => Math.round(v * 100) / 100;

/**
 * Uma volta de rosácea: r = raio + amplitude·cos(pétalas · t).
 *
 * `pontos` é resolução, não estilo. Abaixo de ~160 a curva mostra os
 * segmentos retos nos vértices das pétalas — e vértice facetado num guilhoché
 * é exatamente o que denuncia desenho gerado.
 */
function rosacea(raio: number, amplitude: number, petalas: number, pontos = 200) {
  const d: string[] = [];
  for (let i = 0; i <= pontos; i += 1) {
    const t = (i / pontos) * Math.PI * 2;
    const r = raio + amplitude * Math.cos(petalas * t);
    d.push(
      `${i === 0 ? "M" : "L"}${arred(r * Math.cos(t))} ${arred(r * Math.sin(t))}`,
    );
  }
  return `${d.join("")}Z`;
}

/** Uma senoide vertical — a linha do guilhoché em faixa, para o canhoto. */
function onda(altura: number, amplitude: number, ciclos: number, pontos = 120) {
  const d: string[] = [];
  for (let i = 0; i <= pontos; i += 1) {
    const y = (i / pontos) * altura;
    const x = amplitude * Math.sin((i / pontos) * Math.PI * 2 * ciclos);
    d.push(`${i === 0 ? "M" : "L"}${arred(x)} ${arred(y)}`);
  }
  return d.join("");
}

const ROSACEA_LARGA = rosacea(52, 15, 9);
const ROSACEA_FINA = rosacea(33, 8, 14, 240);

/**
 * O MEDALHÃO. A rosácea de cédula, em duas famílias trançadas: nove pétalas
 * largas por fora, catorze finas por dentro. Vai atrás do bloco de datas e é
 * cortada pela linha de picote — como numa cédula, onde o guilhoché nunca
 * respeita a moldura do texto.
 */
export function Medalhao({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="-70 -70 140 140"
      className={`pointer-events-none absolute ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.34"
    >
      <defs>
        <path id="bilhete-ros-larga" d={ROSACEA_LARGA} />
        <path id="bilhete-ros-fina" d={ROSACEA_FINA} />
      </defs>
      {/* Três voltas e duas, não cinco e três. Guilhoché é TRAMA: passado
          dessa densidade as curvas param de se cruzar e passam a se somar, e o
          medalhão vira mancha atrás do texto — que é o oposto do que uma
          impressão de segurança faz numa cédula. */}
      {[0, 13, 26].map((giro) => (
        <use
          key={`larga-${giro}`}
          href="#bilhete-ros-larga"
          transform={`rotate(${giro})`}
        />
      ))}
      {[0, 9].map((giro) => (
        <use
          key={`fina-${giro}`}
          href="#bilhete-ros-fina"
          transform={`rotate(${giro})`}
        />
      ))}
      <circle r="22" strokeWidth="0.28" />
      <circle r="19.5" strokeWidth="0.28" />
    </svg>
  );
}

/**
 * A FAIXA DO CANHOTO. Quatro senoides defasadas correndo no eixo do canhoto,
 * que é vertical. Fica sobre o foil, em `multiply`: a linha gravada interrompe
 * o brilho em vez de recebê-lo.
 */
export function FaixaGuilhoche({ className = "" }: { className?: string }) {
  const ONDA = onda(240, 7, 9);
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 240"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.5"
    >
      <defs>
        <path id="bilhete-onda" d={ONDA} />
      </defs>
      {[7, 17].map((x, i) => (
        <use
          key={x}
          href="#bilhete-onda"
          transform={`translate(${x} 0) scale(${i % 2 ? -1 : 1} 1)`}
        />
      ))}
    </svg>
  );
}

/**
 * O MEANDRO — a grega. O único elemento aqui que é romano por citação e não
 * por técnica, e por isso é o mais fácil de errar: desenhada grossa vira
 * clip-art de coluna dórica. Ela entra como FILETE, na espessura de uma linha
 * de gravura, no lugar onde já havia um fio separando o cabeçalho do corpo —
 * ocupa a mesma altura, e o que muda é que o fio passa a ter desenho.
 *
 * A chave é pendurada num trilho contínuo: um meandro é uma linha SÓ que
 * dobra, e desenhar espiral por espiral solta é o que faz a faixa perder o
 * ritmo nas emendas.
 */
export function Meandro({ className = "" }: { className?: string }) {
  const CELULA = 14;
  const REPS = 44;
  const chaves = Array.from(
    { length: REPS },
    (_, i) => {
      const x = i * CELULA;
      return `M${x + 1.5} 8V1.5H${x + 11.5}V6H${x + 5}V3.5H${x + 8.5}`;
    },
  ).join("");

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${CELULA * REPS} 10`}
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d={`M0 8.6H${CELULA * REPS}`} strokeWidth="0.9" />
      <path d={chaves} />
    </svg>
  );
}

/**
 * O SELO. Carimbo em relevo seco: dois anéis, uma coroa de serifas — o louro
 * reduzido ao que sobra dele num carimbo de 4 mm — e o ano em romano no
 * centro. Girado alguns graus no call site, porque carimbo é batido à mão.
 *
 * O texto circular é `textPath` num círculo próprio, e não letras posicionadas
 * uma a uma: assim ele acompanha o raio em qualquer tamanho, inclusive quando
 * a peça cresce três vezes na saída da dobra.
 */
export function SeloRomano({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="-50 -50 100 100"
      className={`pointer-events-none ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
    >
      <defs>
        <path
          id="bilhete-selo-volta"
          d="M0-36A36 36 0 1 1 0 36A36 36 0 1 1 0-36"
        />
      </defs>
      <circle r="46" strokeWidth="2.2" />
      <circle r="41" strokeWidth="0.8" />
      <circle r="30" strokeWidth="0.8" />

      {/* A coroa. Vinte e quatro traços radiais entre os dois anéis: o louro
          existe aqui como RITMO, que é tudo o que sobra de uma coroa impressa
          nesse diâmetro. Desenhar folha por folha viraria borrão. */}
      {Array.from({ length: 24 }, (_, i) => (
        <line
          key={i}
          x1="0"
          y1="-33.5"
          x2="0"
          y2="-38.5"
          strokeWidth="1.4"
          transform={`rotate(${i * 15})`}
        />
      ))}

      <text
        fill="currentColor"
        stroke="none"
        fontSize="8.4"
        fontWeight="700"
        letterSpacing="2.4"
      >
        <textPath href="#bilhete-selo-volta" startOffset="25%" textAnchor="middle">
          SUPERTEAM BRASIL
        </textPath>
      </text>
      <text
        fill="currentColor"
        stroke="none"
        fontSize="6.6"
        fontWeight="700"
        letterSpacing="2"
      >
        <textPath href="#bilhete-selo-volta" startOffset="75%" textAnchor="middle">
          COLOSSEUM
        </textPath>
      </text>

      <text
        y="6.5"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontSize="17"
        fontWeight="900"
        letterSpacing="0.5"
      >
        MMXXVI
      </text>
    </svg>
  );
}

/**
 * MICROTEXTO. A linha de 4 px na aresta do bilhete que, parada, é só uma
 * textura cinza — e que vira palavra legível quando a peça cresce na saída da
 * dobra. É a recompensa do zoom: a impressão aguenta a aproximação.
 */
export function Microtexto({
  texto,
  className = "",
}: {
  texto: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 10"
      preserveAspectRatio="xMinYMid slice"
      className={`pointer-events-none ${className}`}
    >
      <text
        x="0"
        y="7.6"
        fill="currentColor"
        fontSize="7"
        fontWeight="700"
        letterSpacing="1.1"
      >
        {texto.repeat(6)}
      </text>
    </svg>
  );
}
