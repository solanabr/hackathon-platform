import type { ReactNode } from "react";

const LINK =
  "font-semibold text-emerald-deep underline underline-offset-2 hover:text-green-dark";

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {children}
    </a>
  );
}

export function faqItems({
  colosseumHref,
  earnHref,
  whatsappHref,
}: {
  colosseumHref: string | null;
  earnHref: string;
  whatsappHref: string;
}): { q: string; a: ReactNode }[] {
  const colosseum = colosseumHref ? (
    <Ext href={colosseumHref}>inscrição oficial na Colosseum</Ext>
  ) : (
    "inscrição oficial na Colosseum"
  );
  return [
    {
      q: "Preciso saber programar?",
      a: "Não. Você também pode contribuir com design, comunicação, marketing ou negócios. A Colosseum permite a participação de pessoas sem formação técnica.",
    },
    {
      q: "Ainda não tenho uma ideia. Posso começar?",
      a: "Pode. Crie sua conta, indique suas habilidades e conheça a comunidade enquanto procura um projeto de que gostaria de participar.",
    },
    {
      q: "Preciso ter uma equipe formada?",
      a: "Não. Você pode começar sem uma equipe e indicar no cadastro que está procurando pessoas para construir com você.",
    },
    {
      q: "Criar a conta aqui já me inscreve no evento?",
      a: (
        <>
          Não. A conta é da plataforma da Superteam Brasil, onde você recebe o
          apoio. Depois, você precisa concluir sua {colosseum}. Mostramos esse
          próximo passo durante o cadastro.
        </>
      ),
    },
    {
      q: "Posso completar minhas informações depois?",
      a: "Sim. As informações complementares sobre sua ideia e sua equipe podem ser salvas e concluídas depois. A inscrição oficial e a entrega do projeto seguem os prazos do evento.",
    },
    {
      q: "Quanto custa?",
      a: "Nada. Criar a conta, participar da comunidade e entrar no hackathon são gratuitos.",
    },
    {
      q: "Preciso falar inglês?",
      a: "A submissão na Colosseum é em inglês. Toda a Trilha Brasil, as mentorias e o suporte da Superteam Brasil são em português.",
    },
    {
      q: "Quais são os prêmios?",
      a: "Mais de US$ 800 mil em prêmios: US$ 30 mil para o campeão geral, US$ 15 mil para cada um dos 20 times de destaque, prêmios de bem público e universitário, e as trilhas por rede, que pagam US$ 100 mil (Solana, Tempo, Hyperliquid, Zcash) ou US$ 25 mil (Ethereum, Base, Arbitrum, Robinhood Chain) entre os melhores de cada uma. Por cima disso, US$ 2,5 milhões do fundo do Colosseum: pelo menos 10 times entram no acelerador com US$ 250 mil cada.",
    },
    {
      q: "Ganhar o hackathon garante investimento?",
      a: "Não. Prêmios e investimento seguem processos diferentes. A entrada em um programa de aceleração ou investimento depende da avaliação e dos critérios de seleção.",
    },
    {
      q: "Preciso usar Solana no meu projeto?",
      a: "O evento aceita projetos de diferentes blockchains, incluindo Solana. A Superteam Brasil faz parte da comunidade Solana, mas essa edição da Colosseum é aberta a todas essas redes. A Trilha Brasil no Superteam Earn e o acelerador de US$ 250 mil pedem integração com a Solana.",
    },
    {
      q: "O que é a Trilha Brasil?",
      a: (
        <>
          US$ 5 mil em prêmios e mentoria da Superteam Brasil, só para times
          brasileiros com projeto na Solana, publicada no{" "}
          <Ext href={earnHref}>Superteam Earn</Ext>. Para concorrer, além de
          enviar o projeto na Colosseum, você submete o mesmo projeto no desafio
          da Trilha Brasil.
        </>
      ),
    },
    {
      q: "Posso entrar no grupo antes de criar minha conta?",
      a: (
        <>
          Sim. Você pode conhecer a comunidade pelo{" "}
          <Ext href={whatsappHref}>grupo do WhatsApp</Ext> e criar sua conta
          quando decidir avançar. Entrar no grupo não conclui a inscrição no
          hackathon.
        </>
      ),
    },
  ];
}
