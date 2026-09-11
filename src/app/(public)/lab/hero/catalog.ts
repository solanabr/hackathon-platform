/* Prototype question: the fold has five actors (headline, Colosseum,
   legionary, ticket, two CTAs). The Colosseum is the place, the legionary is
   the person. These eight layouts disagree about who occupies the stage.
   Pick four. Fold the winner into `src/app/(public)/page.tsx` and delete this
   folder. */

export type LabHeroProps = {
  cadastroHref: string;
  ctaLabel: string;
  colosseumUrl: string | null;
};

export type LabVariant = {
  id: string;
  n: string;
  name: string;
  thesis: string;
  tests: string;
  finalist: boolean;
};

export const LAB_VARIANTS: LabVariant[] = [
  {
    id: "atual",
    n: "00",
    name: "Atual",
    thesis:
      "O palco que está no ar, agora com o legionário à direita, atrás do ticket — como no preview da chapa.",
    tests: "Controle. A peça nova entra sem redesenhar o resto.",
    finalist: false,
  },
  {
    id: "editorial",
    n: "01",
    name: "Sentinela",
    thesis:
      "O texto ganha a coluna da esquerda, com o ticket embaixo. O legionário — virado para a manchete — ocupa a direita, inteiro. O Coliseu vira lugar, atrás.",
    tests: "Pessoa e ticket não se cobrem. Olhar entra no palco.",
    finalist: true,
  },
  {
    id: "paisagem",
    n: "02",
    name: "Paisagem",
    thesis:
      "O céu é tipografia. O chão é o anfiteatro. O legionário está nos degraus, à direita do texto, olhando o ticket.",
    tests: "Escala humana contra o monumento. A figura não pisa na manchete.",
    finalist: true,
  },
  {
    id: "cartaz",
    n: "03",
    name: "Arena",
    thesis:
      "O Coliseu é crop cinematográfico à direita. O legionário fica na costura e olha para a arena. A leitura fica protegida à esquerda.",
    tests: "A figura lê a pedra. Tipo e ticket nunca andam em cima dela.",
    finalist: true,
  },
  {
    id: "friso",
    n: "04",
    name: "Friso",
    thesis:
      "Os botões viram um friso horizontal. A linha pontilhada aponta para o legionário à direita. O ticket fica no chão, no meio.",
    tests: "Botões separados do parágrafo. A figura é o fim da leitura.",
    finalist: false,
  },
  {
    id: "dock",
    n: "05",
    name: "Doca",
    thesis:
      "Manchete à esquerda, botões à direita da mesma linha. No chão, o Coliseu; na frente, o legionário e o ticket.",
    tests: "Botões no eixo da manchete. Figura no miolo.",
    finalist: false,
  },
  {
    id: "trilho",
    n: "06",
    name: "Trilho",
    thesis:
      "Coluna de ação à direita: ticket e botões. O legionário fica no vão, olhando a manchete. O Coliseu à esquerda.",
    tests: "O rosto aparece entre o tipo e os botões. Ninguém cobre ninguém.",
    finalist: true,
  },
  {
    id: "objeto",
    n: "07",
    name: "Figura",
    thesis:
      "O legionário é o assunto — grande, à direita, olhando a manchete. O Coliseu é lugar. O ticket na cintura, pequeno.",
    tests: "Hierarquia invertida: a pessoa na frente, a pedra atrás.",
    finalist: false,
  },
];

export const LAB_LIVE = LAB_VARIANTS;
export const LAB_FINALISTS = LAB_VARIANTS.filter((v) => v.finalist);

export function labVariantById(id: string | undefined) {
  return LAB_VARIANTS.find((v) => v.id === id) ?? null;
}
