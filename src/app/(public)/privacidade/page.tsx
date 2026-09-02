import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade",
};

const UPDATED = "30 de agosto de 2026";

export default function PrivacidadePage() {
  return (
    <div className="px-4 py-16 sm:px-6">
      <article className="mx-auto max-w-3xl">
        <h1 className="font-heading text-4xl font-black tracking-tight text-ink">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-muted">Última atualização: {UPDATED}</p>

        <div className="prose-stbr mt-10 space-y-8 text-ink">
          <section>
            <h2 className="font-heading text-xl font-bold">Quem somos</h2>
            <p className="mt-3 leading-relaxed">
              Esta é a plataforma de hackathons da Superteam Brasil
              (hackathon.superteam.com.br). Ela existe para você participar de
              edições de hackathon: criar conta, se inscrever, montar time e
              submeter projeto. Para falar com a gente sobre seus dados, escreva
              para{" "}
              <a className="font-semibold underline" href="mailto:contato@superteam.com.br">
                contato@superteam.com.br
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold">O que coletamos</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                <strong>Conta:</strong> nome, e-mail e foto (via login com
                GitHub ou Google), além do que você adicionar ao perfil —
                headline, bio, links de GitHub, X/Twitter, LinkedIn e Telegram.
              </li>
              <li>
                <strong>Participação:</strong> inscrição em edições, aceite do
                regulamento, time, candidaturas e convites de time, e o conteúdo
                do projeto que seu time submete.
              </li>
              <li>
                <strong>Uso da plataforma:</strong> eventos de navegação
                (páginas visitadas, cliques) via PostHog e Google Tag Manager —
                somente se você aceitar no aviso de cookies — e relatórios de
                erro via Sentry,
                sem dados pessoais além do necessário para diagnosticar a falha.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold">O que fica visível para outras pessoas</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>
                Seu <strong>perfil público</strong> (nome, foto, headline, bio e
                links) e os projetos submetidos pelos seus times.
              </li>
              <li>
                Se você se marcar como <strong>disponível para times</strong> em
                uma edição, seu perfil e contatos ficam visíveis para os
                participantes inscritos daquela edição.
              </li>
              <li>
                Integrantes do seu time veem seu e-mail e o status da sua
                inscrição na edição.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold">Com quem compartilhamos</h2>
            <p className="mt-3 leading-relaxed">
              Não vendemos seus dados. Usamos provedores de infraestrutura que
              processam dados em nosso nome: Supabase (banco de dados e
              autenticação), Vercel (hospedagem), Resend (e-mails
              transacionais), PostHog e Google Tag Manager (análise de uso,
              servidores nos EUA, apenas com seu consentimento) e Sentry
              (monitoramento de erros).
              Dados de premiação podem ser compartilhados com os organizadores e
              patrocinadores da edição conforme o regulamento que você aceitou.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold">Cookies</h2>
            <p className="mt-3 leading-relaxed">
              Cookies essenciais mantêm sua sessão de login funcionando e não
              dependem de consentimento. Cookies de análise (PostHog e Google Tag Manager) só são
              usados se você aceitar no aviso exibido na primeira visita — e
              você pode mudar de ideia limpando os dados do site no navegador.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold">Seus direitos (LGPD)</h2>
            <p className="mt-3 leading-relaxed">
              Nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018),
              você pode pedir acesso, correção, portabilidade ou exclusão dos
              seus dados, além de revogar consentimentos. É só escrever para{" "}
              <a className="font-semibold underline" href="mailto:contato@superteam.com.br">
                contato@superteam.com.br
              </a>
              . A exclusão da conta remove seu perfil; conteúdos coletivos do
              time (como projetos submetidos) podem ser mantidos de forma
              desvinculada de você quando a edição exigir.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold">Retenção</h2>
            <p className="mt-3 leading-relaxed">
              Mantemos os dados enquanto sua conta existir ou enquanto forem
              necessários para a edição (por exemplo, resultados e premiação).
              Depois disso, excluímos ou anonimizamos.
            </p>
          </section>

          <p className="text-sm text-muted">
            Veja também os <Link className="font-semibold underline" href="/termos">Termos de Uso</Link>.
          </p>
        </div>
      </article>
    </div>
  );
}
