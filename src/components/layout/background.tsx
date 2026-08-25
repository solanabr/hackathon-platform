import Image from "next/image";

const shapes = [
  { src: "/brand/stbr/elements/morth-05.svg", className: "left-[-8%] top-[6%] w-72 animate-float-a" },
  { src: "/brand/stbr/elements/morth-21.svg", className: "right-[-6%] top-[38%] w-96 animate-float-b" },
  { src: "/brand/stbr/elements/morth-12.svg", className: "bottom-[-4%] left-[18%] w-80 animate-float-c" },
  { src: "/brand/stbr/elements/morth-24.svg", className: "right-[10%] bottom-[-6%] w-72 animate-float-b" },
  { src: "/brand/stbr/elements/morth-27.svg", className: "left-[28%] top-[22%] w-56 animate-float-c" },
];

export function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {shapes.map((shape) => (
        <Image
          key={shape.src}
          src={shape.src}
          alt=""
          width={400}
          height={400}
          className={`absolute opacity-[0.07] ${shape.className}`}
        />
      ))}
    </div>
  );
}