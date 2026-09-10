"use client";

import { useEffect, useRef } from "react";
import {
  TicketFrente,
  TicketVerso,
  type FatoBilhete,
} from "@/components/campaign/event-ticket";

/* ---------------------------------------------------------------------------
 * O BILHETE VIRA
 *
 * Uma peça só, com duas faces, que sai do canto da primeira dobra e vai
 * ESTACIONAR na seção seguinte — virada, com o verso para cima. O verso é o
 * conteúdo da seção. Não é uma transição entre dois objetos parecidos: é o
 * mesmo objeto, e é isso que a rolagem tem que provar.
 *
 * ONDE A PEÇA MORA. No destino, não na origem. Ela é filha da seção "O que é o
 * Colosseum" e o repouso dela é o estado ESTACIONADO — verso à mostra, no
 * lugar, em fluxo normal. O canto do hero é o estado transformado, e quem diz
 * onde fica esse canto é a âncora: a cópia de uma face só que continua no hero
 * ocupando a caixa (invisível quando o voo está ativo). Assim o pouso é exato
 * por construção, em vez de um `translate` em `vh` calibrado a olho que erra
 * em toda altura de janela diferente da que foi usada para calibrar.
 *
 * O QUE ESTE COMPONENTE FAZ. Só medir. Ele lê as duas caixas, escreve quatro
 * números em custom properties e sai do caminho — a animação inteira é
 * `animation-timeline` no compositor (styles/bilhete.css). Não há listener de
 * rolagem aqui: medida é coisa de layout, e layout muda quando a janela muda,
 * não a cada quadro de scroll.
 *
 * `--bu` FECHA O CÍRCULO. A unidade interna do bilhete é a razão entre as duas
 * larguras, e a escala do voo é essa mesma razão invertida. Então a peça
 * estacionada é grande de verdade — serrilhado, furo e corpo de letra todos na
 * escala grande — e no canto do hero ela reduz para exatamente o desenho
 * aprovado da primeira dobra. Uma conta só governa as duas pontas.
 * ------------------------------------------------------------------------- */

const arred = (v: number) => Math.round(v * 1000) / 1000;

export function BilheteVirando({
  fatos,
  nota,
}: {
  fatos: readonly FatoBilhete[];
  nota?: string;
}) {
  const vao = useRef<HTMLDivElement>(null);
  const voo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const medir = () => {
      const caixa = vao.current;
      const peca = voo.current;
      const ancora = document.getElementById("bilhete-ancora");
      if (!caixa || !peca || !ancora) return;

      const rc = caixa.getBoundingClientRect();
      const ra = ancora.getBoundingClientRect();
      if (rc.width < 1 || ra.width < 1) return;

      /* Primeiro a unidade, porque ela muda a ALTURA da peça — e a altura
         entra no deslocamento. Medir tudo de uma vez daria um `dy` calculado
         contra a caixa antiga, e o cartão pousaria alguns pixels fora. */
      const bu = arred(rc.width / ra.width);
      peca.style.setProperty("--bu", String(bu));
      peca.style.setProperty("--voo-k", String(arred(1 / bu)));

      /* Segundo passe, já com a caixa no tamanho novo: o vetor entre os dois
         CENTROS. Centro e não canto porque o giro e a escala do voo têm origem
         no centro; medir pelo canto pousaria a peça deslocada de meia caixa. */
      requestAnimationFrame(() => {
        const c2 = vao.current?.getBoundingClientRect();
        const a2 = document
          .getElementById("bilhete-ancora")
          ?.getBoundingClientRect();
        if (!c2 || !a2 || !voo.current) return;

        const dx = a2.left + a2.width / 2 - (c2.left + c2.width / 2);
        const dy = a2.top + a2.height / 2 - (c2.top + c2.height / 2);
        voo.current.style.setProperty("--voo-dx", `${Math.round(dx)}px`);
        voo.current.style.setProperty("--voo-dy", `${Math.round(dy)}px`);

        /* O CURSO. Quanta rolagem até estacionar. O fim é o instante em que a
           caixa de destino chega a um quarto da janela — alto o bastante para
           a peça pousar dentro do quadro e não colada na borda de baixo. O
           piso existe para telas muito altas, onde a conta daria um curso
           curto demais e a virada viraria um estalo. */
        const alvo = c2.top + window.scrollY;
        const curso = Math.max(
          360,
          Math.round(alvo - window.innerHeight * 0.24),
        );
        voo.current.style.setProperty("--voo-curso", `${curso}px`);
      });
    };

    medir();

    const ro = new ResizeObserver(medir);
    if (vao.current) ro.observe(vao.current);
    const ancora = document.getElementById("bilhete-ancora");
    if (ancora) ro.observe(ancora);
    window.addEventListener("resize", medir);
    /* As fontes mudam a altura das duas caixas quando trocam. Sem isto o
       primeiro pouso é medido em Times New Roman. */
    document.fonts?.ready.then(medir).catch(() => {});

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, []);

  return (
    <div ref={vao} className="bilhete-vao">
      <div ref={voo} className="bilhete-voo">
        <div className="bilhete-face bilhete-face-frente">
          <div aria-hidden className="bilhete-espessura ticket-cut" />
          <TicketFrente />
        </div>
        <div className="bilhete-face bilhete-face-verso">
          <div aria-hidden className="bilhete-espessura ticket-cut" />
          <TicketVerso fatos={fatos} nota={nota} />
        </div>
      </div>
    </div>
  );
}
