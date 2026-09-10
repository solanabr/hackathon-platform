import { halftoneMarks } from "./halftone";

/* O ponto de interrogação no mesmo meio-tom das outras ilustrações: o mapa
   guarda a densidade de cada célula em base36 e a engine cresce o traço com
   ela. O tom escurece de cima para baixo — é tinta, não um caractere. */
const GRID = { cols: 30, cellW: 4.5, cellH: 5 };

const TONES =
    "000000000000024442000000000000" +
    "0000000018ejmnnnnnmic500000000" +
    "0000002dmnnnnnnnnnnnnnj7000000" +
    "000009mooooooooooooooooof10000" +
    "0000cooooooooooooooooooooi1000" +
    "0009ppppppppppppppppppppppd000" +
    "001npppppppppnknppppppppppp300" +
    "009qqqqqqqqp9000dqqqqqqqqqqb00" +
    "00gqqqqqqqqf00000kqqqqqqqqqh00" +
    "00jrrrrrrrr800000drrrrrrrrrk00" +
    "00krrrrrrrr600000frrrrrrrrrj00" +
    "00bhhhhhhhh400002psssssssssd00" +
    "0000000000000001ksssssssssq200" +
    "000000000000001kssssssssssa000" +
    "00000000000004nttttttttttd0000" +
    "0000000000005rttttttttts900000" +
    "000000000003ruuuuuuuuum4000000" +
    "00000000000huuuuuuuutc00000000" +
    "00000000000nvvvvvvvt6000000000" +
    "00000000000ovvvvvvvh0000000000" +
    "00000000000dhhhhhhh80000000000" +
    "000000000000000000000000000000" +
    "000000000000000000000000000000" +
    "00000000009sssssssss6000000000" +
    "0000000000ayyyyyyyyy7000000000" +
    "0000000000ayyyyyyyyy8000000000" +
    "0000000000bzzzzzzzzz8000000000" +
    "0000000000bzzzzzzzzz8000000000" +
    "0000000000bzzzzzzzzz8000000000" +
    "0000000000bzzzzzzzzz8000000000" +
    "0000000000bzzzzzzzzz8000000000" +
    "000000000027777777772000000000";

const MARKS = halftoneMarks(TONES, GRID);

export function QuestionGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 135 160"
      aria-hidden
      role="presentation"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      className={["halftone-press", className].filter(Boolean).join(" ")}
    >
      <path d={MARKS.light} strokeWidth="1.5" />
      <path d={MARKS.dark} strokeWidth="2.9" />
    </svg>
  );
}
