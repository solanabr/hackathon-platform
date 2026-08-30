import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso",
};

const UPDATED = "30 de agosto de 2026";

export default function TermosPage() {
  return (
    <div className="px-4 py-16 sm:px-6">
      <article className="mx-auto max-w-3xl">
        <h1 className="font-heading text-4xl font-black tracking-tight text-ink">
          Termos de Uso
        </h1>
        <p className="mt-2 text-sm text-muted">Última atualização: {UPDATED}</p>

        <div className="mt-10 space-y-8 text-ink">
          <section>
            <h2 className="font-heading text-xl font-bold">A plataforma</h2>
            <p className="mt-3 leading-relaxed">
              A plataforma de hackathons da Superteam Brasil permite criar
              conta, se inscrever em edições, formar times e submeter projetos.
              Ao usar a plataforma você concorda com estes termos e com a{" "}
              <Link className="font-semibold underline" href="/privacidade">
                Política de Privacidade
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold">Regulamento de cada edição</h2>
            <p className="mt-3 leading-relaxed">
              Cada hackathon tem seu próprio regulamento — prazos, critérios de
              avaliação, premiação e regras de participação. O regulamento da
              edição, aceito no momento da inscrição, prevalece sobre estes
              termos no que for específico daquela edição.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold">Sua conta e seu conteúdo</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>Você é responsável pelo que publica: perfil, descrições de time e projetos.</li>
              <li>
                O projeto submetido pertence ao seu time. Ao submeter, você
                autoriza a Superteam Brasil a exibi-lo na plataforma e em
                divulgações da edição.
              </li>
              <li>
                Não publique conteúdo ilegal, ofensivo ou que viole direitos de
                terceiros. Contas que fizerem isso podem ser removidas, e a
                organização pode desclassificar times que violem o regulamento.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold">Formação de times</h2>
            <p className="mt-3 leading-relaxed">
              O mural de formação de times exibe, para participantes inscritos
              na edição, os perfis de quem se marcar como disponível e as vagas
              que os times anunciarem. Use os contatos exibidos apenas para
              tratar da participação no hackathon.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold">Garantias e responsabilidade</h2>
            <p className="mt-3 leading-relaxed">
              A plataforma é fornecida como está, sem garantia de
              disponibilidade contínua. Fazemos o possível para manter tudo no
              ar durante as edições, mas não respondemos por perdas decorrentes
              de indisponibilidade, falhas de terceiros ou uso indevido da
              plataforma.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold">Contato</h2>
            <p className="mt-3 leading-relaxed">
              Dúvidas sobre estes termos:{" "}
              <a className="font-semibold underline" href="mailto:contato@superteam.com.br">
                contato@superteam.com.br
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
