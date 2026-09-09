import Image from "next/image";

const SYMBOL = "/brand/stbr/logo/SYMBOL-EMERALD-GREEN.svg";

/**
 * A folha ainda na prensa — o primeiro frame da página.
 *
 * A LP inteira é uma identidade de impressão, e a manchete do hero é
 * literalmente estampada. Então o primeiro frame não é um spinner esperando
 * dado: é a folha antes de sair do rolo. O símbolo se pinta de baixo para
 * cima, a folha é puxada para fora, e o que aparece embaixo é a manchete já
 * saindo do rolo — as duas coisas são o mesmo gesto, não dois efeitos.
 *
 * É Server Component de propósito: sai no HTML e é removida por CSS. Sem JS
 * ela ainda funciona, e não existe o frame de conteúdo aparecendo antes de
 * ser coberto que um preloader montado no cliente sempre produz.
 */
export function PressSheet() {
  return (
    <div aria-hidden className="press-sheet">
      <div className="press-sheet-mark">
        <Image
          src={SYMBOL}
          alt=""
          fill
          sizes="72px"
          className="object-contain opacity-[0.13] grayscale"
        />
        <div className="press-sheet-ink absolute inset-0">
          <Image
            src={SYMBOL}
            alt=""
            fill
            sizes="72px"
            priority
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}
