import Link from "next/link";
import type { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/constants";
import { LEGAL_CONFIG } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: `Política de Privacidade e proteção de dados pessoais do ${SITE_CONFIG.name}, em conformidade com a LGPD.`,
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-4xl">
      <div className="mb-10">
        <h1 className="section-title mb-3">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: {LEGAL_CONFIG.lastUpdated}
        </p>
      </div>

      <article className="prose prose-invert prose-sm md:prose-base max-w-none space-y-8 text-muted-foreground">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">1. Introdução</h2>
          <p>
            Esta Política de Privacidade descreve como a{" "}
            <strong className="text-foreground">{LEGAL_CONFIG.companyLegalName}</strong>{" "}
            (&quot;nós&quot;, &quot;nosso&quot; ou &quot;Controlador&quot;), inscrita no CNPJ sob o nº{" "}
            <strong className="text-foreground">{LEGAL_CONFIG.cnpj}</strong>, com sede em{" "}
            {LEGAL_CONFIG.address}, {LEGAL_CONFIG.city}/{LEGAL_CONFIG.state},{" "}
            {LEGAL_CONFIG.country}, trata os dados pessoais dos usuários do site{" "}
            <Link href={SITE_CONFIG.url} className="text-primary hover:underline">
              {SITE_CONFIG.url}
            </Link>{" "}
            (&quot;Site&quot;), em conformidade com a Lei nº 13.709/2018 — Lei Geral de Proteção de
            Dados Pessoais (LGPD) e demais normas aplicáveis.
          </p>
          <p>
            Ao utilizar o Site, você declara ter lido e compreendido esta Política. O tratamento de
            dados para finalidades que dependam de consentimento somente ocorrerá após sua manifestação
            livre, informada e inequívoca, conforme o aviso de cookies exibido na primeira visita.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">2. Dados pessoais que coletamos</h2>
          <p>Podemos tratar as seguintes categorias de dados, conforme sua interação com o Site:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-foreground">Dados de navegação e dispositivo:</strong> endereço IP,
              tipo de navegador, sistema operacional, páginas visitadas, tempo de permanência, origem de
              acesso e identificadores de cookies.
            </li>
            <li>
              <strong className="text-foreground">Dados de busca e uso do catálogo:</strong> termos
              pesquisados, filtros aplicados, cliques em produtos e interações com o catálogo.
            </li>
            <li>
              <strong className="text-foreground">Dados de contato:</strong> nome, e-mail, telefone e
              mensagens enviadas via WhatsApp ou formulários de contato, quando você nos contatar
              voluntariamente.
            </li>
            <li>
              <strong className="text-foreground">Dados de autenticação (área administrativa):</strong>{" "}
              e-mail e credenciais de acesso de usuários autorizados ao painel administrativo.
            </li>
            <li>
              <strong className="text-foreground">Dados de compra:</strong> o Site funciona como vitrine
              e direciona compras ao Mercado Livre. Dados de pagamento, entrega e identificação para
              finalização da compra são tratados diretamente pelo Mercado Livre, nos termos da política
              de privacidade dessa plataforma.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">3. Finalidades e bases legais</h2>
          <p>Tratamos dados pessoais para as finalidades abaixo, com as respectivas bases legais da LGPD:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-foreground">Operação e segurança do Site</strong> — cookies
              essenciais, prevenção a fraudes e estabilidade técnica (legítimo interesse e execução de
              contrato, art. 7º, IX e V).
            </li>
            <li>
              <strong className="text-foreground">Melhoria da experiência e catálogo</strong> — análise de
              buscas, produtos mais acessados e desempenho do Site (legítimo interesse, art. 7º, IX).
            </li>
            <li>
              <strong className="text-foreground">Métricas e marketing digital</strong> — Google Analytics
              e Meta Pixel, somente após consentimento nos cookies (consentimento, art. 7º, I).
            </li>
            <li>
              <strong className="text-foreground">Atendimento ao cliente</strong> — responder solicitações
              via WhatsApp ou e-mail (execução de contrato ou procedimentos preliminares, art. 7º, V).
            </li>
            <li>
              <strong className="text-foreground">Cumprimento de obrigações legais</strong> — guarda de
              registros quando exigida por lei (obrigação legal, art. 7º, II).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">4. Cookies e tecnologias similares</h2>
          <p>Utilizamos cookies e tecnologias equivalentes nas categorias abaixo:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-foreground">Essenciais:</strong> necessários para login
              administrativo, preferências de consentimento e funcionamento básico do Site. Não podem ser
              desativados sem prejudicar o serviço.
            </li>
            <li>
              <strong className="text-foreground">Analíticos:</strong> Google Analytics, para entender
              como os visitantes utilizam o Site. Ativados apenas com seu consentimento.
            </li>
            <li>
              <strong className="text-foreground">Marketing:</strong> Meta Pixel (Facebook/Instagram),
              para mensuração de campanhas. Ativados apenas com seu consentimento.
            </li>
          </ul>
          <p>
            Você pode aceitar todos os cookies, optar apenas pelos essenciais ou alterar sua escolha
            limpando os dados do navegador e revisitando o Site. A recusa de cookies não essenciais não
            impede o uso do catálogo público.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">5. Compartilhamento de dados</h2>
          <p>Podemos compartilhar dados com:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-foreground">Supabase</strong> — hospedagem de banco de dados,
              autenticação e armazenamento.
            </li>
            <li>
              <strong className="text-foreground">Vercel</strong> — hospedagem e entrega do Site.
            </li>
            <li>
              <strong className="text-foreground">Google e Meta</strong> — ferramentas de análise e
              publicidade, mediante consentimento.
            </li>
            <li>
              <strong className="text-foreground">Mercado Livre</strong> — quando você clica para comprar
              um produto, é redirecionado à plataforma do Mercado Livre, que passa a ser controladora dos
              dados fornecidos na compra.
            </li>
            <li>
              <strong className="text-foreground">Autoridades públicas</strong> — quando houver
              determinação legal, regulatória ou ordem judicial.
            </li>
          </ul>
          <p>
            Não vendemos dados pessoais. Operadores e parceiros são contratualmente obrigados a adotar
            medidas de segurança compatíveis com esta Política e com a LGPD.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">6. Retenção e eliminação</h2>
          <p>
            Os dados são mantidos pelo tempo necessário para cumprir as finalidades descritas, respeitar
            prazos legais e resolver disputas. Registros de busca e analytics podem ser anonimizados ou
            eliminados após períodos compatíveis com a finalidade estatística. Dados de contato são
            eliminados quando deixam de ser necessários, salvo obrigação legal de guarda.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">7. Segurança da informação</h2>
          <p>
            Adotamos medidas técnicas e administrativas para proteger os dados contra acessos não
            autorizados, perda, alteração ou divulgação indevida, incluindo comunicação criptografada
            (HTTPS), controle de acesso ao painel administrativo, políticas de segurança em nível de linha
            (RLS) no banco de dados e boas práticas de desenvolvimento.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">8. Seus direitos (LGPD — art. 18)</h2>
          <p>Você pode solicitar, a qualquer momento:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Confirmação da existência de tratamento e acesso aos dados;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;</li>
            <li>Portabilidade, quando aplicável;</li>
            <li>Informação sobre compartilhamentos realizados;</li>
            <li>Revogação do consentimento, quando o tratamento tiver essa base legal;</li>
            <li>Oposição a tratamentos baseados em legítimo interesse, quando cabível.</li>
          </ul>
          <p>
            Para exercer seus direitos, envie e-mail para{" "}
            <a href={`mailto:${LEGAL_CONFIG.dpoEmail}`} className="text-primary hover:underline">
              {LEGAL_CONFIG.dpoEmail}
            </a>
            . Responderemos em prazo razoável, conforme a LGPD.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">9. Encarregado de Proteção de Dados (DPO)</h2>
          <p>
            Nosso Encarregado pelo tratamento de dados pessoais é{" "}
            <strong className="text-foreground">{LEGAL_CONFIG.dpoName}</strong>, contato:{" "}
            <a href={`mailto:${LEGAL_CONFIG.dpoEmail}`} className="text-primary hover:underline">
              {LEGAL_CONFIG.dpoEmail}
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">10. Crianças e adolescentes</h2>
          <p>
            O Site não é destinado a menores de 18 anos. Não coletamos intencionalmente dados de crianças
            e adolescentes. Caso identifiquemos tal coleta, os dados serão eliminados.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">11. Alterações desta Política</h2>
          <p>
            Podemos atualizar esta Política para refletir mudanças legais, técnicas ou operacionais. A
            data da última revisão será indicada no topo da página. Alterações relevantes poderão ser
            comunicadas por aviso no Site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">12. Legislação e foro</h2>
          <p>
            Esta Política é regida pelas leis da República Federativa do Brasil. Fica eleito o foro da
            comarca de {LEGAL_CONFIG.city}/{LEGAL_CONFIG.state}, com renúncia a qualquer outro, por
            mais privilegiado que seja, para dirimir controvérsias relacionadas a esta Política, salvo
            disposição legal em contrário.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/60 bg-card/50 p-6">
          <h2 className="text-xl font-bold text-foreground">13. Contato</h2>
          <p>
            <strong className="text-foreground">{LEGAL_CONFIG.companyLegalName}</strong>
            <br />
            CNPJ: {LEGAL_CONFIG.cnpj}
            <br />
            Endereço: {LEGAL_CONFIG.address} — {LEGAL_CONFIG.city}/{LEGAL_CONFIG.state}
            <br />
            WhatsApp:{" "}
            <a
              href={`https://wa.me/${LEGAL_CONFIG.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {LEGAL_CONFIG.whatsappDisplay}
            </a>
            <br />
            E-mail geral:{" "}
            <a href={`mailto:${LEGAL_CONFIG.contactEmail}`} className="text-primary hover:underline">
              {LEGAL_CONFIG.contactEmail}
            </a>
            <br />
            Privacidade / DPO:{" "}
            <a href={`mailto:${LEGAL_CONFIG.dpoEmail}`} className="text-primary hover:underline">
              {LEGAL_CONFIG.dpoEmail}
            </a>
          </p>
          <p className="text-xs">
            Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD) pelo
            site{" "}
            <a
              href="https://www.gov.br/anpd"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              www.gov.br/anpd
            </a>
            .
          </p>
        </section>
      </article>
    </div>
  );
}
